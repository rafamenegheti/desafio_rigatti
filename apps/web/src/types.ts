export type Role = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  companyId: string;
  companyName?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

export type ProductInput = Pick<Product, 'name' | 'description' | 'price' | 'category' | 'imageUrl'>;

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type ProductSort = 'newest' | 'price_asc' | 'price_desc' | 'name';

export interface ToolCallInfo {
  name: string;
  summary: string;
  input?: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tools?: ToolCallInfo[];
  streaming?: boolean;
  error?: boolean;
}
