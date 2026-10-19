import { useState } from 'react';
import { assetUrl } from '../lib/api';
import { formatPrice } from '../lib/format';
import type { Product } from '../types';
import { IconEdit, IconImage, IconTrash } from './Icons';

interface Props {
  product: Product;
  canEdit: boolean;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
}

export function ProductCard({ product, canEdit, onEdit, onDelete }: Props) {
  const [broken, setBroken] = useState(false);
  const showImage = product.imageUrl && !broken;

  return (
    <article className="card product">
      <div className="product-media">
        {showImage ? (
          <img src={assetUrl(product.imageUrl)} alt={product.name} loading="lazy" onError={() => setBroken(true)} />
        ) : (
          <div className="product-placeholder" aria-hidden><IconImage width={32} height={32} /></div>
        )}
        <span className="chip product-category">{product.category}</span>
      </div>
      <div className="product-body">
        <h3 title={product.name}>{product.name}</h3>
        <p className="product-desc">{product.description || 'Sem descrição.'}</p>
        <div className="product-footer">
          <strong className="price">{formatPrice(product.price)}</strong>
          {canEdit && (
            <div className="row-actions">
              <button className="icon-btn" onClick={() => onEdit(product)} aria-label={`Editar ${product.name}`} title="Editar"><IconEdit /></button>
              <button className="icon-btn danger" onClick={() => onDelete(product)} aria-label={`Excluir ${product.name}`} title="Excluir"><IconTrash /></button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
