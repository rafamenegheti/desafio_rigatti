import { createSseParser } from './sse';

describe('createSseParser', () => {
  it('lê eventos completos', () => {
    const parse = createSseParser();
    const events = parse('event: text\ndata: {"delta":"oi"}\n\nevent: done\ndata: {"ok":true}\n\n');
    expect(events).toEqual([
      { event: 'text', data: { delta: 'oi' } },
      { event: 'done', data: { ok: true } },
    ]);
  });

  it('junta eventos cortados no meio entre pedaços de rede', () => {
    const parse = createSseParser();
    expect(parse('event: text\ndata: {"del')).toEqual([]);
    expect(parse('ta":"olá"}\n')).toEqual([]);
    expect(parse('\n')).toEqual([{ event: 'text', data: { delta: 'olá' } }]);
  });

  it('aceita quebra de linha CRLF', () => {
    const parse = createSseParser();
    expect(parse('event: a\r\ndata: {"x":1}\r\n\r\n')).toEqual([{ event: 'a', data: { x: 1 } }]);
  });

  it('ignora evento malformado sem derrubar os seguintes', () => {
    const parse = createSseParser();
    const events = parse('event: a\ndata: {quebrado\n\nevent: b\ndata: {"ok":1}\n\n');
    expect(events).toEqual([{ event: 'b', data: { ok: 1 } }]);
  });
});
