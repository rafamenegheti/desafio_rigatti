import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spinner } from '../components/ui';
import type { Role } from '../types';
import { useAuth } from './AuthContext';

/** Protege rotas privadas; role opcional restringe a um papel (a API revalida de qualquer forma). */
export function RequireAuth({ role }: { role?: Role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="center-screen"><Spinner /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** Telas de login/cadastro: quem já está logado vai direto para o app. */
export function PublicOnly() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-screen"><Spinner /></div>;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}
