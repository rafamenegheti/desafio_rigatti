import type { Types } from 'mongoose';
import { AppError } from '../../shared/errors/app-error';
import type { ProductDoc } from './product.model';
import { ProductRepository } from './product.repository';
import type { ProductBody, ProductQuery } from './product.schemas';

export interface ProductDto {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

// company_id fica de fora de propósito: o cliente não precisa dele
export function toProductDto(p: ProductDoc): ProductDto {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? '',
    price: p.price,
    category: p.category,
    imageUrl: p.imageUrl ?? '',
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

/** Um serviço por requisição, já amarrado à empresa do usuário autenticado. */
export class ProductService {
  private readonly repo: ProductRepository;

  constructor(companyId: Types.ObjectId) {
    this.repo = new ProductRepository(companyId);
  }

  async list(query: ProductQuery) {
    const { items, total } = await this.repo.search(query);
    return {
      items: items.map(toProductDto),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  async get(id: string) {
    const product = await this.repo.findById(id);
    // Produto de outra empresa responde 404 (e não 403), para não confirmar que o id existe
    if (!product) throw AppError.notFound('Produto não encontrado');
    return toProductDto(product);
  }

  async create(data: ProductBody) {
    return toProductDto(await this.repo.create(data));
  }

  async update(id: string, data: ProductBody) {
    const product = await this.repo.update(id, data);
    if (!product) throw AppError.notFound('Produto não encontrado');
    return toProductDto(product);
  }

  async remove(id: string) {
    const product = await this.repo.delete(id);
    if (!product) throw AppError.notFound('Produto não encontrado');
  }

  categories() {
    return this.repo.categories();
  }
}
