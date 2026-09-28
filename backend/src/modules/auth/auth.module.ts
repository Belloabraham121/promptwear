import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';

/**
 * Auth module post-cutover (Goal 1): the only surface is the Better Auth
 * catch-all controller. Legacy services (AuthService, PasswordService,
 * GoogleOAuthService, AuthCookieService) were deleted — Better Auth owns
 * credentials, sessions, OAuth and account linking now.
 */
@Module({
  controllers: [AuthController],
})
export class AuthModule {}
