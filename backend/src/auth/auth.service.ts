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
  private readonly dummyPasswordHash =
    '$2b$12$somePrecomputedValidBcryptHashHere'; // In production, we may use a securely generated hash of a random password or may even stored at more secure place like environment variable or secret manager
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async login(loginDto: LoginDto, response: Response) {
    const email = loginDto.email.toLowerCase();
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      await bcrypt.compare(loginDto.password, this.dummyPasswordHash);
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
      await this.recordFailedLogin(user.id);
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

  /**
 * Validates one or more possible session tokens from the request cookies.
 * Multiple tokens are supported defensively because browsers may send
 * duplicate cookies for different paths/domains.

 */
  async validateSessionTokens(rawTokens: readonly string[]) {
    if (rawTokens.length === 0) {
      throw new UnauthorizedException();
    }

    /**
     * If there are multiple session_token cookies, try each one.
     * If one is valid, accept it.
     * If all are invalid, reject.
     * */
    for (const rawToken of rawTokens) {
      try {
        return await this.validateSessionToken(rawToken);
      } catch (error) {
        if (error instanceof UnauthorizedException) {
          continue;
        }

        throw error;
      }
    }

    throw new UnauthorizedException();
  }

  private async validateSessionToken(rawToken: string) {
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
      throw new UnauthorizedException(); //throw because Session expired due to inactivity
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

  /**
 * Records a failed login attempt and locks the account temporarily once
 * the configured threshold is reached.

 */
  private async recordFailedLogin(userId: string) {
    const user = await this.usersService.incrementFailedLoginAttempts(userId);

    if (user.failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      await this.usersService.setLoginLockout(
        userId,
        new Date(Date.now() + LOGIN_LOCKOUT_MS),
      );
    }
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
