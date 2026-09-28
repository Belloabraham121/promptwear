import { All, Controller, Req, Res } from '@nestjs/common';
import { toNodeHandler } from 'better-auth/node';
import { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { auth } from '../../lib/auth';

/**
 * Better Auth mount (Goal 1 cutover).
 *
 * Every `/api/v1/auth/*` request is delegated to the Better Auth handler:
 * sign-up/sign-in (email + Google), session, password reset, org endpoints.
 * The legacy Nest auth controller (JWT cookies, manual Google OAuth) is gone;
 * Better Auth owns account linking, so one verified email = one user.
 */
@Public()
@Controller('auth')
export class AuthController {
  private readonly handleAuth = toNodeHandler(auth);

  @All('*')
  async handle(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.handleAuth(req, res);
  }
}
