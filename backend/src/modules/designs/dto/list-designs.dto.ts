import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DesignStatus } from '../design.types';

export class ListDesignsDto extends PaginationDto {
  @IsOptional()
  @IsEnum(['draft', 'saved', 'ordered'])
  status?: DesignStatus;
}
