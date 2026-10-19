import { Router } from 'express';
import { getAuth } from '../../shared/auth-context';
import { authenticate, requireRole } from '../../shared/middleware/authenticate';
import { idParamSchema, productBodySchema, productQuerySchema } from './product.schemas';
import { ProductService } from './product.service';

export const productRouter = Router();

const service = (req: Parameters<typeof getAuth>[0]) => new ProductService(getAuth(req).companyId);

// Qualquer usuário autenticado da empresa pode ver
productRouter.use(authenticate);

productRouter.get('/', async (req, res) => {
  res.json(await service(req).list(productQuerySchema.parse(req.query)));
});

productRouter.get('/categories', async (req, res) => {
  res.json({ items: await service(req).categories() });
});

productRouter.get('/:id', async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.json({ product: await service(req).get(id) });
});

// Escrita: só admin
productRouter.post('/', requireRole('admin'), async (req, res) => {
  const product = await service(req).create(productBodySchema.parse(req.body));
  res.status(201).json({ product });
});

productRouter.put('/:id', requireRole('admin'), async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.json({ product: await service(req).update(id, productBodySchema.parse(req.body)) });
});

productRouter.delete('/:id', requireRole('admin'), async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  await service(req).remove(id);
  res.status(204).end();
});
