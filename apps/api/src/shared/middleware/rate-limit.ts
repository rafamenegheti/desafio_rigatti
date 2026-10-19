import rateLimit from 'express-rate-limit';
import { env } from '../../config/env';

const skip = () => env.NODE_ENV === 'test';
const message = (text: string) => ({ error: { code: 'RATE_LIMITED', message: text } });

/** Freia tentativa de força bruta em login/registro. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  message: message('Muitas tentativas. Tente novamente em alguns minutos.'),
});

/** Cada mensagem do chat custa dinheiro (LLM): limite por usuário, não por IP. */
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  keyGenerator: (req) => req.auth?.userId.toString() ?? 'anonimo',
  validate: { keyGeneratorIpFallback: false },
  message: message('Você está enviando mensagens rápido demais. Aguarde um instante.'),
});
