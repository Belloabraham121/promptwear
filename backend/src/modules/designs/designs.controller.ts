import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CheckOwnership } from '../../common/decorators/ownership.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OwnershipGuard } from '../../common/guards/ownership.guard';
import { RequestUser } from '../../common/types/request-user.type';
import { CreateDesignDto } from './dto/create-design.dto';
import { ListDesignsDto } from './dto/list-designs.dto';
import { UpdateDesignDto } from './dto/update-design.dto';
import { DesignsService } from './designs.service';

@Controller('designs')
export class DesignsController {
  constructor(private readonly designsService: DesignsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() query: ListDesignsDto) {
    return this.designsService.list(user.sub, query);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateDesignDto) {
    return this.designsService.create(user.sub, dto);
  }

  @Get(':id')
  @UseGuards(OwnershipGuard)
  @CheckOwnership({ resource: 'design' })
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.designsService.getById(user.sub, id);
  }

  @Patch(':id')
  @UseGuards(OwnershipGuard)
  @CheckOwnership({ resource: 'design' })
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateDesignDto,
  ) {
    return this.designsService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @UseGuards(OwnershipGuard)
  @CheckOwnership({ resource: 'design' })
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.designsService.remove(user.sub, id);
  }
}
