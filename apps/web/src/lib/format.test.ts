import { formatPrice, initials } from './format';

describe('format', () => {
  it('formata preço em reais', () => {
    expect(formatPrice(1234.5).replace(/\s/g, ' ')).toBe('R$ 1.234,50');
  });
  it('gera iniciais com até duas letras', () => {
    expect(initials('ana maria souza')).toBe('AM');
    expect(initials('Rafael')).toBe('R');
    expect(initials('')).toBe('');
  });
});
