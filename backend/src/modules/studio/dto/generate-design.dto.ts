import { IsEnum, IsOptional } from 'class-validator';
import { PatternPanel } from '../../designs/design.types';

export class GenerateDesignDto {
  @IsOptional()
  @IsEnum(['front', 'back', 'sleeveL', 'sleeveR', 'collar'])
  panel?: PatternPanel;
}
