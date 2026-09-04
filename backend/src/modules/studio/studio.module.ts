import { Module } from '@nestjs/common';
import { OwnershipGuard } from '../../common/guards/ownership.guard';
import { AssetsModule } from '../assets/assets.module';
import { ChatService } from './chat.service';
import { GenerateService } from './generate.service';
import { StudioController } from './studio.controller';
import { StudioMetaController } from './studio-meta.controller';

@Module({
  imports: [AssetsModule],
  controllers: [StudioMetaController, StudioController],
  providers: [ChatService, GenerateService, OwnershipGuard],
  exports: [ChatService, GenerateService],
})
export class StudioModule {}
