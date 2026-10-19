import { Router } from 'express';
import { getAuth } from '../../shared/auth-context';
import { authenticate, requireRole } from '../../shared/middleware/authenticate';
import { createUserSchema } from '../auth/auth.schemas';
import { UserService } from './user.service';

export const userRouter = Router();

// Gestão de equipe é só para admin
userRouter.use(authenticate, requireRole('admin'));

userRouter.get('/', async (req, res) => {
  const users = await new UserService(getAuth(req).companyId).list();
  res.json({ items: users });
});

userRouter.post('/', async (req, res) => {
  const input = createUserSchema.parse(req.body);
  const user = await new UserService(getAuth(req).companyId).create(input);
  res.status(201).json({ user });
});
