import { Module } from '@nestjs/common';
import { OwnershipGuard } from '../../common/guards/ownership.guard';
import { ChatService } from './chat.service';
import { GenerateService } from './generate.service';
import { StudioController } from './studio.controller';

@Module({
  controllers: [StudioController],
  providers: [ChatService, GenerateService, OwnershipGuard],
  exports: [ChatService, GenerateService],
})
export class StudioModule {}
