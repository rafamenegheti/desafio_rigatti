import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app, bearer, closeTestDb, connectTestDb, createRegularUser, registerCompany, resetDb } from './helpers';

// PNG 1x1 válido
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

beforeAll(connectTestDb);
beforeEach(resetDb);
afterAll(async () => {
  await closeTestDb();
  fs.rmSync(path.resolve(process.cwd(), 'uploads-test'), { recursive: true, force: true });
});

describe('upload de imagem', () => {
  it('admin envia imagem e ela fica acessível', async () => {
    const admin = await registerCompany();
    const res = await request(app).post('/uploads').set(bearer(admin.token)).attach('image', PNG, { filename: 'foto.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/^\/uploads\/[\w-]+\.png$/);

    const file = await request(app).get(res.body.url);
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toMatch(/image\/png/);
  });

  it('usuário comum não envia', async () => {
    const admin = await registerCompany();
    const user = await createRegularUser(admin.token);
    const res = await request(app).post('/uploads').set(bearer(user.token)).attach('image', PNG, { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(403);
  });

  it('rejeita tipo não permitido (svg) e arquivo que só finge ser imagem', async () => {
    const admin = await registerCompany();
    const svg = await request(app)
      .post('/uploads')
      .set(bearer(admin.token))
      .attach('image', Buffer.from('<svg onload="alert(1)"/>'), { filename: 'a.svg', contentType: 'image/svg+xml' });
    expect(svg.status).toBe(400);

    const fake = await request(app)
      .post('/uploads')
      .set(bearer(admin.token))
      .attach('image', Buffer.from('<?php echo 1; ?>'), { filename: 'a.png', contentType: 'image/png' });
    expect(fake.status).toBe(400);
  });

  it('rejeita arquivo maior que 2 MB', async () => {
    const admin = await registerCompany();
    const big = Buffer.concat([PNG, Buffer.alloc(3 * 1024 * 1024)]);
    const res = await request(app).post('/uploads').set(bearer(admin.token)).attach('image', big, { filename: 'g.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
  });

  it('exige autenticação', async () => {
    const res = await request(app).post('/uploads').attach('image', PNG, { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(401);
  });
});
