import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Button, Field } from '../components/ui';
import { IconBox, IconDatabase, IconSpark, IconUsers } from '../components/Icons';
import { ApiError } from '../lib/api';
import { useTheme } from '../theme/ThemeContext';
import { IconMoon, IconSun } from '../components/Icons';

function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode }) {
  const { theme, toggle } = useTheme();
  return (
    <div className="auth">
      <section className="auth-hero">
        <div className="brand brand-light">
          <span className="brand-mark"><IconBox width={18} height={18} /></span>
          <strong>Catálogo IA</strong>
        </div>
        <h1>Seu catálogo, com um assistente que conhece cada produto.</h1>
        <ul className="hero-points">
          <li><IconSpark /> Clientes perguntam em linguagem natural e recebem respostas com dados reais</li>
          <li><IconDatabase /> Cada empresa enxerga somente o próprio catálogo</li>
          <li><IconUsers /> Administradores gerenciam produtos; a equipe consulta e conversa</li>
        </ul>
      </section>

      <section className="auth-panel">
        <button className="icon-btn auth-theme" onClick={toggle} aria-label="Alternar tema">
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
        <div className="auth-card">
          <h2>{title}</h2>
          <p className="muted">{subtitle}</p>
          {children}
          <p className="auth-footer">{footer}</p>
        </div>
      </section>
    </div>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate((location.state as { from?: string } | null)?.from ?? '/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Bem-vindo de volta"
      subtitle="Entre na sua conta para continuar."
      footer={<>Ainda não tem conta? <Link to="/register">Cadastre sua empresa</Link></>}
    >
      <form onSubmit={onSubmit} className="form" noValidate>
        <Field label="E-mail">
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" required autoFocus />
        </Field>
        <Field label="Senha">
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <Button type="submit" variant="primary" loading={loading} className="btn-block">Entrar</Button>
      </form>
      <div className="demo-box">
        <strong>Contas de demonstração</strong>
        <span>Admin: admin@techstore.com</span>
        <span>Usuário: cliente@techstore.com</span>
        <span>Senha: Senha@123</span>
      </div>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ companyName: '', name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setFields({});
    setLoading(true);
    try {
      await register(form);
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fields);
        setError(Object.keys(err.fields).length ? '' : err.message);
      } else setError('Não foi possível cadastrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Cadastre sua empresa"
      subtitle="Você será o administrador e poderá convidar sua equipe depois."
      footer={<>Já tem conta? <Link to="/login">Entrar</Link></>}
    >
      <form onSubmit={onSubmit} className="form" noValidate>
        <Field label="Nome da empresa" error={fields.companyName}>
          <input value={form.companyName} onChange={set('companyName')} required autoFocus />
        </Field>
        <Field label="Seu nome" error={fields.name}>
          <input value={form.name} onChange={set('name')} autoComplete="name" required />
        </Field>
        <Field label="E-mail" error={fields.email}>
          <input type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
        </Field>
        <Field label="Senha" error={fields.password} hint="Mínimo de 8 caracteres">
          <input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" required />
        </Field>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <Button type="submit" variant="primary" loading={loading} className="btn-block">Criar conta</Button>
      </form>
    </AuthShell>
  );
}
