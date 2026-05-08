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
    const cookies = request.cookies as Record<string, string | undefined>;

    try {
      const authContext = await this.authService.validateSessionToken(
        cookies[SESSION_COOKIE_NAME],
      );

      request.user = authContext.user;
      request.session = authContext.session;

      return true;
    } catch (error) {
      this.authService.clearSessionCookie(response);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw error;
    }
  }
}
