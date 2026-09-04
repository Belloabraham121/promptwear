import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthCookieService } from './auth-cookie.service';
import { AuthService } from './auth.service';
import { GoogleOAuthService } from './google-oauth.service';
import { PasswordService } from './password.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthCookieService,
    PasswordService,
    GoogleOAuthService,
  ],
  exports: [AuthService, PasswordService],
})
export class AuthModule {}
