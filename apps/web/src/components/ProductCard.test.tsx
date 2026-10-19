import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductCard } from './ProductCard';
import type { Product } from '../types';

const product: Product = {
  id: '1',
  name: 'Cadeira Ergonômica',
  description: 'Apoio lombar',
  price: 899.9,
  category: 'Móveis',
  imageUrl: 'https://exemplo.com/a.png',
  createdAt: '',
  updatedAt: '',
};

describe('ProductCard', () => {
  it('mostra nome, categoria e preço', () => {
    render(<ProductCard product={product} canEdit={false} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('Cadeira Ergonômica')).toBeInTheDocument();
    expect(screen.getByText('Móveis')).toBeInTheDocument();
    expect(screen.getByText(/899,90/)).toBeInTheDocument();
  });

  it('usuário comum não vê ações de edição', () => {
    render(<ProductCard product={product} canEdit={false} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /excluir/i })).not.toBeInTheDocument();
  });

  it('admin edita e exclui', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<ProductCard product={product} canEdit onEdit={onEdit} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    await userEvent.click(screen.getByRole('button', { name: /excluir/i }));
    expect(onEdit).toHaveBeenCalledWith(product);
    expect(onDelete).toHaveBeenCalledWith(product);
  });

  it('cai no placeholder quando a imagem quebra', () => {
    const { container } = render(<ProductCard product={product} canEdit={false} onEdit={() => {}} onDelete={() => {}} />);
    const img = container.querySelector('img')!;
    img.dispatchEvent(new Event('error'));
    return vi.waitFor(() => expect(container.querySelector('img')).toBeNull());
  });
});
