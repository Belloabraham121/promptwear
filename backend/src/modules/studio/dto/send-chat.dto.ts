import { IsString, MaxLength, MinLength } from 'class-validator';

export class SendChatDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10_000)
  text!: string;
}
