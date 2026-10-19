import type { Request } from 'express';
import type { Types } from 'mongoose';
import { AppError } from './errors/app-error';

export type Role = 'admin' | 'user';
export const ROLES: Role[] = ['admin', 'user'];

/** Identidade da requisição. O company_id vem SEMPRE daqui, nunca do body/query/params. */
export interface AuthContext {
  userId: Types.ObjectId;
  companyId: Types.ObjectId;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export function getAuth(req: Request): AuthContext {
  if (!req.auth) throw AppError.unauthorized();
  return req.auth;
}
