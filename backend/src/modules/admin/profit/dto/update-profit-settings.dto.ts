import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateProfitSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  defaultMarginPct?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  rushMarginPct?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minMarginPct?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  maxMarginPct?: number;

  @IsOptional()
  @IsEnum(['lowest_cost', 'highest_quality', 'fastest_delivery'])
  selectionStrategy?: 'lowest_cost' | 'highest_quality' | 'fastest_delivery';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludedVendorIds?: string[];

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  overrideVendorId?: string | null;
}
