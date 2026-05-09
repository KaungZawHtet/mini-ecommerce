import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { SESSION_COOKIE_NAME } from './constants';
import { AuthenticatedRequest } from './types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  /**
   * Protects routes that require an authenticated session.
   *
   * The guard reads the session token from the request cookies, validates it
   * through AuthService, and attaches the authenticated user/session to the
   * request so controllers can safely use them.
   *
   * If the session is missing, expired, revoked, or inactive for too long,
   * the request is rejected and any stale session cookie is cleared.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const response = http.getResponse<Response>();
    const sessionTokens = this.getSessionTokens(request);

    try {
      const authContext =
        await this.authService.validateSessionTokens(sessionTokens);

      request.user = authContext.user;
      request.session = authContext.session;

      return true;
    } catch (error) {
      if (sessionTokens.length > 0) {
        this.authService.clearSessionCookie(response);
      }

      throw error;
    }
  }

  private getSessionTokens(request: AuthenticatedRequest) {
    const tokens = new Set<string>();
    const cookies = request.cookies as Record<string, string | undefined>;
    const parsedToken = cookies[SESSION_COOKIE_NAME];

    if (parsedToken) {
      tokens.add(parsedToken);
    }

    for (const cookiePart of request.headers.cookie?.split(';') ?? []) {
      const [name, ...valueParts] = cookiePart.trim().split('=');

      if (name !== SESSION_COOKIE_NAME || valueParts.length === 0) {
        continue;
      }

      const value = valueParts.join('=');

      if (value) {
        tokens.add(value);
      }
    }

    return [...tokens];
  }
}
