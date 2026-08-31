import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ErrorCodes } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { PrismaService } from '../../prisma/prisma.service';
import {
  toVendorGarmentCostJson,
  toVendorPrintingCostJson,
  toVendorResponse,
} from '../admin.mapper';
import { VendorResponse } from '../admin.types';
import { CreateVendorDto, UpdateVendorDto } from './dto/create-vendor.dto';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<VendorResponse[]> {
    const vendors = await this.prisma.vendor.findMany({
      orderBy: { name: 'asc' },
    });

    return vendors.map(toVendorResponse);
  }

  async getById(id: string): Promise<VendorResponse> {
    const vendor = await this.findVendorOrThrow(id);
    return toVendorResponse(vendor);
  }

  async create(dto: CreateVendorDto): Promise<VendorResponse> {
    const vendor = await this.prisma.vendor.create({
      data: this.toCreateData(dto),
    });

    return toVendorResponse(vendor);
  }

  async update(id: string, dto: UpdateVendorDto): Promise<VendorResponse> {
    await this.findVendorOrThrow(id);

    const vendor = await this.prisma.vendor.update({
      where: { id },
      data: this.toUpdateData(dto),
    });

    return toVendorResponse(vendor);
  }

  async remove(id: string): Promise<{ id: string }> {
    await this.findVendorOrThrow(id);

    await this.prisma.vendor.update({
      where: { id },
      data: { active: false },
    });

    return { id };
  }

  private async findVendorOrThrow(id: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id } });

    if (!vendor) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        'Vendor not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return vendor;
  }

  private toCreateData(dto: CreateVendorDto): Prisma.VendorCreateInput {
    return {
      name: dto.name.trim(),
      location: dto.location.trim(),
      qualityRating: dto.qualityRating,
      customerRating: dto.customerRating,
      capacityPerWeek: dto.capacityPerWeek,
      priceIndex: dto.priceIndex ?? 1.0,
      onTimeRate: dto.onTimeRate,
      active: dto.active ?? true,
      excluded: dto.excluded ?? false,
      notes: dto.notes?.trim(),
      garmentCostByQuality: toVendorGarmentCostJson(dto.garmentCostByQuality),
      printingCostByMethod: toVendorPrintingCostJson(dto.printingCostByMethod),
      materialAvailable: dto.materialAvailable,
      printMethods: dto.printMethods,
      deliveryRegions: dto.deliveryRegions,
      shippingCostBase: dto.shippingCostBase,
      shippingCostPerUnit: dto.shippingCostPerUnit,
      estimatedProductionDays: dto.estimatedProductionDays,
      deliverySlaDays: dto.deliverySlaDays,
    };
  }

  private toUpdateData(dto: UpdateVendorDto): Prisma.VendorUpdateInput {
    const data: Prisma.VendorUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.location !== undefined) data.location = dto.location.trim();
    if (dto.qualityRating !== undefined) data.qualityRating = dto.qualityRating;
    if (dto.customerRating !== undefined) data.customerRating = dto.customerRating;
    if (dto.capacityPerWeek !== undefined) {
      data.capacityPerWeek = dto.capacityPerWeek;
    }
    if (dto.priceIndex !== undefined) data.priceIndex = dto.priceIndex;
    if (dto.onTimeRate !== undefined) data.onTimeRate = dto.onTimeRate;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.excluded !== undefined) data.excluded = dto.excluded;
    if (dto.notes !== undefined) {
      data.notes = dto.notes === null ? null : dto.notes.trim();
    }
    if (dto.garmentCostByQuality !== undefined) {
      data.garmentCostByQuality = toVendorGarmentCostJson(
        dto.garmentCostByQuality,
      );
    }
    if (dto.printingCostByMethod !== undefined) {
      data.printingCostByMethod = toVendorPrintingCostJson(
        dto.printingCostByMethod,
      );
    }
    if (dto.materialAvailable !== undefined) {
      data.materialAvailable = dto.materialAvailable;
    }
    if (dto.printMethods !== undefined) data.printMethods = dto.printMethods;
    if (dto.deliveryRegions !== undefined) {
      data.deliveryRegions = dto.deliveryRegions;
    }
    if (dto.shippingCostBase !== undefined) {
      data.shippingCostBase = dto.shippingCostBase;
    }
    if (dto.shippingCostPerUnit !== undefined) {
      data.shippingCostPerUnit = dto.shippingCostPerUnit;
    }
    if (dto.estimatedProductionDays !== undefined) {
      data.estimatedProductionDays = dto.estimatedProductionDays;
    }
    if (dto.deliverySlaDays !== undefined) {
      data.deliverySlaDays = dto.deliverySlaDays;
    }

    return data;
  }
}
