import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateMaterialDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  gsm?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  composition?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  costPerUnit?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
