import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError, api, assetUrl } from '../lib/api';
import type { Product, ProductInput } from '../types';
import { IconImage } from './Icons';
import { Button, Field, Modal, useToast } from './ui';

interface Props {
  open: boolean;
  product: Product | null; // null = criando
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
}

const empty = { name: '', description: '', price: '', category: '', imageUrl: '' };

export function ProductFormDialog({ open, product, categories, onClose, onSaved }: Props) {
  const toast = useToast();
  const [form, setForm] = useState(empty);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setFields({});
    setError('');
    setForm(
      product
        ? { name: product.name, description: product.description, price: String(product.price), category: product.category, imageUrl: product.imageUrl }
        : empty,
    );
  }, [open, product]);

  const set = (key: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const { url } = await api.uploadImage(file);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha no envio da imagem.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setFields({});

    const price = Number(form.price.replace(',', '.'));
    if (form.price.trim() === '' || Number.isNaN(price)) {
      setFields({ price: 'Informe um preço válido' });
      setSaving(false);
      return;
    }
    const payload: ProductInput = { ...form, price };
    try {
      if (product) await api.updateProduct(product.id, payload);
      else await api.createProduct(payload);
      toast(product ? 'Produto atualizado' : 'Produto criado');
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fields);
        if (Object.keys(err.fields).length === 0) setError(err.message);
      } else setError('Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={product ? 'Editar produto' : 'Novo produto'}>
      <form onSubmit={onSubmit} className="form" noValidate>
        <Field label="Nome" error={fields.name}>
          <input value={form.name} onChange={set('name')} required autoFocus />
        </Field>
        <div className="form-row">
          <Field label="Preço (R$)" error={fields.price}>
            <input inputMode="decimal" value={form.price} onChange={set('price')} placeholder="0,00" required />
          </Field>
          <Field label="Categoria" error={fields.category}>
            <input value={form.category} onChange={set('category')} list="category-options" required />
            <datalist id="category-options">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </Field>
        </div>
        <Field label="Descrição" error={fields.description}>
          <textarea rows={3} value={form.description} onChange={set('description')} />
        </Field>

        <Field label="Imagem" error={fields.imageUrl} hint="Cole uma URL ou envie um arquivo (JPG, PNG, WEBP ou GIF até 2 MB)">
          <div className="image-input">
            <div className="image-preview">
              {form.imageUrl ? <img src={assetUrl(form.imageUrl)} alt="Pré-visualização" /> : <IconImage />}
            </div>
            <div className="image-controls">
              <input value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://..." />
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(e) => onFile(e.target.files?.[0])} />
              <Button type="button" loading={uploading} onClick={() => fileRef.current?.click()}>Enviar arquivo</Button>
            </div>
          </div>
        </Field>

        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <div className="modal-actions">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" loading={saving}>{product ? 'Salvar' : 'Criar produto'}</Button>
        </div>
      </form>
    </Modal>
  );
}
