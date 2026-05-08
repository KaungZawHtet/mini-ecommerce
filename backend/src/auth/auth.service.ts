import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { Session } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { AuthenticatedUser } from './types';
import {
  GENERIC_LOGIN_ERROR,
  LOGIN_LOCKOUT_MS,
  MAX_FAILED_LOGIN_ATTEMPTS,
  SESSION_COOKIE_NAME,
  SESSION_INACTIVITY_TIMEOUT_MS,
  SESSION_MAX_AGE_MS,
} from './constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async login(loginDto: LoginDto, response: Response) {
    const email = loginDto.email.toLowerCase();
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      await bcrypt.compare(loginDto.password, await bcrypt.hash('invalid', 12));
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    const isValidPassword = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isValidPassword) {
      await this.recordFailedLogin(user.id, user.failedLoginAttempts);
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    await this.usersService.resetFailedLoginAttempts(user.id);

    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_MS);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        lastActivityAt: now,
        expiresAt,
      },
    });

    this.setSessionCookie(response, rawToken);

    return {
      user: this.toAuthenticatedUser(user),
    };
  }

  async logout(session: Session, response: Response) {
    await this.revokeSession(session.id);
    this.clearSessionCookie(response);

    return { success: true };
  }

  async validateSessionToken(rawToken: string | undefined) {
    if (!rawToken) {
      throw new UnauthorizedException();
    }

    const tokenHash = this.hashToken(rawToken);
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session || session.revokedAt) {
      throw new UnauthorizedException();
    }

    const now = Date.now();

    if (session.expiresAt.getTime() <= now) {
      await this.revokeSession(session.id);
      throw new UnauthorizedException();
    }

    if (
      now - session.lastActivityAt.getTime() >
      SESSION_INACTIVITY_TIMEOUT_MS
    ) {
      await this.revokeSession(session.id);
      throw new UnauthorizedException('Session expired due to inactivity');
    }

    const updatedSession = await this.prisma.session.update({
      where: { id: session.id },
      data: { lastActivityAt: new Date(now) },
    });

    return {
      session: updatedSession,
      user: this.toAuthenticatedUser(session.user),
    };
  }

  setSessionCookie(response: Response, token: string) {
    response.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE_MS,
      path: '/',
    });
  }

  clearSessionCookie(response: Response) {
    response.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async revokeSession(sessionId: string) {
    await this.prisma.session.updateMany({
      where: {
        id: sessionId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  private async recordFailedLogin(
    userId: string,
    currentFailedAttempts: number,
  ) {
    const failedLoginAttempts = currentFailedAttempts + 1;
    const lockedUntil =
      failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS
        ? new Date(Date.now() + LOGIN_LOCKOUT_MS)
        : null;

    await this.usersService.incrementFailedLoginAttempts(
      userId,
      failedLoginAttempts,
      lockedUntil,
    );
  }

  private toAuthenticatedUser(user: {
    id: string;
    email: string;
    createdAt: Date;
  }): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    };
  }
}
