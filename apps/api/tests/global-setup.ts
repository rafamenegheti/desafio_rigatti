import { MongoMemoryServer } from 'mongodb-memory-server';

// Um único MongoDB em memória para toda a suíte (sobe uma vez, derruba no final)
let mongod: MongoMemoryServer;

export async function setup() {
  mongod = await MongoMemoryServer.create();
  process.env.TEST_MONGODB_URI = mongod.getUri('mini_saas_test');
}

export async function teardown() {
  await mongod.stop();
}
