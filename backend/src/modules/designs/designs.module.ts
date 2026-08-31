import { Module } from '@nestjs/common';
import { OwnershipGuard } from '../../common/guards/ownership.guard';
import { DesignsController } from './designs.controller';
import { DesignsService } from './designs.service';

@Module({
  controllers: [DesignsController],
  providers: [DesignsService, OwnershipGuard],
  exports: [DesignsService],
})
export class DesignsModule {}
