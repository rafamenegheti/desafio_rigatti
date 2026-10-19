import Anthropic from '@anthropic-ai/sdk';
import type { LlmMessage, LlmProvider, LlmRequest, LlmResponse } from './types';

export function toAnthropicMessages(messages: LlmMessage[]): Anthropic.MessageParam[] {
  return messages.map((m): Anthropic.MessageParam => {
    if (m.role === 'user') return { role: 'user', content: m.content };
    if (m.role === 'assistant') {
      const content: Anthropic.ContentBlockParam[] = [];
      if (m.text) content.push({ type: 'text', text: m.text });
      for (const call of m.toolCalls) content.push({ type: 'tool_use', id: call.id, name: call.name, input: call.input });
      return { role: 'assistant', content };
    }
    return {
      role: 'user',
      content: m.results.map((r) => ({
        type: 'tool_result' as const,
        tool_use_id: r.toolCallId,
        content: r.content,
        is_error: r.isError ?? false,
      })),
    };
  });
}

export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    this.client = new Anthropic({ apiKey, maxRetries: 2, timeout: 60_000 });
  }

  async complete(req: LlmRequest): Promise<LlmResponse> {
    const stream = this.client.messages.stream(
      {
        model: this.model,
        max_tokens: 1024,
        system: req.system,
        messages: toAnthropicMessages(req.messages),
        tools: req.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema })),
      },
      { signal: req.signal },
    );
    stream.on('text', (delta) => req.onText(delta));

    const final = await stream.finalMessage();
    let text = '';
    const toolCalls: LlmResponse['toolCalls'] = [];
    for (const block of final.content) {
      if (block.type === 'text') text += block.text;
      if (block.type === 'tool_use') {
        toolCalls.push({ id: block.id, name: block.name, input: (block.input ?? {}) as Record<string, unknown> });
      }
    }
    return { text, toolCalls };
  }
}
