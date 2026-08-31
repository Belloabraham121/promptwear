import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
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

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authCookieService: AuthCookieService,
  ) {}

  @Public()
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
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
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
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
  @Throttle({ auth: { limit: 5, ttl: 60_000 } })
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
}
