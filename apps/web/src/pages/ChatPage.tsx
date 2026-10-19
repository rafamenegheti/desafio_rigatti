import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import Markdown from 'react-markdown';
import { useAuth } from '../auth/AuthContext';
import { IconDatabase, IconSend, IconSpark, IconStop } from '../components/Icons';
import { ApiError } from '../lib/api';
import { streamChat } from '../lib/chat-stream';
import type { ChatMessage } from '../types';

const SUGGESTIONS = ['Quais categorias vocês têm?', 'Qual o produto mais barato?', 'Me mostre os produtos até 500 reais', 'O que vocês recomendam?'];
const HISTORY_LIMIT = 10;

let nextId = 0;
const newId = () => `m${++nextId}`;

export function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  // Sair da tela cancela a resposta em andamento (e para de gastar token)
  useEffect(() => () => abortRef.current?.abort(), []);

  const patchLast = (fn: (m: ChatMessage) => ChatMessage) =>
    setMessages((all) => all.map((m, i) => (i === all.length - 1 ? fn(m) : m)));

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;

    // Só conversas "boas" voltam como contexto: sem erros e sem a resposta em andamento
    const history = messages
      .filter((m) => !m.error && !m.streaming && m.content)
      .slice(-HISTORY_LIMIT)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((all) => [
      ...all,
      { id: newId(), role: 'user', content: message },
      { id: newId(), role: 'assistant', content: '', tools: [], streaming: true },
    ]);
    setInput('');
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChat(
        message,
        history,
        {
          onProvider: setProvider,
          onTool: (tool) => patchLast((m) => ({ ...m, tools: [...(m.tools ?? []), tool] })),
          onText: (delta) => patchLast((m) => ({ ...m, content: m.content + delta })),
        },
        controller.signal,
      );
      patchLast((m) => ({ ...m, streaming: false }));
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        patchLast((m) => ({ ...m, streaming: false, content: m.content || '(resposta interrompida)' }));
      } else {
        const msg = err instanceof ApiError ? err.message : 'Algo deu errado. Tente novamente.';
        patchLast((m) => ({ ...m, streaming: false, error: true, content: msg }));
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(input);
    }
  }

  return (
    <div className="page chat-page">
      <header className="page-header">
        <div>
          <h1>Assistente</h1>
          <p className="muted">Pergunte sobre os produtos de {user?.companyName}. As respostas vêm direto do banco de dados.</p>
        </div>
        {provider === 'mock' && <span className="chip chip-warn" title="Sem chave de IA configurada: respostas por regras simples, mas com dados reais">Modo demonstração</span>}
      </header>

      <div className="chat-window">
        <div className="chat-scroll" role="log" aria-live="polite" aria-label="Conversa">
          {messages.length === 0 ? (
            <div className="chat-welcome">
              <span className="welcome-icon"><IconSpark width={28} height={28} /></span>
              <h2>Como posso ajudar?</h2>
              <p className="muted">Pergunte sobre preços, categorias ou peça recomendações.</p>
              <div className="suggestions">
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="suggestion" onClick={() => send(s)}>{s}</button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`msg msg-${m.role}${m.error ? ' msg-error' : ''}`}>
                {m.role === 'assistant' && <span className="msg-avatar" aria-hidden><IconSpark width={16} height={16} /></span>}
                <div className="msg-content">
                  {m.tools && m.tools.length > 0 && (
                    <div className="tool-chips">
                      {m.tools.map((t, i) => (
                        <span key={i} className="chip chip-tool"><IconDatabase width={13} height={13} /> {t.summary}</span>
                      ))}
                    </div>
                  )}
                  <div className="bubble">
                    {m.role === 'assistant' ? (
                      m.content ? <Markdown>{m.content}</Markdown> : <span className="typing" aria-label="Digitando"><i /><i /><i /></span>
                    ) : (
                      m.content
                    )}
                    {m.streaming && m.content && <span className="caret" />}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>

        <form className="composer" onSubmit={(e) => { e.preventDefault(); void send(input); }}>
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Digite sua pergunta…"
            aria-label="Mensagem"
            maxLength={1000}
            autoFocus
          />
          {busy ? (
            <button type="button" className="btn btn-danger send" onClick={() => abortRef.current?.abort()} aria-label="Parar resposta"><IconStop width={18} height={18} /></button>
          ) : (
            <button type="submit" className="btn btn-primary send" disabled={!input.trim()} aria-label="Enviar"><IconSend width={18} height={18} /></button>
          )}
        </form>
      </div>
    </div>
  );
}
