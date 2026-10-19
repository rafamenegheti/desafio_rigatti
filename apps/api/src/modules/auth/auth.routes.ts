import { Router } from 'express';
import { authenticate } from '../../shared/middleware/authenticate';
import { authLimiter } from '../../shared/middleware/rate-limit';
import { authService } from './auth.service';
import { loginSchema, registerSchema } from './auth.schemas';
import { userIdentityRepository } from '../users/user.repository';
import { getAuth } from '../../shared/auth-context';
import { AppError } from '../../shared/errors/app-error';

export const authRouter = Router();

authRouter.post('/register', authLimiter, async (req, res) => {
  const input = registerSchema.parse(req.body);
  res.status(201).json(await authService.register(input));
});

authRouter.post('/login', authLimiter, async (req, res) => {
  const input = loginSchema.parse(req.body);
  res.json(await authService.login(input));
});

authRouter.get('/me', authenticate, async (req, res) => {
  const user = await userIdentityRepository.findById(getAuth(req).userId.toString());
  if (!user) throw AppError.unauthorized();
  res.json({ user: await authService.me(user) });
});
