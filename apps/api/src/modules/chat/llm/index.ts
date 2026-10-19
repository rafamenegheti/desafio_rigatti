import { env } from '../../../config/env';
import { AnthropicProvider } from './anthropic.provider';
import { MockProvider } from './mock.provider';
import type { LlmProvider } from './types';

export function createLlmProvider(): LlmProvider {
  if (env.LLM_PROVIDER === 'anthropic') return new AnthropicProvider(env.ANTHROPIC_API_KEY!, env.ANTHROPIC_MODEL);
  return new MockProvider();
}
