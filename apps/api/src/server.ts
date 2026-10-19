import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './config/logger';

async function main() {
  await connectDatabase(env.MONGODB_URI);
  const server = createApp().listen(env.PORT, () => {
    logger.info(`API rodando em http://localhost:${env.PORT} (LLM: ${env.LLM_PROVIDER})`);
  });

  // Encerramento limpo: para de aceitar requisições e fecha a conexão com o banco
  const shutdown = (signal: string) => {
    logger.info(`${signal} recebido, encerrando...`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error({ err }, 'falha ao iniciar');
  process.exit(1);
});
