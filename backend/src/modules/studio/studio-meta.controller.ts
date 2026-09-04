import { Controller, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ChatService } from './chat.service';
import { GenerateService } from './generate.service';

@Controller('studio')
export class StudioMetaController {
  constructor(
    private readonly chatService: ChatService,
    private readonly generateService: GenerateService,
  ) {}

  @Get('models')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  listModels() {
    return this.chatService.listModels();
  }

  @Get('image-options')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  listImageOptions() {
    return this.generateService.listImageOptions();
  }
}
