import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPage } from './ChatPage';
import { ApiError } from '../lib/api';

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: '1', name: 'Ana', email: 'a@a.com', role: 'user', companyId: 'c', companyName: 'Loja Teste' } }),
}));

type Handlers = { onProvider: (n: string) => void; onTool: (t: { name: string; summary: string }) => void; onText: (d: string) => void };
type StreamFn = (message: string, history: unknown[], handlers: Handlers, signal: AbortSignal) => Promise<void>;
const { streamChat } = vi.hoisted(() => ({ streamChat: vi.fn<StreamFn>() }));
vi.mock('../lib/chat-stream', () => ({ streamChat }));

beforeEach(() => {
  streamChat.mockReset();
});

describe('ChatPage', () => {
  it('mostra a resposta em streaming e a consulta feita ao banco', async () => {
    streamChat.mockImplementation(async (_msg, _hist, handlers) => {
      handlers.onProvider('anthropic');
      handlers.onTool({ name: 'search_products', summary: '2 produto(s) encontrado(s)' });
      handlers.onText('Temos ');
      handlers.onText('**duas** opções.');
    });
    render(<ChatPage />);

    await userEvent.type(screen.getByLabelText('Mensagem'), 'tem cadeira?{Enter}');

    expect(await screen.findByText('tem cadeira?')).toBeInTheDocument();
    expect(await screen.findByText('2 produto(s) encontrado(s)')).toBeInTheDocument();
    expect(await screen.findByText('duas')).toBeInTheDocument(); // markdown renderizado em <strong>
    expect(streamChat).toHaveBeenCalledWith('tem cadeira?', [], expect.any(Object), expect.any(AbortSignal));
  });

  it('reenvia o histórico na próxima pergunta', async () => {
    streamChat.mockImplementation(async (_m, _h, handlers) => handlers.onText('resposta'));
    render(<ChatPage />);
    const box = screen.getByLabelText('Mensagem');
    await userEvent.type(box, 'primeira{Enter}');
    await screen.findByText('resposta');
    await userEvent.type(box, 'segunda{Enter}');

    await vi.waitFor(() => expect(streamChat).toHaveBeenCalledTimes(2));
    expect(streamChat.mock.calls[1]![1]).toEqual([
      { role: 'user', content: 'primeira' },
      { role: 'assistant', content: 'resposta' },
    ]);
  });

  it('mostra erro amigável quando a API falha', async () => {
    streamChat.mockRejectedValue(new ApiError(502, 'O assistente está indisponível no momento.'));
    render(<ChatPage />);
    await userEvent.type(screen.getByLabelText('Mensagem'), 'oi{Enter}');
    expect(await screen.findByText('O assistente está indisponível no momento.')).toBeInTheDocument();
  });

  it('Shift+Enter não envia', async () => {
    render(<ChatPage />);
    await userEvent.type(screen.getByLabelText('Mensagem'), 'linha 1{Shift>}{Enter}{/Shift}linha 2');
    expect(streamChat).not.toHaveBeenCalled();
  });

  it('sugestões enviam a pergunta', async () => {
    streamChat.mockImplementation(async (_m, _h, handlers) => handlers.onText('ok'));
    render(<ChatPage />);
    await userEvent.click(screen.getByRole('button', { name: /quais categorias/i }));
    expect(streamChat).toHaveBeenCalledWith('Quais categorias vocês têm?', [], expect.any(Object), expect.any(AbortSignal));
  });
});
