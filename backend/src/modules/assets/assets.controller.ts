import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CheckOwnership } from '../../common/decorators/ownership.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OwnershipGuard } from '../../common/guards/ownership.guard';
import { RequestUser } from '../../common/types/request-user.type';
import { AssetsService } from './assets.service';
import { CompleteAssetDto } from './dto/complete-asset.dto';
import { PresignAssetDto } from './dto/presign-asset.dto';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query('designId') designId?: string,
  ) {
    return this.assetsService.list(user.sub, designId);
  }

  @Post('presign')
  presign(@CurrentUser() user: RequestUser, @Body() dto: PresignAssetDto) {
    return this.assetsService.presign(user.sub, dto);
  }

  @Post(':id/complete')
  @UseGuards(OwnershipGuard)
  @CheckOwnership({ resource: 'asset' })
  complete(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: CompleteAssetDto,
  ) {
    return this.assetsService.complete(user.sub, id, dto);
  }

  @Get(':id/download')
  @UseGuards(OwnershipGuard)
  @CheckOwnership({ resource: 'asset' })
  download(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.assetsService.getDownloadUrl(user.sub, id);
  }

  @Delete(':id')
  @UseGuards(OwnershipGuard)
  @CheckOwnership({ resource: 'asset' })
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.assetsService.remove(user.sub, id);
  }
}
