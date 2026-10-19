import path from 'node:path';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './config/logger';
import { authRouter } from './modules/auth/auth.routes';
import { userRouter } from './modules/users/user.routes';
import { errorHandler, notFoundHandler } from './shared/middleware/error-handler';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  // Atrás de proxy (nginx/ALB) o IP real vem do X-Forwarded-For; necessário para o rate limit
  app.set('trust proxy', 1);

  // Imagens enviadas são carregadas pelo frontend (outra origem), por isso cross-origin
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()) }));
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/auth', authRouter);
  app.use('/users', userRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
