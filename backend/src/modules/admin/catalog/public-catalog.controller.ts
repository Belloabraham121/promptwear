import { Controller, Get } from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class PublicCatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Public()
  @Get('colors')
  getColors() {
    return this.catalogService.getPublicColors();
  }

  @Public()
  @Get('garments')
  getGarments() {
    return this.catalogService.getPublicGarments();
  }
}
