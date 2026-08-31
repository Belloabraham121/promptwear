import { IsEnum } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsEnum([
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
  status!:
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
