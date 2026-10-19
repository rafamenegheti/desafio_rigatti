import { Route, Routes } from 'react-router-dom';
import { PublicOnly, RequireAuth } from './auth/guards';
import { AppLayout } from './components/AppLayout';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { ChatPage } from './pages/ChatPage';
import { ProductsPage } from './pages/ProductsPage';
import { TeamPage } from './pages/TeamPage';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<ProductsPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route element={<RequireAuth role="admin" />}>
            <Route path="team" element={<TeamPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<div className="center-screen"><p>Página não encontrada.</p></div>} />
    </Routes>
  );
}
