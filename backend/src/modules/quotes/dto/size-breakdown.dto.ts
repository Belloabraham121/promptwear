import { IsInt, Min } from 'class-validator';

export class SizeBreakdownDto {
  @IsInt()
  @Min(0)
  S!: number;

  @IsInt()
  @Min(0)
  M!: number;

  @IsInt()
  @Min(0)
  L!: number;

  @IsInt()
  @Min(0)
  XL!: number;

  @IsInt()
  @Min(0)
  XXL!: number;
}
