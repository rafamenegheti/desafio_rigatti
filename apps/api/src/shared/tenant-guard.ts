import type { Schema } from 'mongoose';

/**
 * Rede de segurança do multi-tenant.
 *
 * A defesa principal é o repositório escopado (ele sempre injeta company_id).
 * Este plugin é a segunda camada: se alguém escrever uma query direta no model
 * sem company_id, ela falha em vez de vazar dados de outra empresa.
 *
 * Quando o acesso entre empresas é intencional (ex.: login por e-mail, seed),
 * é preciso declarar isso explicitamente com .setOptions({ skipTenantGuard: true }).
 */
export function tenantGuard(schema: Schema) {
  const queryOps = [
    'find',
    'findOne',
    'findOneAndUpdate',
    'findOneAndDelete',
    'findOneAndReplace',
    'updateOne',
    'updateMany',
    'replaceOne',
    'deleteOne',
    'deleteMany',
    'countDocuments',
  ] as const;

  for (const op of queryOps) {
    schema.pre(op, function () {
      if (this.getOptions().skipTenantGuard) return;
      const filter = this.getFilter() as Record<string, unknown>;
      if (filter.company_id === undefined || filter.company_id === null) {
        throw new Error(`[tenant-guard] ${op} em ${this.model.modelName} sem company_id no filtro`);
      }
    });
  }

  schema.pre('aggregate', function () {
    if (this.options?.skipTenantGuard) return;
    const first = this.pipeline()[0] as { $match?: Record<string, unknown>; $search?: unknown } | undefined;
    if (!first?.$match || first.$match.company_id === undefined) {
      throw new Error('[tenant-guard] aggregate sem $match por company_id como primeiro estágio');
    }
  });

}
