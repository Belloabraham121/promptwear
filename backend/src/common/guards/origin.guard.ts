import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ErrorCodes } from '../constants/error-codes';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AppException } from '../exceptions/app.exception';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Replaces CsrfGuard (Goal 1 cutover).
 *
 * The custom `X-CSRF-Token` dance is gone with Better Auth. Mutations are
 * instead protected by verifying the request Origin/Referer against the
 * configured app origin — the standard stateless CSRF defense, and the same
 * check Better Auth applies to its own routes. Requests without an Origin
 * (curl, server-to-server, mobile) are allowed through.
 */
@Injectable()
export class OriginGuard implements CanActivate {
  private readonly allowedOrigins: string[];

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    this.allowedOrigins = this.configService
      .getOrThrow<string[]>('allowedOrigins')
      .map((origin) => new URL(origin).origin);
  }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    if (SAFE_METHODS.has(request.method)) {
      return true;
    }

    const origin =
      request.headers.origin ?? request.headers.referer ?? undefined;

    if (!origin) {
      return true;
    }

    let requestOrigin: string;
    try {
      requestOrigin = new URL(origin).origin;
    } catch {
      throw new AppException(
        ErrorCodes.CSRF_INVALID,
        'Invalid request origin',
        HttpStatus.FORBIDDEN,
      );
    }

    if (!this.allowedOrigins.includes(requestOrigin)) {
      throw new AppException(
        ErrorCodes.CSRF_INVALID,
        'Cross-origin request rejected',
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
