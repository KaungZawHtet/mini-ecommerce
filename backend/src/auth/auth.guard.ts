import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { SESSION_COOKIE_NAME } from './constants';
import { AuthenticatedRequest } from './types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

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

      if (error instanceof UnauthorizedException) {
        throw error;
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
