import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../../config/logger';
import { getAuth } from '../../shared/auth-context';
import { AppError } from '../../shared/errors/app-error';
import { authenticate } from '../../shared/middleware/authenticate';
import { chatLimiter } from '../../shared/middleware/rate-limit';
import { companyRepository } from '../companies/company.repository';
import { runAgent, type AgentEvent } from './chat.agent';
import type { LlmProvider } from './llm/types';

const chatBodySchema = z.object({
  message: z.string().trim().min(1, 'Digite uma mensagem').max(1000, 'Mensagem muito longa (máx. 1000 caracteres)'),
  // O servidor não guarda conversa: o cliente reenvia o histórico recente (limitado)
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(4000) }))
    .max(20)
    .default([]),
});

export function createChatRouter(provider: LlmProvider) {
  const router = Router();

  router.post('/', authenticate, chatLimiter, async (req, res) => {
    const auth = getAuth(req);
    const { message, history } = chatBodySchema.parse(req.body);
    const company = await companyRepository.findById(auth.companyId);
    if (!company) throw AppError.unauthorized();

    // O histórico deve começar numa fala do usuário
    const firstUser = history.findIndex((h) => h.role === 'user');
    const cleanHistory = firstUser === -1 ? [] : history.slice(firstUser);

    const controller = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) controller.abort();
    });

    const run = (onEvent: (e: AgentEvent) => void) =>
      runAgent({
        provider,
        companyId: auth.companyId,
        companyName: company.name,
        history: cleanHistory,
        message,
        onEvent,
        signal: controller.signal,
      });

    const wantsStream = req.headers.accept?.includes('text/event-stream');

    if (!wantsStream) {
      try {
        const result = await run(() => {});
        res.json({ reply: result.reply, toolCalls: result.toolCalls, provider: provider.name });
      } catch (err) {
        logger.error({ err }, 'falha no agente');
        throw new AppError(502, 'LLM_UNAVAILABLE', 'O assistente está indisponível no momento. Tente novamente.');
      }
      return;
    }

    // Streaming via SSE: cada passo do agente vira um evento
    res.status(200).set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // evita buffer do nginx
    });
    res.flushHeaders();
    const send = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    try {
      send('start', { provider: provider.name });
      const result = await run((e) => send(e.type, e));
      send('done', { reply: result.reply, toolCalls: result.toolCalls, provider: provider.name });
    } catch (err) {
      if (!controller.signal.aborted) {
        logger.error({ err }, 'falha no agente (stream)');
        send('error', { message: 'O assistente está indisponível no momento. Tente novamente.' });
      }
    } finally {
      res.end();
    }
  });

  return router;
}
