import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Response } from 'express';

const AUTH_PREFIX = '/api/v1/auth';

function parseDurationToMs(duration: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(duration.trim());
  if (!match) {
    throw new Error(`Invalid duration: ${duration}`);
  }

  const value = Number.parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1_000;
    case 'm':
      return value * 60_000;
    case 'h':
      return value * 3_600_000;
    case 'd':
      return value * 86_400_000;
    default:
      throw new Error(`Invalid duration unit: ${unit}`);
  }
}

function parseDurationToSeconds(duration: string): number {
  return Math.ceil(parseDurationToMs(duration) / 1_000);
}

@Injectable()
export class AuthCookieService {
  private readonly isProduction: boolean;
  private readonly accessTtlMs: number;
  private readonly refreshTtlMs: number;

  constructor(private readonly configService: ConfigService) {
    this.isProduction =
      this.configService.get<string>('nodeEnv') === 'production';
    this.accessTtlMs = parseDurationToMs(
      this.configService.getOrThrow<string>('jwt.accessTtl'),
    );
    this.refreshTtlMs = parseDurationToMs(
      this.configService.getOrThrow<string>('jwt.refreshTtl'),
    );
  }

  getRefreshTtlSeconds(): number {
    return parseDurationToSeconds(
      this.configService.getOrThrow<string>('jwt.refreshTtl'),
    );
  }

  private baseCookieOptions(maxAge: number): CookieOptions {
    // Cross-origin frontends (e.g. Vercel HTTPS → Coolify API) need SameSite=None
    // + Secure so credentialed fetch can send cookies.
    return {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: this.isProduction ? 'none' : 'lax',
      maxAge,
    };
  }

  setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    res.cookie('access_token', accessToken, {
      ...this.baseCookieOptions(this.accessTtlMs),
      path: '/',
    });

    res.cookie('refresh_token', refreshToken, {
      ...this.baseCookieOptions(this.refreshTtlMs),
      path: AUTH_PREFIX,
    });
  }

  setCsrfCookie(res: Response, token: string): void {
    res.cookie('csrf_token', token, {
      httpOnly: false,
      secure: this.isProduction,
      sameSite: this.isProduction ? 'none' : 'lax',
      path: '/',
      maxAge: this.accessTtlMs,
    });
  }

  clearAuthCookies(res: Response): void {
    const clearOptions: CookieOptions = {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: this.isProduction ? 'none' : 'lax',
    };

    res.clearCookie('access_token', { ...clearOptions, path: '/' });
    res.clearCookie('refresh_token', { ...clearOptions, path: AUTH_PREFIX });
    res.clearCookie('csrf_token', {
      httpOnly: false,
      secure: this.isProduction,
      sameSite: this.isProduction ? 'none' : 'lax',
      path: '/',
    });
  }
}
