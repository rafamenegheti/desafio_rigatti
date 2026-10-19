/**
 * Contrato mínimo entre o agente e qualquer LLM. O agente só conhece estes tipos;
 * cada provider traduz para o formato da sua API. Trocar de Claude para OpenAI
 * é escrever um arquivo novo, sem tocar no agente nem nas tools.
 */
export interface ToolDefinition {
  name: string;
  description: string;
  /** JSON Schema dos parâmetros */
  inputSchema: { type: 'object'; properties: Record<string, unknown>; required?: string[] };
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  content: string;
  isError?: boolean;
}

export type LlmMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; text: string; toolCalls: ToolCall[] }
  | { role: 'tool'; results: ToolResult[] };

export interface LlmRequest {
  system: string;
  messages: LlmMessage[];
  tools: ToolDefinition[];
  onText: (delta: string) => void;
  signal?: AbortSignal;
}

export interface LlmResponse {
  text: string;
  toolCalls: ToolCall[];
}

export interface LlmProvider {
  readonly name: string;
  /** Uma volta do modelo: transmite o texto aos poucos e devolve texto + pedidos de tool. */
  complete(request: LlmRequest): Promise<LlmResponse>;
}
