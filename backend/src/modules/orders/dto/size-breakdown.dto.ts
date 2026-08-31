import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class SizeBreakdownDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  S?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  M?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  L?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  XL?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  XXL?: number = 0;
}
