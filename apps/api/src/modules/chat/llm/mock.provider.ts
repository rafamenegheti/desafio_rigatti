import { setTimeout as sleep } from 'node:timers/promises';
import { env } from '../../../config/env';
import type { LlmProvider, LlmRequest, LlmResponse, ToolCall } from './types';

const strip = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

const STOPWORDS = new Set(
  ('oi ola bom dia boa tarde noite quero queria gostaria procuro procurar busco buscar tem tenho voces voce ' +
    'algum alguma algo me mostre mostrar mostra quais qual quanto custa custam preco precos valor produto produtos ' +
    'item itens de do da dos das um uma uns umas o a os as e ou para por com sem que no na nos nas em ao aos ' +
    'ate menos abaixo acima mais maximo minimo reais real r barato baratos barata baratas caro caros categoria categorias ' +
    'disponivel disponiveis tem ha existe voces indicar recomenda recomendar recomendacao sugestao sugerir ' +
    'por favor').split(' '),
);

/**
 * "LLM" de mentira, determinístico, para rodar o projeto sem chave de API e para testes.
 * Ele segue o MESMO caminho do modelo real: pede tools, recebe o resultado do banco e redige
 * a resposta a partir dele. Só a "inteligência" (interpretar a frase) é simplificada por regras.
 */
export class MockProvider implements LlmProvider {
  readonly name = 'mock';

  async complete(req: LlmRequest): Promise<LlmResponse> {
    const last = req.messages[req.messages.length - 1];

    if (last?.role === 'tool') {
      const text = this.compose(last.results.map((r) => r.content));
      await this.stream(text, req);
      return { text, toolCalls: [] };
    }

    const userText = last?.role === 'user' ? last.content : '';
    const call = this.decideTool(userText);
    if (call) return { text: '', toolCalls: [call] };

    const text = 'Olá! Sou o assistente da loja. Posso ajudar a encontrar produtos, comparar preços e ver categorias. O que você procura?';
    await this.stream(text, req);
    return { text, toolCalls: [] };
  }

  private decideTool(message: string): ToolCall | null {
    const text = strip(message);
    const id = `mock_${Date.now()}`;

    if (/categoria/.test(text)) return { id, name: 'list_categories', input: {} };

    const input: Record<string, unknown> = {};
    const max = text.match(/(?:ate|menos de|abaixo de|no maximo|maximo de)\s*(?:r\$\s*)?(\d+(?:[.,]\d+)?)/);
    const min = text.match(/(?:acima de|mais de|a partir de|no minimo|minimo de)\s*(?:r\$\s*)?(\d+(?:[.,]\d+)?)/);
    const num = (v: string) => Number(v.replace(/\./g, '').replace(',', '.'));
    if (max?.[1]) input.max_price = num(max[1]);
    if (min?.[1]) input.min_price = num(min[1]);
    if (/barat|menor preco|mais em conta/.test(text)) input.sort = 'price_asc';
    else if (/mais caro|premium|melhor/.test(text)) input.sort = 'price_desc';

    const words = text
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1 && !/^\d+$/.test(w) && !STOPWORDS.has(w));
    if (words.length) input.query = words.slice(0, 4).join(' ');

    if (Object.keys(input).length === 0 && !/produto|catalogo|vend|tem /.test(text)) return null;
    return { id, name: 'search_products', input };
  }

  private compose(results: string[]): string {
    const parts: string[] = [];
    for (const raw of results) {
      let data: { categorias?: string[]; total_encontrado?: number; produtos?: Record<string, unknown>[] };
      try {
        data = JSON.parse(raw);
      } catch {
        return 'Tive um problema ao consultar o catálogo. Pode tentar de novo?';
      }
      if (data.categorias) {
        parts.push(data.categorias.length ? `Estas são as categorias disponíveis:\n${data.categorias.map((c) => `- ${c}`).join('\n')}` : 'O catálogo ainda não tem categorias.');
      } else if (data.produtos) {
        if (data.produtos.length === 0) {
          parts.push('Não encontrei produtos com esses critérios. Quer que eu mostre as categorias disponíveis?');
        } else {
          const lines = data.produtos.map((p) => `- **${p.nome}** (${p.categoria}): ${p.preco}${p.descricao ? `. ${p.descricao}` : ''}`);
          const total = data.total_encontrado ?? data.produtos.length;
          const header = total > data.produtos.length ? `Encontrei ${total} produtos. Aqui estão ${data.produtos.length}:` : `Encontrei ${total} produto${total > 1 ? 's' : ''}:`;
          parts.push(`${header}\n${lines.join('\n')}`);
        }
      }
    }
    return parts.join('\n\n');
  }

  private async stream(text: string, req: LlmRequest) {
    // Simula o ritmo de um LLM de verdade (sem atrasar os testes)
    const chunks = text.match(/\S+\s*/g) ?? [text];
    for (const chunk of chunks) {
      if (req.signal?.aborted) return;
      req.onText(chunk);
      if (env.NODE_ENV !== 'test') await sleep(18);
    }
  }
}
