import type { RequestHandler } from 'express';
import { AppError } from '../errors/app-error';
import { verifyToken } from '../../modules/auth/token';
import { userIdentityRepository } from '../../modules/users/user.repository';
import type { Role } from '../auth-context';

/**
 * Autentica pelo header "Authorization: Bearer <jwt>" e monta req.auth.
 * É aqui que nasce o company_id usado em todas as queries: vem do usuário
 * guardado no banco, jamais de algo que o cliente enviou.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw AppError.unauthorized();

  const userId = verifyToken(header.slice('Bearer '.length).trim());
  const user = await userIdentityRepository.findById(userId);
  if (!user) throw AppError.unauthorized('Usuário não existe mais');

  req.auth = { userId: user._id, companyId: user.company_id, role: user.role };
  next();
};

/** Autorização por papel. Sempre usado depois de authenticate. */
export function requireRole(...allowed: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) throw AppError.unauthorized();
    if (!allowed.includes(req.auth.role)) throw AppError.forbidden();
    next();
  };
}
