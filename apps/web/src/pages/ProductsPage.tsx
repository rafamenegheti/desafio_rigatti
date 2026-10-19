import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { IconBox, IconPlus, IconSearch } from '../components/Icons';
import { ProductCard } from '../components/ProductCard';
import { ProductFormDialog } from '../components/ProductFormDialog';
import { Button, EmptyState, Modal, useToast } from '../components/ui';
import { useDebounced } from '../hooks';
import { ApiError, api } from '../lib/api';
import type { Page, Product, ProductSort } from '../types';

export function ProductsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'admin';

  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<ProductSort>('newest');
  const [page, setPage] = useState(1);

  const [data, setData] = useState<Page<Product> | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [editing, setEditing] = useState<Product | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  // Mudou algum filtro: volta para a primeira página
  useEffect(() => setPage(1), [q, category, sort]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .listProducts({ q, category, sort, page, limit: 12 })
      .then((res) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Falha ao carregar produtos.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true; // ignora respostas antigas se o usuário já mudou o filtro
    };
  }, [q, category, sort, page, reloadKey]);

  useEffect(() => {
    api.categories().then((r) => setCategories(r.items)).catch(() => {});
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  async function confirmDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await api.deleteProduct(deleting.id);
      toast('Produto excluído');
      setDeleting(null);
      // Se apagou o último item da página, volta uma
      if (data && data.items.length === 1 && page > 1) setPage(page - 1);
      reload();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Não foi possível excluir', 'error');
    } finally {
      setDeletingBusy(false);
    }
  }

  const hasFilters = q !== '' || category !== '';

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Produtos</h1>
          <p className="muted">{data ? `${data.total} ${data.total === 1 ? 'produto' : 'produtos'}` : 'Carregando…'}{isAdmin ? '' : ' · modo visualização'}</p>
        </div>
        {isAdmin && (
          <Button variant="primary" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <IconPlus width={18} height={18} /> Novo produto
          </Button>
        )}
      </header>

      <div className="toolbar">
        <div className="search">
          <IconSearch width={18} height={18} />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou descrição" aria-label="Buscar produtos" />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filtrar por categoria">
          <option value="">Todas as categorias</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as ProductSort)} aria-label="Ordenar">
          <option value="newest">Mais recentes</option>
          <option value="price_asc">Menor preço</option>
          <option value="price_desc">Maior preço</option>
          <option value="name">Nome (A-Z)</option>
        </select>
      </div>

      {error ? (
        <div className="alert alert-error">
          {error} <button className="link-btn" onClick={reload}>Tentar de novo</button>
        </div>
      ) : loading && !data ? (
        <div className="grid">{Array.from({ length: 8 }, (_, i) => <div key={i} className="card skeleton-card" />)}</div>
      ) : data && data.items.length === 0 ? (
        <EmptyState icon={<IconBox width={28} height={28} />} title={hasFilters ? 'Nada encontrado' : 'Nenhum produto ainda'}>
          {hasFilters ? 'Tente outros termos ou limpe os filtros.' : isAdmin ? 'Crie o primeiro produto para o assistente começar a responder.' : 'O catálogo da sua empresa ainda está vazio.'}
        </EmptyState>
      ) : (
        <div className={`grid${loading ? ' is-loading' : ''}`}>
          {data?.items.map((p) => (
            <ProductCard key={p.id} product={p} canEdit={!!isAdmin} onEdit={(x) => { setEditing(x); setFormOpen(true); }} onDelete={setDeleting} />
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <nav className="pagination" aria-label="Paginação">
          <Button disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
          <span>Página {data.page} de {data.totalPages}</span>
          <Button disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>Próxima</Button>
        </nav>
      )}

      {isAdmin && (
        <>
          <ProductFormDialog open={formOpen} product={editing} categories={categories} onClose={() => setFormOpen(false)} onSaved={reload} />
          <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Excluir produto">
            <p>Tem certeza que deseja excluir <strong>{deleting?.name}</strong>? Essa ação não pode ser desfeita.</p>
            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setDeleting(null)}>Cancelar</Button>
              <Button variant="danger" loading={deletingBusy} onClick={confirmDelete}>Excluir</Button>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
