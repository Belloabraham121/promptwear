import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { Request } from 'express';
import { ErrorCodes } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import { RequestUser } from '../../common/types/request-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { toSafeUser, SafeUser } from '../users/user.mapper';
import { AuthCookieService } from './auth-cookie.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PasswordService } from './password.service';

interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: 'refresh';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly passwordService: PasswordService,
    private readonly authCookieService: AuthCookieService,
  ) {}

  async register(dto: RegisterDto): Promise<SafeUser> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new AppException(
        ErrorCodes.CONFLICT,
        'Unable to create account with these credentials',
        HttpStatus.CONFLICT,
      );
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        name: dto.name.trim(),
        passwordHash,
      },
    });

    return toSafeUser(user);
  }

  async login(dto: LoginDto): Promise<{ user: SafeUser; tokens: TokenPair }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user?.passwordHash) {
      throw new AppException(
        ErrorCodes.UNAUTHORIZED,
        'Invalid email or password',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const valid = await this.passwordService.verify(
      dto.password,
      user.passwordHash,
    );

    if (!valid) {
      throw new AppException(
        ErrorCodes.UNAUTHORIZED,
        'Invalid email or password',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const tokens = await this.issueTokens(user);
    return { user: toSafeUser(user), tokens };
  }

  async registerAndIssueTokens(
    dto: RegisterDto,
  ): Promise<{ user: SafeUser; tokens: TokenPair }> {
    const user = await this.register(dto);
    const dbUser = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    const tokens = await this.issueTokens(dbUser);
    return { user, tokens };
  }

  async logout(request: Request): Promise<void> {
    const refreshToken = request.cookies?.refresh_token as string | undefined;

    if (refreshToken) {
      try {
        const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
          refreshToken,
        );

        if (payload.type === 'refresh' && payload.jti) {
          await this.denylistRefreshToken(payload.jti);
          await this.prisma.refreshToken.deleteMany({
            where: { jti: payload.jti },
          });
        }
      } catch {
        // Ignore invalid refresh tokens during logout.
      }
    }
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: RefreshTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
      );
    } catch {
      throw new AppException(
        ErrorCodes.UNAUTHORIZED,
        'Invalid or expired refresh token',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (payload.type !== 'refresh' || !payload.jti || !payload.sub) {
      throw new AppException(
        ErrorCodes.UNAUTHORIZED,
        'Invalid refresh token',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (await this.isRefreshTokenDenied(payload.jti)) {
      throw new AppException(
        ErrorCodes.UNAUTHORIZED,
        'Refresh token has been revoked',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { jti: payload.jti },
    });

    if (!stored || stored.tokenHash !== tokenHash) {
      throw new AppException(
        ErrorCodes.UNAUTHORIZED,
        'Invalid refresh token',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (stored.expiresAt <= new Date()) {
      await this.prisma.refreshToken.delete({ where: { jti: payload.jti } });
      throw new AppException(
        ErrorCodes.UNAUTHORIZED,
        'Refresh token expired',
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.prisma.refreshToken.delete({ where: { jti: payload.jti } });
    await this.denylistRefreshToken(payload.jti);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new AppException(
        ErrorCodes.UNAUTHORIZED,
        'User not found',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.issueTokens(user);
  }

  async getSession(userId: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppException(
        ErrorCodes.UNAUTHORIZED,
        'User not found',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return toSafeUser(user);
  }

  issueCsrfToken(): string {
    return randomBytes(32).toString('hex');
  }

  toRequestUser(user: User): RequestUser {
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
  }

  private async issueTokens(user: User): Promise<TokenPair> {
    const accessToken = await this.jwtService.signAsync(
      this.toRequestUser(user),
    );

    const jti = randomBytes(16).toString('hex');
    const refreshTtl = this.configService.getOrThrow<string>('jwt.refreshTtl');
    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        jti,
        type: 'refresh',
      } satisfies RefreshTokenPayload,
      { expiresIn: refreshTtl },
    );

    const expiresAt = new Date(
      Date.now() + this.authCookieService.getRefreshTtlSeconds() * 1_000,
    );

    await this.prisma.refreshToken.create({
      data: {
        jti,
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private denylistKey(jti: string): string {
    return `rt:deny:${jti}`;
  }

  private async denylistRefreshToken(jti: string): Promise<void> {
    await this.redisService.connect();
    const ttl = this.authCookieService.getRefreshTtlSeconds();
    await this.redisService.client.setex(this.denylistKey(jti), ttl, '1');
  }

  private async isRefreshTokenDenied(jti: string): Promise<boolean> {
    await this.redisService.connect();
    const result = await this.redisService.client.get(this.denylistKey(jti));
    return result !== null;
  }
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
