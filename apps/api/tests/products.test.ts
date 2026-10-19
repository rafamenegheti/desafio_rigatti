import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app, bearer, closeTestDb, connectTestDb, createRegularUser, registerCompany, resetDb } from './helpers';

beforeAll(connectTestDb);
beforeEach(resetDb);
afterAll(closeTestDb);

const notebook = { name: 'Notebook Gamer', description: 'Placa de vídeo dedicada e 16GB de RAM', price: 5999.9, category: 'Informática', imageUrl: '' };

async function createProduct(token: string, data: Partial<typeof notebook> = {}) {
  const res = await request(app).post('/products').set(bearer(token)).send({ ...notebook, ...data });
  expect(res.status).toBe(201);
  return res.body.product as { id: string; name: string };
}

describe('CRUD de produtos', () => {
  it('admin cria, lê, edita e remove', async () => {
    const admin = await registerCompany();
    const created = await createProduct(admin.token);

    const got = await request(app).get(`/products/${created.id}`).set(bearer(admin.token));
    expect(got.body.product).toMatchObject({ name: 'Notebook Gamer', price: 5999.9 });
    expect(got.body.product.company_id).toBeUndefined();

    const upd = await request(app)
      .put(`/products/${created.id}`)
      .set(bearer(admin.token))
      .send({ ...notebook, name: 'Notebook Pro', price: 4500 });
    expect(upd.body.product).toMatchObject({ name: 'Notebook Pro', price: 4500 });

    expect((await request(app).delete(`/products/${created.id}`).set(bearer(admin.token))).status).toBe(204);
    expect((await request(app).get(`/products/${created.id}`).set(bearer(admin.token))).status).toBe(404);
  });

  it('valida os dados', async () => {
    const admin = await registerCompany();
    const res = await request(app).post('/products').set(bearer(admin.token)).send({ name: 'x', price: -1, category: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d: { field: string }) => d.field)).toEqual(expect.arrayContaining(['name', 'price', 'category']));
  });

  it('arredonda o preço para 2 casas', async () => {
    const admin = await registerCompany();
    const p = await request(app).post('/products').set(bearer(admin.token)).send({ ...notebook, price: 10.456 });
    expect(p.body.product.price).toBe(10.46);
  });

  it('rejeita imageUrl com esquema perigoso', async () => {
    const admin = await registerCompany();
    const res = await request(app).post('/products').set(bearer(admin.token)).send({ ...notebook, imageUrl: 'javascript:alert(1)' });
    expect(res.status).toBe(400);
  });

  it('id malformado vira 400, não erro 500', async () => {
    const admin = await registerCompany();
    expect((await request(app).get('/products/nao-e-um-id').set(bearer(admin.token))).status).toBe(400);
  });

  it('exige autenticação', async () => {
    expect((await request(app).get('/products')).status).toBe(401);
  });
});

describe('permissões por papel', () => {
  it('usuário comum visualiza mas não escreve', async () => {
    const admin = await registerCompany();
    const product = await createProduct(admin.token);
    const user = await createRegularUser(admin.token);

    expect((await request(app).get('/products').set(bearer(user.token))).body.total).toBe(1);
    expect((await request(app).get(`/products/${product.id}`).set(bearer(user.token))).status).toBe(200);

    expect((await request(app).post('/products').set(bearer(user.token)).send(notebook)).status).toBe(403);
    expect((await request(app).put(`/products/${product.id}`).set(bearer(user.token)).send(notebook)).status).toBe(403);
    expect((await request(app).delete(`/products/${product.id}`).set(bearer(user.token))).status).toBe(403);
    expect((await request(app).get(`/products/${product.id}`).set(bearer(admin.token))).status).toBe(200);
  });
});

describe('isolamento entre empresas (multi-tenant)', () => {
  it('empresa B nunca vê produtos da empresa A', async () => {
    const a = await registerCompany('Empresa A');
    const b = await registerCompany('Empresa B');
    await createProduct(a.token, { name: 'Produto da A' });
    await createProduct(b.token, { name: 'Produto da B' });

    const listA = await request(app).get('/products').set(bearer(a.token));
    const listB = await request(app).get('/products').set(bearer(b.token));
    expect(listA.body.items.map((p: { name: string }) => p.name)).toEqual(['Produto da A']);
    expect(listB.body.items.map((p: { name: string }) => p.name)).toEqual(['Produto da B']);
  });

  it('não lê, edita nem apaga produto de outra empresa pelo id (404)', async () => {
    const a = await registerCompany('Empresa A');
    const b = await registerCompany('Empresa B');
    const prod = await createProduct(a.token);

    expect((await request(app).get(`/products/${prod.id}`).set(bearer(b.token))).status).toBe(404);
    expect((await request(app).put(`/products/${prod.id}`).set(bearer(b.token)).send({ ...notebook, name: 'Invadido' })).status).toBe(404);
    expect((await request(app).delete(`/products/${prod.id}`).set(bearer(b.token))).status).toBe(404);

    // continua intacto para a dona
    const still = await request(app).get(`/products/${prod.id}`).set(bearer(a.token));
    expect(still.body.product.name).toBe('Notebook Gamer');
  });

  it('ignora company_id enviado no body, na query ou no header', async () => {
    const a = await registerCompany('Empresa A');
    const b = await registerCompany('Empresa B');
    await createProduct(a.token, { name: 'Produto da A' });

    const created = await request(app)
      .post('/products')
      .set(bearer(b.token))
      .send({ ...notebook, name: 'Tentativa', company_id: a.user.companyId });
    expect(created.status).toBe(201);
    // o produto caiu na empresa B, não na A
    const listA = await request(app).get('/products').query({ company_id: b.user.companyId }).set(bearer(a.token)).set('X-Company-Id', b.user.companyId);
    expect(listA.body.items.map((p: { name: string }) => p.name)).toEqual(['Produto da A']);
  });

  it('busca, filtros e categorias também ficam dentro da empresa', async () => {
    const a = await registerCompany('Empresa A');
    const b = await registerCompany('Empresa B');
    await createProduct(a.token, { name: 'Cadeira Ergonômica', category: 'Móveis', price: 800 });
    await createProduct(b.token, { name: 'Cadeira Secreta', category: 'Segredo', price: 1 });

    const search = await request(app).get('/products').query({ q: 'cadeira' }).set(bearer(a.token));
    expect(search.body.items.map((p: { name: string }) => p.name)).toEqual(['Cadeira Ergonômica']);
    const cats = await request(app).get('/products/categories').set(bearer(a.token));
    expect(cats.body.items).toEqual(['Móveis']);
  });
});

describe('busca e paginação', () => {
  it('busca por texto ignorando acento, caixa e plural', async () => {
    const admin = await registerCompany();
    await createProduct(admin.token, { name: 'Cadeira Ergonômica', category: 'Móveis', description: 'Para escritório' });
    await createProduct(admin.token, { name: 'Mouse Sem Fio', category: 'Informática', description: 'Bluetooth' });

    const names = async (q: string) =>
      (await request(app).get('/products').query({ q }).set(bearer(admin.token))).body.items.map((p: { name: string }) => p.name);
    expect(await names('ergonomica')).toEqual(['Cadeira Ergonômica']);
    expect(await names('cadeiras')).toEqual(['Cadeira Ergonômica']);
    expect(await names('escritorio')).toEqual(['Cadeira Ergonômica']);
    // termo parcial cai no plano B (regex)
    expect(await names('cadei')).toEqual(['Cadeira Ergonômica']);
    expect(await names('inexistente')).toEqual([]);
  });

  it('filtra por categoria e faixa de preço e ordena', async () => {
    const admin = await registerCompany();
    await createProduct(admin.token, { name: 'Barato', category: 'A', price: 10 });
    await createProduct(admin.token, { name: 'Médio', category: 'A', price: 50 });
    await createProduct(admin.token, { name: 'Caro', category: 'B', price: 500 });

    const get = async (query: Record<string, string>) =>
      (await request(app).get('/products').query(query).set(bearer(admin.token))).body.items.map((p: { name: string }) => p.name);

    expect(await get({ category: 'a', sort: 'price_desc' })).toEqual(['Médio', 'Barato']);
    expect(await get({ minPrice: '20', maxPrice: '100' })).toEqual(['Médio']);
    expect(await get({ sort: 'price_asc' })).toEqual(['Barato', 'Médio', 'Caro']);
  });

  it('pagina o resultado', async () => {
    const admin = await registerCompany();
    for (let i = 1; i <= 5; i++) await createProduct(admin.token, { name: `Produto ${i}` });
    const res = await request(app).get('/products').query({ limit: '2', page: '3', sort: 'name' }).set(bearer(admin.token));
    expect(res.body).toMatchObject({ total: 5, page: 3, limit: 2, totalPages: 3 });
    expect(res.body.items).toHaveLength(1);
  });

  it('caracteres especiais de regex na busca não quebram', async () => {
    const admin = await registerCompany();
    const res = await request(app).get('/products').query({ q: '(.*[' }).set(bearer(admin.token));
    expect(res.status).toBe(200);
  });
});
