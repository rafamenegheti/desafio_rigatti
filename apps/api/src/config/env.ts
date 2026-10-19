import 'dotenv/config';
import { z } from 'zod';

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3333),
    MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/mini_saas'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET precisa ter pelo menos 32 caracteres'),
    JWT_EXPIRES_IN: z.string().default('1d'),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    UPLOAD_DIR: z.string().default('uploads'),
    LLM_PROVIDER: z.enum(['anthropic', 'mock']).default('mock'),
    ANTHROPIC_API_KEY: z.string().optional(),
    ANTHROPIC_MODEL: z.string().default('claude-haiku-5-5'),
  })
  .refine((v) => v.LLM_PROVIDER !== 'anthropic' || !!v.ANTHROPIC_API_KEY, {
    message: 'ANTHROPIC_API_KEY é obrigatória quando LLM_PROVIDER=anthropic',
    path: ['ANTHROPIC_API_KEY'],
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Falha rápida: é melhor não subir do que subir mal configurado
  console.error('Variáveis de ambiente inválidas:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
