import {
  Body,
  Controller,
  Get,
  Headers,
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
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersDto } from './dto/list-orders.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() query: ListOrdersDto) {
    return this.ordersService.list(user.sub, query);
  }

  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.ordersService.create(user.sub, dto, idempotencyKey);
  }

  @Get(':id')
  @UseGuards(OwnershipGuard)
  @CheckOwnership({ resource: 'order' })
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.ordersService.getById(user.sub, id);
  }

  @Patch(':id')
  @UseGuards(OwnershipGuard)
  @CheckOwnership({ resource: 'order' })
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.ordersService.updateNote(user.sub, id, dto);
  }
}
