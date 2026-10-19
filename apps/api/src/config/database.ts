import mongoose from 'mongoose';
import { logger } from './logger';

export async function connectDatabase(uri: string) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  // Garante os índices (inclusive o de texto usado pela busca do agente)
  await mongoose.syncIndexes();
  logger.info('MongoDB conectado');
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
