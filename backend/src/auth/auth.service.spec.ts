import { Response } from 'express';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import {
  GENERIC_LOGIN_ERROR,
  LOGIN_LOCKOUT_MS,
  SESSION_COOKIE_NAME,
} from './constants';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const prisma = {
    session: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const usersService = {
    findByEmail: jest.fn(),
    incrementFailedLoginAttempts: jest.fn(),
    resetFailedLoginAttempts: jest.fn(),
    setLoginLockout: jest.fn(),
  };
  const response = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      prisma as unknown as PrismaService,
      usersService as unknown as UsersService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stores only the hashed session token when login succeeds', async () => {
    const user = await makeUser({ password: 'Password123!' });
    usersService.findByEmail.mockResolvedValue(user);
    usersService.resetFailedLoginAttempts.mockResolvedValue({
      ...user,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
    prisma.session.create.mockResolvedValue({});

    await expect(
      service.login(
        { email: 'demo@example.com', password: 'Password123!' },
        response as unknown as Response,
      ),
    ).resolves.toEqual({
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
    });

    const [, rawToken] = response.cookie.mock.calls[0] as [string, string];
    const sessionCreateCalls = prisma.session.create.mock.calls as [
      [{ data: { tokenHash: string } }],
    ];
    const sessionCreateArgs = sessionCreateCalls[0][0];

    expect(response.cookie).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
      }),
    );
    expect(sessionCreateArgs.data.tokenHash).not.toBe(rawToken);
    expect(sessionCreateArgs.data.tokenHash).toBe(
      createHash('sha256').update(rawToken).digest('hex'),
    );
  });

  it('increments failed logins atomically and locks after the fifth failure', async () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    const user = await makeUser({
      password: 'Password123!',
      failedLoginAttempts: 4,
    });
    usersService.findByEmail.mockResolvedValue(user);
    usersService.incrementFailedLoginAttempts.mockResolvedValue({
      ...user,
      failedLoginAttempts: 5,
    });

    await expect(
      service.login(
        { email: 'demo@example.com', password: 'wrong-password' },
        response as unknown as Response,
      ),
    ).rejects.toThrow(GENERIC_LOGIN_ERROR);

    expect(usersService.incrementFailedLoginAttempts).toHaveBeenCalledWith(
      user.id,
    );
    expect(usersService.setLoginLockout).toHaveBeenCalledWith(
      user.id,
      new Date(now + LOGIN_LOCKOUT_MS),
    );
    expect(usersService.resetFailedLoginAttempts).not.toHaveBeenCalled();
    expect(prisma.session.create).not.toHaveBeenCalled();
    expect(response.cookie).not.toHaveBeenCalled();
  });
});

async function makeUser({
  password,
  failedLoginAttempts = 0,
}: {
  password: string;
  failedLoginAttempts?: number;
}): Promise<User> {
  const now = new Date('2026-01-01T00:00:00.000Z');

  return {
    id: 'user-1',
    email: 'demo@example.com',
    passwordHash: await bcrypt.hash(password, 4),
    failedLoginAttempts,
    lockedUntil: null,
    createdAt: now,
    updatedAt: now,
  };
}
