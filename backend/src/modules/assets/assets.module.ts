import { Module } from '@nestjs/common';
import { OwnershipGuard } from '../../common/guards/ownership.guard';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { StorageService } from './storage.service';

@Module({
  controllers: [AssetsController],
  providers: [AssetsService, StorageService, OwnershipGuard],
  exports: [AssetsService, StorageService],
})
export class AssetsModule {}
