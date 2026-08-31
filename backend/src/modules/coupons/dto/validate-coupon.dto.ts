import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ValidateCouponDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  orderTotal?: string;
}
