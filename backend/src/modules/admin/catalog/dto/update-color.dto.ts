import { IsBoolean, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class UpdateColorDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  hex?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
