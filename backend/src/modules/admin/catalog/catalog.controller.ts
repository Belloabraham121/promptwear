import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CatalogService } from './catalog.service';
import { UpdateColorDto } from './dto/update-color.dto';
import { UpdateGarmentDto } from './dto/update-garment.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { UpdateSizeDto } from './dto/update-size.dto';

@Controller('admin/catalog')
@Roles('admin')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  getCatalog() {
    return this.catalogService.getAdminCatalog();
  }

  @Patch('materials/:id')
  updateMaterial(@Param('id') id: string, @Body() dto: UpdateMaterialDto) {
    return this.catalogService.updateMaterial(id, dto);
  }

  @Patch('garments/:id')
  updateGarment(@Param('id') id: string, @Body() dto: UpdateGarmentDto) {
    return this.catalogService.updateGarment(id, dto);
  }

  @Patch('colors/:id')
  updateColor(@Param('id') id: string, @Body() dto: UpdateColorDto) {
    return this.catalogService.updateColor(id, dto);
  }

  @Patch('sizes/:id')
  updateSize(@Param('id') id: string, @Body() dto: UpdateSizeDto) {
    return this.catalogService.updateSize(id, dto);
  }
}
