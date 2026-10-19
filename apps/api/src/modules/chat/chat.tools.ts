import type { Types } from 'mongoose';
import { z } from 'zod';
import { ProductService } from '../products/product.service';
import type { ToolDefinition } from './llm/types';

const formatBRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const searchInput = z.object({
  query: z.string().trim().max(100).optional(),
  category: z.string().trim().max(60).optional(),
  min_price: z.number().min(0).optional(),
  max_price: z.number().min(0).optional(),
  sort: z.enum(['relevance', 'price_asc', 'price_desc', 'newest']).optional(),
  limit: z.number().int().min(1).max(10).default(5),
});

export interface ToolOutcome {
  /** O que volta para o modelo */
  content: string;
  /** Resumo curto para a interface mostrar "o agente consultou X" */
  summary: string;
}

export const toolDefinitions: ToolDefinition[] = [
  {
    name: 'search_products',
    description:
      'Busca produtos no catálogo da empresa do cliente. Use SEMPRE que a pergunta envolver produtos, preços, ' +
      'categorias, comparações ou recomendações. Todos os parâmetros são opcionais; sem filtros, devolve os mais recentes.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Palavras-chave do produto (ex.: "cadeira", "fone bluetooth"). Sem frases longas.' },
        category: { type: 'string', description: 'Nome exato de uma categoria (veja list_categories)' },
        min_price: { type: 'number', description: 'Preço mínimo em reais' },
        max_price: { type: 'number', description: 'Preço máximo em reais' },
        sort: { type: 'string', enum: ['relevance', 'price_asc', 'price_desc', 'newest'], description: 'Ordenação. Para "o mais barato" use price_asc' },
        limit: { type: 'integer', description: 'Quantidade de resultados (1 a 10, padrão 5)' },
      },
    },
  },
  {
    name: 'list_categories',
    description: 'Lista as categorias de produtos disponíveis no catálogo da empresa.',
    inputSchema: { type: 'object', properties: {} },
  },
];

/**
 * As tools nascem já amarradas à empresa do usuário autenticado (companyId vem do JWT,
 * via req.auth). O modelo NÃO tem parâmetro de empresa: mesmo com prompt injection,
 * ele só consegue consultar o catálogo de quem está logado.
 */
export function createToolExecutor(companyId: Types.ObjectId) {
  const products = new ProductService(companyId);

  return async function execute(name: string, rawInput: unknown): Promise<ToolOutcome> {
    switch (name) {
      case 'search_products': {
        const input = searchInput.parse(rawInput ?? {});
        const result = await products.list({
          q: input.query || undefined,
          category: input.category || undefined,
          minPrice: input.min_price,
          maxPrice: input.max_price,
          sort: input.sort,
          page: 1,
          limit: input.limit,
        });
        const items = result.items.map((p) => ({
          nome: p.name,
          categoria: p.category,
          preco: formatBRL(p.price),
          preco_numerico: p.price,
          descricao: p.description.slice(0, 300),
        }));
        return {
          content: JSON.stringify({ total_encontrado: result.total, exibindo: items.length, produtos: items }),
          summary: `${result.total} produto(s) encontrado(s)${input.query ? ` para "${input.query}"` : ''}`,
        };
      }
      case 'list_categories': {
        const categories = await products.categories();
        return { content: JSON.stringify({ categorias: categories }), summary: `${categories.length} categoria(s)` };
      }
      default:
        throw new Error(`Tool desconhecida: ${name}`);
    }
  };
}
