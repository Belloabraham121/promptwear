import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class ListOrdersDto extends PaginationDto {
  @IsOptional()
  @IsEnum([
    'draft',
    'quoted',
    'order_received',
    'design_confirmed',
    'production_assigned',
    'printing',
    'quality_check',
    'packaging',
    'shipped',
    'delivered',
    'cancelled',
    'refunded',
  ])
  status?:
    | 'draft'
    | 'quoted'
    | 'order_received'
    | 'design_confirmed'
    | 'production_assigned'
    | 'printing'
    | 'quality_check'
    | 'packaging'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
    | 'refunded';
}
