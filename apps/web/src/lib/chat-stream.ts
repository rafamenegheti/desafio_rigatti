import { API_URL, ApiError, authHeaders } from './api';
import { createSseParser } from './sse';

export interface ChatStreamHandlers {
  onTool: (info: { name: string; summary: string }) => void;
  onText: (delta: string) => void;
  onProvider: (name: string) => void;
}

/**
 * POST /chat em modo streaming. EventSource não serve aqui (só faz GET e não aceita
 * header Authorization), então lemos o corpo da resposta com fetch.
 */
export async function streamChat(
  message: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  handlers: ChatStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json', Accept: 'text/event-stream' }),
      body: JSON.stringify({ message, history }),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError(0, 'Não foi possível conectar ao servidor.');
  }

  if (!res.ok || !res.body) {
    let msg = 'O assistente está indisponível no momento.';
    try {
      msg = (await res.json())?.error?.message ?? msg;
    } catch {
      /* ignora */
    }
    throw new ApiError(res.status, msg);
  }

  const parse = createSseParser();
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const { event, data } of parse(value)) {
      const d = data as Record<string, unknown>;
      if (event === 'start') handlers.onProvider(String(d.provider));
      else if (event === 'tool_result') handlers.onTool({ name: String(d.name), summary: String(d.summary) });
      else if (event === 'text') handlers.onText(String(d.delta));
      else if (event === 'error') throw new ApiError(502, String(d.message));
    }
  }
}
