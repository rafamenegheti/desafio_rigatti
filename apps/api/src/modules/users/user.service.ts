import bcrypt from 'bcryptjs';
import type { Types } from 'mongoose';
import { AppError } from '../../shared/errors/app-error';
import type { CreateUserInput } from '../auth/auth.schemas';
import { toPublicUser } from '../auth/auth.service';
import { UserRepository, userIdentityRepository } from './user.repository';

export class UserService {
  private readonly repo: UserRepository;

  constructor(private readonly companyId: Types.ObjectId) {
    this.repo = new UserRepository(companyId);
  }

  async list() {
    return (await this.repo.list()).map((u) => toPublicUser(u));
  }

  /** O admin cria usuários sempre na própria empresa; o company_id nunca vem do body. */
  async create(input: CreateUserInput) {
    if (await userIdentityRepository.emailExists(input.email)) {
      throw AppError.conflict('Este e-mail já está cadastrado');
    }
    try {
      const user = await userIdentityRepository.create({
        company_id: this.companyId,
        name: input.name,
        email: input.email,
        passwordHash: await bcrypt.hash(input.password, 10),
        role: input.role,
      });
      return toPublicUser(user);
    } catch (err) {
      if ((err as { code?: number }).code === 11000) throw AppError.conflict('Este e-mail já está cadastrado');
      throw err;
    }
  }
}
