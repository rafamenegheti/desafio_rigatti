import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/app-error';

const ALGORITHM = 'HS256';
const ISSUER = 'mini-saas-api';

/**
 * O token carrega só o id do usuário. Papel e empresa são lidos do banco a cada
 * requisição (ver middleware authenticate), assim uma mudança de papel ou a
 * remoção do usuário vale imediatamente, sem esperar o token expirar.
 */
export function signToken(userId: string): string {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: userId,
    issuer: ISSUER,
    algorithm: ALGORITHM,
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): string {
  try {
    // Fixar o algoritmo evita ataques de "alg: none" e de troca de algoritmo
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM], issuer: ISSUER });
    if (typeof payload === 'string' || !payload.sub) throw new Error('token sem sub');
    return payload.sub;
  } catch {
    throw AppError.unauthorized('Token inválido ou expirado');
  }
}
