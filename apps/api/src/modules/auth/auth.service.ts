import bcrypt from 'bcryptjs';
import { AppError } from '../../shared/errors/app-error';
import { companyRepository } from '../companies/company.repository';
import { userIdentityRepository } from '../users/user.repository';
import type { UserDoc } from '../users/user.model';
import type { LoginInput, RegisterInput } from './auth.schemas';
import { signToken } from './token';

const BCRYPT_COST = 10;
// Hash falso para gastar o mesmo tempo quando o e-mail não existe (evita enumerar usuários pelo tempo de resposta)
const DUMMY_HASH = bcrypt.hashSync('senha-qualquer-para-igualar-o-tempo', BCRYPT_COST);

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  companyId: string;
  companyName?: string;
}

export function toPublicUser(user: UserDoc, companyName?: string): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.company_id.toString(),
    ...(companyName ? { companyName } : {}),
  };
}

export const authService = {
  /** Cadastro público: cria a empresa e o primeiro usuário, que vira admin dela. */
  async register(input: RegisterInput) {
    if (await userIdentityRepository.emailExists(input.email)) {
      throw AppError.conflict('Este e-mail já está cadastrado');
    }
    const company = await companyRepository.create(input.companyName);
    try {
      const user = await userIdentityRepository.create({
        company_id: company._id,
        name: input.name,
        email: input.email,
        passwordHash: await bcrypt.hash(input.password, BCRYPT_COST),
        role: 'admin',
      });
      return { token: signToken(user.id), user: toPublicUser(user, company.name) };
    } catch (err) {
      // Sem transação (Mongo standalone): desfaz a empresa para não deixar órfã
      await companyRepository.deleteById(company._id);
      if ((err as { code?: number }).code === 11000) throw AppError.conflict('Este e-mail já está cadastrado');
      throw err;
    }
  },

  async login(input: LoginInput) {
    const user = await userIdentityRepository.findByEmailWithPassword(input.email);
    const ok = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw AppError.unauthorized('E-mail ou senha incorretos');

    const company = await companyRepository.findById(user.company_id);
    return { token: signToken(user.id), user: toPublicUser(user, company?.name) };
  },

  async me(user: UserDoc) {
    const company = await companyRepository.findById(user.company_id);
    return toPublicUser(user, company?.name);
  },
};
