import pino from 'pino';
import { env } from './env';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  // Nunca registrar credenciais
  redact: ['req.headers.authorization', 'req.body.password'],
});
