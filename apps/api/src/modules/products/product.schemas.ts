import { z } from 'zod';

const imageUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === '' || /^https?:\/\//i.test(v) || /^\/uploads\/[\w.-]+$/.test(v), {
    message: 'Use uma URL http(s) ou uma imagem enviada pelo sistema',
  });

export const productBodySchema = z.object({
  name: z.string().trim().min(2, 'Nome muito curto').max(120),
  description: z.string().trim().max(2000).default(''),
  price: z
    .number('Preço inválido')
    .min(0, 'O preço não pode ser negativo')
    .max(10_000_000)
    .transform((n) => Math.round(n * 100) / 100),
  category: z.string().trim().min(1, 'Informe a categoria').max(60),
  imageUrl: imageUrl.default(''),
});

export const idParamSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{24}$/i, 'Id inválido'),
});

// Query string chega sempre como texto; vazio vira "não informado"
const optionalNumber = z.preprocess(
  (v) => (v === '' || v === undefined ? undefined : Number(v)),
  z.number().min(0).optional(),
);

export const productQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(60).optional(),
  minPrice: optionalNumber,
  maxPrice: optionalNumber,
  sort: z.enum(['relevance', 'newest', 'price_asc', 'price_desc', 'name']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export type ProductBody = z.infer<typeof productBodySchema>;
export type ProductQuery = z.infer<typeof productQuerySchema>;
