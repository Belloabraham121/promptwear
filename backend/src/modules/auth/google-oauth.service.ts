import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { ErrorCodes } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AuthService, TokenPair } from './auth.service';
import { SafeUser } from '../users/user.mapper';

const STATE_TTL_SECONDS = 600;
const STATE_COOKIE = 'oauth_google_state';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  id_token?: string;
};

type GoogleUserInfo = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  picture?: string;
};

@Injectable()
export class GoogleOAuthService {
  private readonly logger = new Logger(GoogleOAuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  isConfigured(): boolean {
    return Boolean(
      this.configService.get<string>('google.clientId') &&
        this.configService.get<string>('google.clientSecret') &&
        this.configService.get<string>('google.callbackUrl'),
    );
  }

  getStateCookieName(): string {
    return STATE_COOKIE;
  }

  async beginAuth(): Promise<{ redirectUrl: string; state: string }> {
    if (!this.isConfigured()) {
      throw new AppException(
        ErrorCodes.SERVICE_UNAVAILABLE,
        'Google sign-in is not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const state = randomBytes(24).toString('hex');
    await this.redisService.connect();
    await this.redisService.client.setex(
      this.stateKey(state),
      STATE_TTL_SECONDS,
      '1',
    );

    const params = new URLSearchParams({
      client_id: this.configService.getOrThrow<string>('google.clientId'),
      redirect_uri: this.configService.getOrThrow<string>('google.callbackUrl'),
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account',
    });

    return {
      redirectUrl: `${GOOGLE_AUTH_URL}?${params.toString()}`,
      state,
    };
  }

  async completeAuth(
    code: string | undefined,
    state: string | undefined,
    cookieState: string | undefined,
  ): Promise<{ user: SafeUser; tokens: TokenPair }> {
    if (!this.isConfigured()) {
      throw new AppException(
        ErrorCodes.SERVICE_UNAVAILABLE,
        'Google sign-in is not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (!code || !state || !cookieState || state !== cookieState) {
      throw new AppException(
        ErrorCodes.UNAUTHORIZED,
        'Invalid Google OAuth state',
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.redisService.connect();
    const stored = await this.redisService.client.get(this.stateKey(state));
    await this.redisService.client.del(this.stateKey(state));

    if (!stored) {
      throw new AppException(
        ErrorCodes.UNAUTHORIZED,
        'Google OAuth state expired or already used',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const tokensFromGoogle = await this.exchangeCode(code);
    const profile = await this.fetchUserInfo(tokensFromGoogle.access_token);

    if (!profile.sub) {
      throw new AppException(
        ErrorCodes.UNAUTHORIZED,
        'Google did not return a user id',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!profile.email || profile.email_verified === false) {
      throw new AppException(
        ErrorCodes.UNAUTHORIZED,
        'A verified Google email is required',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const user = await this.authService.loginOrRegisterWithGoogle({
      googleId: profile.sub,
      email: profile.email,
      name: profile.name?.trim() || profile.given_name?.trim() || 'Creator',
    });

    return user;
  }

  private stateKey(state: string): string {
    const hash = createHash('sha256').update(state).digest('hex');
    return `oauth:google:state:${hash}`;
  }

  private async exchangeCode(code: string): Promise<GoogleTokenResponse> {
    const body = new URLSearchParams({
      code,
      client_id: this.configService.getOrThrow<string>('google.clientId'),
      client_secret: this.configService.getOrThrow<string>('google.clientSecret'),
      redirect_uri: this.configService.getOrThrow<string>('google.callbackUrl'),
      grant_type: 'authorization_code',
    });

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      this.logger.warn(`Google token exchange failed: ${response.status}`);
      throw new AppException(
        ErrorCodes.UNAUTHORIZED,
        'Google authentication failed',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return (await response.json()) as GoogleTokenResponse;
  }

  private async fetchUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      this.logger.warn(`Google userinfo failed: ${response.status}`);
      throw new AppException(
        ErrorCodes.UNAUTHORIZED,
        'Google authentication failed',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return (await response.json()) as GoogleUserInfo;
  }
}
