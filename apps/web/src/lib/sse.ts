export interface SseEvent {
  event: string;
  data: unknown;
}

/**
 * Parser incremental de Server-Sent Events. Recebe pedaços de texto (que podem cortar
 * um evento no meio) e devolve só os eventos completos.
 */
export function createSseParser() {
  let buffer = '';
  return (chunk: string): SseEvent[] => {
    buffer += chunk.replace(/\r\n/g, '\n');
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() ?? '';

    const events: SseEvent[] = [];
    for (const block of blocks) {
      let event = 'message';
      const dataLines: string[] = [];
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
      }
      if (dataLines.length === 0) continue;
      try {
        events.push({ event, data: JSON.parse(dataLines.join('\n')) });
      } catch {
        /* evento malformado: ignora */
      }
    }
    return events;
  };
}
