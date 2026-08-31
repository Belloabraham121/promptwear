import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class CompleteAssetDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50 * 1024 * 1024)
  sizeBytes?: number;
}
