import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;

  /** Which portal is signing in. Keeps admin and creator emails from sharing sessions. */
  @IsOptional()
  @IsIn(['creator', 'admin'])
  portal?: 'creator' | 'admin';
}
