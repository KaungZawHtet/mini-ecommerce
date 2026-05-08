import { Request } from 'express';
import { Session, User } from '@prisma/client';

export type AuthenticatedUser = Pick<User, 'id' | 'email' | 'createdAt'>;

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
  session: Session;
};
