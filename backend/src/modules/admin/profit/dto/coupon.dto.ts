import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCouponDto {
  @IsString()
  @MinLength(1)
  code!: string;

  @IsEnum(['percent', 'flat'])
  type!: 'percent' | 'flat';

  @IsNumber()
  @Min(0)
  value!: number;

  @IsInt()
  @Min(1)
  maxRedemptions!: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsDateString()
  expiresAt!: string;
}

export class UpdateCouponDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  code?: string;

  @IsOptional()
  @IsEnum(['percent', 'flat'])
  type?: 'percent' | 'flat';

  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptions?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
