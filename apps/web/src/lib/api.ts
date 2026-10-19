import type { Page, Product, ProductInput, ProductSort, User } from '../types';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';
const TOKEN_KEY = 'token';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* armazenamento indisponível: a sessão vale só até recarregar */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignora */
    }
  },
};

/** Imagens enviadas vêm como "/uploads/x.png" (relativas à API); URLs externas ficam como estão. */
export const assetUrl = (url: string) => (url.startsWith('/uploads/') ? `${API_URL}${url}` : url);

// Quando a API devolve 401 com um token salvo, a sessão acabou: o AuthContext escuta isso
export const SESSION_EXPIRED_EVENT = 'session-expired';

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = tokenStore.get();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

async function toError(res: Response): Promise<ApiError> {
  let message = 'Algo deu errado. Tente novamente.';
  const fields: Record<string, string> = {};
  try {
    const body = await res.json();
    if (body?.error?.message) message = body.error.message;
    if (Array.isArray(body?.error?.details)) {
      for (const d of body.error.details) if (d.field) fields[d.field] = d.message;
    }
  } catch {
    /* corpo não era JSON */
  }
  return new ApiError(res.status, message, fields);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor.');
  }
  if (res.status === 401 && tokenStore.get() && !path.startsWith('/auth/login')) {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  if (!res.ok) throw await toError(res);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: authHeaders({ 'Content-Type': 'application/json' }),
  body: JSON.stringify(body),
});
const get = (): RequestInit => ({ headers: authHeaders() });

export interface ProductFilters {
  q?: string;
  category?: string;
  sort?: ProductSort;
  page?: number;
  limit?: number;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', json('POST', { email, password })),
  register: (data: { companyName: string; name: string; email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/register', json('POST', data)),
  me: () => request<{ user: User }>('/auth/me', get()),

  listProducts: (filters: ProductFilters) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value !== undefined && value !== '') params.set(key, String(value));
    return request<Page<Product>>(`/products?${params}`, get());
  },
  categories: () => request<{ items: string[] }>('/products/categories', get()),
  createProduct: (data: ProductInput) => request<{ product: Product }>('/products', json('POST', data)),
  updateProduct: (id: string, data: ProductInput) => request<{ product: Product }>(`/products/${id}`, json('PUT', data)),
  deleteProduct: (id: string) => request<void>(`/products/${id}`, { method: 'DELETE', headers: authHeaders() }),

  uploadImage: async (file: File) => {
    const form = new FormData();
    form.append('image', file);
    return request<{ url: string }>('/uploads', { method: 'POST', headers: authHeaders(), body: form });
  },

  listUsers: () => request<{ items: User[] }>('/users', get()),
  createUser: (data: { name: string; email: string; password: string; role: 'admin' | 'user' }) =>
    request<{ user: User }>('/users', json('POST', data)),
};

export { API_URL, authHeaders };
