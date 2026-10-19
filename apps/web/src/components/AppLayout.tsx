import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { initials } from '../lib/format';
import { IconBox, IconChat, IconLogout, IconMoon, IconSun, IconUsers } from './Icons';

export function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  if (!user) return null;

  const links = [
    { to: '/', label: 'Produtos', icon: <IconBox />, end: true },
    { to: '/chat', label: 'Assistente', icon: <IconChat /> },
    ...(user.role === 'admin' ? [{ to: '/team', label: 'Equipe', icon: <IconUsers /> }] : []),
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><IconBox width={18} height={18} /></span>
          <div>
            <strong>Catálogo IA</strong>
            <small>{user.companyName}</small>
          </div>
        </div>

        <nav className="nav" aria-label="Principal">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              {l.icon}
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <span className="avatar" aria-hidden>{initials(user.name)}</span>
            <div className="user-meta">
              <strong>{user.name}</strong>
              <small>{user.role === 'admin' ? 'Administrador' : 'Usuário'}</small>
            </div>
          </div>
          <div className="footer-actions">
            <button className="icon-btn" onClick={toggle} aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'} title="Alternar tema">
              {theme === 'dark' ? <IconSun /> : <IconMoon />}
            </button>
            <button className="icon-btn" onClick={logout} aria-label="Sair" title="Sair">
              <IconLogout />
            </button>
          </div>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
