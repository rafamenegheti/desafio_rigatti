import type { Types } from 'mongoose';
import type { Role } from '../../shared/auth-context';
import { User } from './user.model';

const CROSS_TENANT = { skipTenantGuard: true } as const;

/**
 * Operações de usuário que, por natureza, acontecem ANTES de sabermos a empresa
 * (login por e-mail, resolver o token). Ficam isoladas e com nome explícito,
 * para ficar óbvio no code review que cruzam empresas de propósito.
 */
export const userIdentityRepository = {
  findByEmailWithPassword(email: string) {
    return User.findOne({ email: email.toLowerCase() }, null, CROSS_TENANT).select('+passwordHash');
  },
  findById(id: string) {
    return User.findById(id, null, CROSS_TENANT);
  },
  emailExists(email: string) {
    return User.exists({ email: email.toLowerCase() }).setOptions(CROSS_TENANT);
  },
  create(data: { company_id: Types.ObjectId; name: string; email: string; passwordHash: string; role: Role }) {
    return User.create(data);
  },
};

/** Operações de usuário já dentro de uma empresa: sempre escopadas. */
export class UserRepository {
  constructor(private readonly companyId: Types.ObjectId) {}

  list() {
    return User.find({ company_id: this.companyId }).sort({ createdAt: 1 });
  }
}
