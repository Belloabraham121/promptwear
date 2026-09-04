import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ErrorCodes } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import { RequestUser } from '../../common/types/request-user.type';
import { AuthCookieService } from './auth-cookie.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleOAuthService } from './google-oauth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authCookieService: AuthCookieService,
    private readonly googleOAuthService: GoogleOAuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authService.registerAndIssueTokens(dto);
    this.authCookieService.setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken,
    );
    return user;
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authService.login(dto);
    this.authCookieService.setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken,
    );
    return user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(req);
    this.authCookieService.clearAuthCookies(res);
    return { ok: true };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token as string | undefined;

    if (!refreshToken) {
      throw new AppException(
        ErrorCodes.UNAUTHORIZED,
        'Refresh token required',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const tokens = await this.authService.refresh(refreshToken);
    this.authCookieService.setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken,
    );
    return { ok: true };
  }

  @Get('session')
  getSession(@CurrentUser() user: RequestUser) {
    return this.authService.getSession(user.sub);
  }

  @Public()
  @Get('csrf')
  issueCsrf(@Res({ passthrough: true }) res: Response) {
    const token = this.authService.issueCsrfToken();
    this.authCookieService.setCsrfCookie(res, token);
    return { token };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Get('google')
  async googleStart(@Res() res: Response) {
    const { redirectUrl, state } = await this.googleOAuthService.beginAuth();
    const isProduction =
      this.configService.get<string>('nodeEnv') === 'production';

    res.cookie(this.googleOAuthService.getStateCookieName(), state, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/api/v1/auth',
      maxAge: 10 * 60 * 1000,
    });

    return res.redirect(redirectUrl);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') oauthError: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const appUrl = this.configService.getOrThrow<string>('appUrl');
    const isProduction =
      this.configService.get<string>('nodeEnv') === 'production';

    const clearStateCookie = () => {
      res.clearCookie(this.googleOAuthService.getStateCookieName(), {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/api/v1/auth',
      });
    };

    if (oauthError) {
      clearStateCookie();
      return res.redirect(
        `${appUrl}/login?error=${encodeURIComponent('Google sign-in was cancelled')}`,
      );
    }

    try {
      const cookieState = req.cookies?.[
        this.googleOAuthService.getStateCookieName()
      ] as string | undefined;

      const { tokens } = await this.googleOAuthService.completeAuth(
        code,
        state,
        cookieState,
      );

      this.authCookieService.setAuthCookies(
        res,
        tokens.accessToken,
        tokens.refreshToken,
      );

      const csrf = this.authService.issueCsrfToken();
      this.authCookieService.setCsrfCookie(res, csrf);
      clearStateCookie();

      return res.redirect(`${appUrl}/dashboard`);
    } catch (error) {
      clearStateCookie();
      const message =
        error instanceof AppException
          ? (() => {
              const response = error.getResponse();
              if (
                typeof response === 'object' &&
                response !== null &&
                'message' in response &&
                typeof (response as { message: unknown }).message === 'string'
              ) {
                return (response as { message: string }).message;
              }
              return error.message;
            })()
          : 'Google sign-in failed';
      return res.redirect(
        `${appUrl}/login?error=${encodeURIComponent(message)}`,
      );
    }
  }
}
