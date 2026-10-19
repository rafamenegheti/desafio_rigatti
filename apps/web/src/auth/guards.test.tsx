import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './guards';
import type { User } from '../types';

let mockState: { user: User | null; loading: boolean } = { user: null, loading: false };
vi.mock('./AuthContext', () => ({ useAuth: () => mockState }));

const user = (role: User['role']): User => ({ id: '1', name: 'X', email: 'x@x.com', role, companyId: 'c' });

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<p>tela de login</p>} />
        <Route path="/" element={<p>home</p>} />
        <Route element={<RequireAuth />}>
          <Route path="/privada" element={<p>área privada</p>} />
        </Route>
        <Route element={<RequireAuth role="admin" />}>
          <Route path="/equipe" element={<p>equipe</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  it('manda visitante para o login', () => {
    mockState = { user: null, loading: false };
    renderAt('/privada');
    expect(screen.getByText('tela de login')).toBeInTheDocument();
  });

  it('libera usuário logado', () => {
    mockState = { user: user('user'), loading: false };
    renderAt('/privada');
    expect(screen.getByText('área privada')).toBeInTheDocument();
  });

  it('bloqueia rota de admin para usuário comum', () => {
    mockState = { user: user('user'), loading: false };
    renderAt('/equipe');
    expect(screen.queryByText('equipe')).not.toBeInTheDocument();
    expect(screen.getByText('home')).toBeInTheDocument();
  });

  it('libera rota de admin para admin', () => {
    mockState = { user: user('admin'), loading: false };
    renderAt('/equipe');
    expect(screen.getByText('equipe')).toBeInTheDocument();
  });

  it('espera a sessão carregar antes de decidir', () => {
    mockState = { user: null, loading: true };
    renderAt('/privada');
    expect(screen.queryByText('tela de login')).not.toBeInTheDocument();
  });
});
