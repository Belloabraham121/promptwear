import { IsDateString, Matches } from 'class-validator';
import { DATE_KEY_PATTERN } from '../analytics.utils';

export class RevenueQueryDto {
  @IsDateString()
  @Matches(DATE_KEY_PATTERN, {
    message: 'from must be an ISO date (YYYY-MM-DD)',
  })
  from!: string;

  @IsDateString()
  @Matches(DATE_KEY_PATTERN, {
    message: 'to must be an ISO date (YYYY-MM-DD)',
  })
  to!: string;
}
