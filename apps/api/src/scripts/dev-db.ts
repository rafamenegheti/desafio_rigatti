import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * MongoDB em memória para quem não tem Mongo nem Docker.
 * Sobe na porta padrão (27017), então o .env.example funciona sem mudar nada.
 * Os dados somem quando o processo é encerrado.
 */
async function main() {
  const mongod = await MongoMemoryServer.create({ instance: { port: 27017, dbName: 'mini_saas' } });
  console.log(`MongoDB em memória rodando em ${mongod.getUri('mini_saas')}`);
  console.log('Deixe este terminal aberto. Ctrl+C para encerrar (os dados são descartados).');

  const stop = async () => {
    await mongod.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((err) => {
  console.error('Não foi possível iniciar o MongoDB em memória:', err.message);
  process.exit(1);
});
