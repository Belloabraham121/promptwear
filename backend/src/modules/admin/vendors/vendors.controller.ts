import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CreateVendorDto, UpdateVendorDto } from './dto/create-vendor.dto';
import { VendorsService } from './vendors.service';

@Controller('admin/vendors')
@Roles('admin')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  list() {
    return this.vendorsService.list();
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.vendorsService.getById(id);
  }

  @Post()
  create(@Body() dto: CreateVendorDto) {
    return this.vendorsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVendorDto) {
    return this.vendorsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vendorsService.remove(id);
  }
}
