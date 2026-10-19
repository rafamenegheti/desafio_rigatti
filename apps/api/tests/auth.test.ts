import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app, bearer, closeTestDb, connectTestDb, createRegularUser, registerCompany, resetDb } from './helpers';

beforeAll(connectTestDb);
beforeEach(resetDb);
afterAll(closeTestDb);

describe('registro', () => {
  it('cria empresa e usuário admin e devolve token', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ companyName: 'Loja A', name: 'Ana', email: 'ANA@loja.com', password: 'senha12345' });

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ email: 'ana@loja.com', role: 'admin', companyName: 'Loja A' });
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejeita e-mail duplicado sem deixar empresa órfã', async () => {
    await registerCompany('Loja A');
    const { email } = await registerCompany('Loja B');
    const dup = await request(app)
      .post('/auth/register')
      .send({ companyName: 'Loja C', name: 'Xis', email, password: 'senha12345' });
    expect(dup.status).toBe(409);

    const mongoose = (await import('mongoose')).default;
    expect(await mongoose.connection.collection('companies').countDocuments()).toBe(2);
  });

  it('valida os campos', async () => {
    const res = await request(app).post('/auth/register').send({ companyName: 'A', email: 'x', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('não permite escolher o papel no cadastro público', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ companyName: 'Loja', name: 'Zé', email: 'ze@loja.com', password: 'senha12345', role: 'user', company_id: 'abc' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('admin'); // sempre admin da PRÓPRIA empresa nova
  });
});

describe('login', () => {
  it('autentica com credenciais corretas', async () => {
    const { email, password } = await registerCompany();
    const res = await request(app).post('/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  it('dá a mesma resposta para senha errada e e-mail inexistente', async () => {
    const { email } = await registerCompany();
    const wrongPass = await request(app).post('/auth/login').send({ email, password: 'errada123' });
    const noUser = await request(app).post('/auth/login').send({ email: 'nao@existe.com', password: 'errada123' });
    expect(wrongPass.status).toBe(401);
    expect(noUser.status).toBe(401);
    expect(wrongPass.body).toEqual(noUser.body);
  });
});

describe('token', () => {
  it('GET /auth/me devolve o usuário logado', async () => {
    const { token, email } = await registerCompany();
    const res = await request(app).get('/auth/me').set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);
  });

  it('exige token', async () => {
    expect((await request(app).get('/auth/me')).status).toBe(401);
    expect((await request(app).get('/auth/me').set(bearer('lixo'))).status).toBe(401);
  });

  it('rejeita token assinado com outro segredo', async () => {
    const { user } = await registerCompany();
    const forged = jwt.sign({}, 'outro-segredo-qualquer-com-32-caracteres!!', { subject: user.id, issuer: 'mini-saas-api' });
    expect((await request(app).get('/auth/me').set(bearer(forged))).status).toBe(401);
  });

  it('rejeita token sem assinatura (alg none)', async () => {
    const { user } = await registerCompany();
    const none = jwt.sign({}, '', { subject: user.id, issuer: 'mini-saas-api', algorithm: 'none' });
    expect((await request(app).get('/auth/me').set(bearer(none))).status).toBe(401);
  });

  it('rejeita token expirado', async () => {
    const { user } = await registerCompany();
    const expired = jwt.sign({}, process.env.JWT_SECRET!, { subject: user.id, issuer: 'mini-saas-api', expiresIn: -10 });
    expect((await request(app).get('/auth/me').set(bearer(expired))).status).toBe(401);
  });
});

describe('gestão de equipe (/users)', () => {
  it('admin cria usuário comum na própria empresa', async () => {
    const admin = await registerCompany();
    const user = await createRegularUser(admin.token);
    expect(user.user.role).toBe('user');
    expect(user.user.companyId).toBe(admin.user.companyId);
  });

  it('usuário comum não acessa /users', async () => {
    const admin = await registerCompany();
    const user = await createRegularUser(admin.token);
    expect((await request(app).get('/users').set(bearer(user.token))).status).toBe(403);
    expect(
      (await request(app).post('/users').set(bearer(user.token)).send({ name: 'Hack', email: 'h@h.com', password: 'senha12345', role: 'admin' })).status,
    ).toBe(403);
  });

  it('lista só usuários da própria empresa', async () => {
    const a = await registerCompany('Empresa A');
    const b = await registerCompany('Empresa B');
    await createRegularUser(a.token);
    const res = await request(app).get('/users').set(bearer(b.token));
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].email).toBe(b.email);
  });

  it('token de usuário removido deixa de valer na hora', async () => {
    const admin = await registerCompany();
    const user = await createRegularUser(admin.token);
    const mongoose = (await import('mongoose')).default;
    await mongoose.connection.collection('users').deleteOne({ email: user.email });
    expect((await request(app).get('/auth/me').set(bearer(user.token))).status).toBe(401);
  });
});
