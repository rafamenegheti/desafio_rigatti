import { z } from 'zod';

const email = z.string().trim().toLowerCase().pipe(z.email('E-mail inválido'));
// bcrypt só considera os 72 primeiros bytes, por isso o limite máximo
const password = z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres').max(72, 'A senha pode ter no máximo 72 caracteres');

export const registerSchema = z.object({
  companyName: z.string().trim().min(2, 'Informe o nome da empresa').max(120),
  name: z.string().trim().min(2, 'Informe seu nome').max(120),
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Informe a senha').max(72),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email,
  password,
  role: z.enum(['admin', 'user']).default('user'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
