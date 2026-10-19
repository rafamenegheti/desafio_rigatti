import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Button, Field, Modal, useToast } from '../components/ui';
import { IconPlus } from '../components/Icons';
import { initials } from '../lib/format';
import { ApiError, api } from '../lib/api';
import type { User } from '../types';

const emptyForm = { name: '', email: '', password: '', role: 'user' as 'user' | 'admin' };

export function TeamPage() {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.listUsers().then((r) => setUsers(r.items)).catch(() => toast('Falha ao carregar a equipe', 'error')).finally(() => setLoading(false));
  }, [toast]);
  useEffect(load, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setFields({});
    try {
      await api.createUser(form);
      toast('Usuário criado');
      setOpen(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fields);
        if (Object.keys(err.fields).length === 0) setError(err.message);
      } else setError('Não foi possível criar o usuário.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Equipe</h1>
          <p className="muted">Pessoas com acesso ao catálogo da sua empresa.</p>
        </div>
        <Button variant="primary" onClick={() => { setForm(emptyForm); setError(''); setFields({}); setOpen(true); }}>
          <IconPlus width={18} height={18} /> Novo usuário
        </Button>
      </header>

      <div className="card list">
        {loading ? <div className="list-row skeleton-row" /> : users.map((u) => (
          <div key={u.id} className="list-row">
            <span className="avatar" aria-hidden>{initials(u.name)}</span>
            <div className="list-main">
              <strong>{u.name}</strong>
              <small className="muted">{u.email}</small>
            </div>
            <span className={`chip ${u.role === 'admin' ? 'chip-primary' : ''}`}>{u.role === 'admin' ? 'Administrador' : 'Usuário'}</span>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo usuário">
        <form onSubmit={onSubmit} className="form" noValidate>
          <Field label="Nome" error={fields.name}><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></Field>
          <Field label="E-mail" error={fields.email}><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Senha provisória" error={fields.password} hint="Mínimo de 8 caracteres">
            <input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <Field label="Permissão" hint="Usuários só visualizam produtos e usam o assistente">
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'user' | 'admin' })}>
              <option value="user">Usuário (somente leitura)</option>
              <option value="admin">Administrador</option>
            </select>
          </Field>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <div className="modal-actions">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="primary" loading={saving}>Criar usuário</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
