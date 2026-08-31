import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SizeBreakdownDto } from './size-breakdown.dto';

export class CreateQuoteDto {
  @IsEnum(['standard', 'premium', 'heavy'])
  quality!: 'standard' | 'premium' | 'heavy';

  @IsEnum(['dtf', 'screen'])
  print!: 'dtf' | 'screen';

  @ValidateNested()
  @Type(() => SizeBreakdownDto)
  sizes!: SizeBreakdownDto;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  deliveryCity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  deliveryState?: string;

  @IsOptional()
  @IsBoolean()
  rush?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  couponCode?: string;
}
