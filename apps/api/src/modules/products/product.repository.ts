import type { FilterQuery, SortOrder, Types } from 'mongoose';
import { Product, type ProductDoc } from './product.model';
import type { ProductBody, ProductQuery } from './product.schemas';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Repositório ESCOPADO por empresa.
 *
 * O company_id entra pelo construtor (vindo do usuário autenticado) e é aplicado
 * em TODA operação, sempre por último para que nada no filtro consiga sobrescrevê-lo.
 * Quem usa o repositório não tem como "esquecer" o filtro, porque não existe método sem ele.
 */
export class ProductRepository {
  constructor(private readonly companyId: Types.ObjectId) {}

  private scoped(filter: FilterQuery<ProductDoc> = {}): FilterQuery<ProductDoc> {
    return { ...filter, company_id: this.companyId };
  }

  async search(query: ProductQuery) {
    const { q, category, minPrice, maxPrice, page, limit } = query;
    const base: FilterQuery<ProductDoc> = {};
    if (category) base.category = new RegExp(`^${escapeRegex(category)}$`, 'i');
    if (minPrice !== undefined || maxPrice !== undefined) {
      base.price = {
        ...(minPrice !== undefined && { $gte: minPrice }),
        ...(maxPrice !== undefined && { $lte: maxPrice }),
      };
    }

    let filter = this.scoped(base);
    let useScore = false;

    if (q) {
      const textFilter = this.scoped({ ...base, $text: { $search: q } });
      if ((await Product.countDocuments(textFilter)) > 0) {
        filter = textFilter;
        useScore = true;
      } else {
        // Plano B para termos parciais que o índice de texto não casa (ex.: "cade" em "cadeira")
        const rx = new RegExp(escapeRegex(q), 'i');
        filter = this.scoped({ ...base, $or: [{ name: rx }, { description: rx }, { category: rx }] });
      }
    }

    const sort = this.buildSort(query.sort, useScore);
    const find = Product.find(filter);
    if (useScore) find.select({ score: { $meta: 'textScore' } });

    const [items, total] = await Promise.all([
      find
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit),
      Product.countDocuments(filter),
    ]);
    return { items, total };
  }

  private buildSort(sort: ProductQuery['sort'], useScore: boolean): Record<string, SortOrder | { $meta: 'textScore' }> {
    switch (sort) {
      case 'price_asc':
        return { price: 1, _id: 1 };
      case 'price_desc':
        return { price: -1, _id: 1 };
      case 'name':
        return { name: 1, _id: 1 };
      case 'newest':
        return { createdAt: -1, _id: -1 };
      default:
        return useScore ? { score: { $meta: 'textScore' }, _id: 1 } : { createdAt: -1, _id: -1 };
    }
  }

  findById(id: string) {
    return Product.findOne(this.scoped({ _id: id }));
  }

  create(data: ProductBody) {
    return Product.create({ ...data, company_id: this.companyId });
  }

  update(id: string, data: ProductBody) {
    return Product.findOneAndUpdate(
      this.scoped({ _id: id }),
      { $set: { ...data, company_id: this.companyId } },
      { new: true, runValidators: true },
    );
  }

  delete(id: string) {
    return Product.findOneAndDelete(this.scoped({ _id: id }));
  }

  async categories(): Promise<string[]> {
    const list = await Product.distinct('category', this.scoped());
    return (list as string[]).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }
}
