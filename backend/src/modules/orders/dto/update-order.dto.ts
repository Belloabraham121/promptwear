import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
