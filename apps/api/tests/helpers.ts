import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { connectDatabase } from '../src/config/database';

export const app = createApp();

export async function connectTestDb() {
  await connectDatabase(process.env.MONGODB_URI!);
}

export async function resetDb() {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}

export async function closeTestDb() {
  await mongoose.disconnect();
}

let counter = 0;

/** Registra uma empresa nova (com seu admin) e devolve token + dados. */
export async function registerCompany(name = 'Empresa Teste') {
  counter += 1;
  const email = `admin${counter}@${name.replace(/\W/g, '').toLowerCase()}.com`;
  const res = await request(app)
    .post('/auth/register')
    .send({ companyName: name, name: 'Admin', email, password: 'senha12345' });
  return { token: res.body.token as string, user: res.body.user, email, password: 'senha12345' };
}

/** Cria um usuário comum dentro da empresa do admin informado e faz login. */
export async function createRegularUser(adminToken: string) {
  counter += 1;
  const email = `user${counter}@teste.com`;
  await request(app)
    .post('/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Cliente', email, password: 'senha12345', role: 'user' })
    .expect(201);
  const login = await request(app).post('/auth/login').send({ email, password: 'senha12345' });
  return { token: login.body.token as string, user: login.body.user, email };
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
