import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { fromNodeHeaders } from 'better-auth/node';
import { Request } from 'express';
import { auth } from '../../lib/auth';
import { ErrorCodes } from '../constants/error-codes';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AppException } from '../exceptions/app.exception';
import { RequestUser } from '../types/request-user.type';

interface SessionUser {
  id: string;
  email: string;
  role?: unknown;
}

/**
 * Replaces JwtAuthGuard (Goal 1 cutover).
 *
 * Validates the Better Auth session cookie via `auth.api.getSession` and
 * exposes the same `RequestUser` shape (`sub/email/role`) so `CurrentUser`,
 * `RolesGuard` and `OwnershipGuard` keep working unchanged.
 */
@Injectable()
export class BetterAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: RequestUser }>();

    let user: SessionUser | null = null;
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });
      user = (session?.user as unknown as SessionUser | undefined) ?? null;
    } catch {
      user = null;
    }

    if (!user) {
      throw new AppException(
        ErrorCodes.UNAUTHORIZED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
      );
    }

    request.user = {
      sub: user.id,
      email: user.email,
      role: user.role === 'admin' ? 'admin' : 'customer',
    };
    return true;
  }
}
