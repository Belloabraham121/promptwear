import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  DEFAULT_STUDIO_AI_MODEL,
  STUDIO_AI_MODELS,
} from '../openai-models';

const ALLOWED_MODEL_IDS = STUDIO_AI_MODELS.map((m) => m.id);

export class SendChatDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10_000)
  text!: string;

  @IsOptional()
  @IsString()
  @IsIn(ALLOWED_MODEL_IDS)
  model?: string = DEFAULT_STUDIO_AI_MODEL;

  /** When true, also enqueue gpt-image-1 for the active panel. */
  @IsOptional()
  @IsBoolean()
  generateImage?: boolean;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  quality?: 'low' | 'medium' | 'high';

  @IsOptional()
  @IsEnum(['1024x1024', '1024x1536', '1536x1024'])
  size?: '1024x1024' | '1024x1536' | '1536x1024';
}
