import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateDiscountDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEnum(['percent', 'flat'])
  type!: 'percent' | 'flat';

  @IsNumber()
  @Min(0)
  value!: number;

  @IsInt()
  @Min(1)
  minQty!: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateDiscountDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

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
  minQty?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
