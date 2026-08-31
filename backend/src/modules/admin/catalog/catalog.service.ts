import { HttpStatus, Injectable } from '@nestjs/common';
import { ErrorCodes } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { PrismaService } from '../../prisma/prisma.service';
import {
  toAdminCatalogResponse,
  toAdminGarmentResponse,
  toMaterialResponse,
  toProductColorResponse,
  toProductSizeResponse,
} from '../admin.mapper';
import {
  AdminCatalogResponse,
  AdminGarmentResponse,
  MaterialResponse,
  ProductColorResponse,
  ProductSizeResponse,
} from '../admin.types';
import { UpdateColorDto } from './dto/update-color.dto';
import { UpdateGarmentDto } from './dto/update-garment.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { UpdateSizeDto } from './dto/update-size.dto';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminCatalog(): Promise<AdminCatalogResponse> {
    const [materials, garments, colors, sizes] = await this.prisma.$transaction([
      this.prisma.material.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.garment.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.productColor.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.productSize.findMany({ orderBy: { sortOrder: 'asc' } }),
    ]);

    return toAdminCatalogResponse(materials, garments, colors, sizes);
  }

  async getPublicColors(): Promise<ProductColorResponse[]> {
    const colors = await this.prisma.productColor.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });

    return colors.map(toProductColorResponse);
  }

  async getPublicGarments(): Promise<AdminGarmentResponse[]> {
    const garments = await this.prisma.garment.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });

    return garments.map(toAdminGarmentResponse);
  }

  async updateMaterial(
    id: string,
    dto: UpdateMaterialDto,
  ): Promise<MaterialResponse> {
    await this.assertMaterialExists(id);

    const material = await this.prisma.material.update({
      where: { id },
      data: dto,
    });

    return toMaterialResponse(material);
  }

  async updateGarment(
    id: string,
    dto: UpdateGarmentDto,
  ): Promise<AdminGarmentResponse> {
    await this.assertGarmentExists(id);

    if (dto.materialId) {
      await this.assertMaterialExists(dto.materialId);
    }

    const garment = await this.prisma.garment.update({
      where: { id },
      data: dto,
    });

    return toAdminGarmentResponse(garment);
  }

  async updateColor(id: string, dto: UpdateColorDto): Promise<ProductColorResponse> {
    await this.assertColorExists(id);

    const color = await this.prisma.productColor.update({
      where: { id },
      data: dto,
    });

    return toProductColorResponse(color);
  }

  async updateSize(id: string, dto: UpdateSizeDto): Promise<ProductSizeResponse> {
    await this.assertSizeExists(id);

    const size = await this.prisma.productSize.update({
      where: { id },
      data: dto,
    });

    return toProductSizeResponse(size);
  }

  private async assertMaterialExists(id: string): Promise<void> {
    const material = await this.prisma.material.findUnique({ where: { id } });
    if (!material) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        'Material not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private async assertGarmentExists(id: string): Promise<void> {
    const garment = await this.prisma.garment.findUnique({ where: { id } });
    if (!garment) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        'Garment not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private async assertColorExists(id: string): Promise<void> {
    const color = await this.prisma.productColor.findUnique({ where: { id } });
    if (!color) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        'Color not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private async assertSizeExists(id: string): Promise<void> {
    const size = await this.prisma.productSize.findUnique({ where: { id } });
    if (!size) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        'Size not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
