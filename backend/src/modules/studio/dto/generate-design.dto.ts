import { IsEnum, IsOptional } from 'class-validator';
import { PatternPanel } from '../../designs/design.types';

export class GenerateDesignDto {
  @IsOptional()
  @IsEnum(['front', 'back', 'sleeveL', 'sleeveR', 'collar'])
  panel?: PatternPanel;

  /** gpt-image-1 render fidelity — higher = sharper design on the piece. */
  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  quality?: 'low' | 'medium' | 'high';

  @IsOptional()
  @IsEnum(['1024x1024', '1024x1536', '1536x1024'])
  size?: '1024x1024' | '1024x1536' | '1536x1024';
}
