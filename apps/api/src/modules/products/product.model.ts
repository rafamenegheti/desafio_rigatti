import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import { tenantGuard } from '../../shared/tenant-guard';

const productSchema = new Schema(
  {
    company_id: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true, maxlength: 60 },
    imageUrl: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
);

productSchema.plugin(tenantGuard);

// Todo índice começa por company_id: é o filtro de TODA query, então é o melhor prefixo
productSchema.index({ company_id: 1, createdAt: -1 });
productSchema.index({ company_id: 1, category: 1 });
// Busca textual em português (stemming: "fones" encontra "fone"; ignora acentos e caixa)
productSchema.index(
  { company_id: 1, name: 'text', description: 'text', category: 'text' },
  { weights: { name: 10, category: 5, description: 1 }, default_language: 'portuguese', name: 'product_text' },
);

export type ProductDoc = HydratedDocument<InferSchemaType<typeof productSchema>>;
export const Product = model('Product', productSchema);
