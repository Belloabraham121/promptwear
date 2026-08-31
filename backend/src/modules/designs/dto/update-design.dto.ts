import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  DesignMethod,
  DesignStatus,
  PanelJson,
  PatternPanel,
  StudioBackground,
} from '../design.types';

class DesignChatMessageDto {
  @IsEnum(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @MinLength(1)
  @MaxLength(10_000)
  text!: string;

  @IsString()
  at!: string;
}

export class UpdateDesignDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  prompt?: string;

  @IsOptional()
  @IsEnum(['prompt', 'draw', 'hybrid'])
  method?: DesignMethod;

  @IsOptional()
  @IsEnum(['ink', 'bone', 'white', 'grid'])
  background?: StudioBackground;

  @IsOptional()
  @IsEnum(['draft', 'saved', 'ordered'])
  status?: DesignStatus;

  @IsOptional()
  @IsEnum(['classic', 'oversized'])
  garmentId?: 'classic' | 'oversized';

  @IsOptional()
  @IsEnum(['front', 'back', 'sleeveL', 'sleeveR', 'collar'])
  activePanel?: PatternPanel;

  @IsOptional()
  @IsObject()
  panels?: Partial<Record<PatternPanel, PanelJson>>;

  @IsOptional()
  @IsString()
  thumbnailAssetId?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DesignChatMessageDto)
  chat?: DesignChatMessageDto[];
}
