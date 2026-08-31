import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ErrorCodes } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { toDesignResponse } from './design.mapper';
import {
  DesignResponse,
  EMPTY_PANELS,
  PaginatedDesignsResponse,
} from './design.types';
import { CreateDesignDto } from './dto/create-design.dto';
import { ListDesignsDto } from './dto/list-designs.dto';
import { UpdateDesignDto } from './dto/update-design.dto';

@Injectable()
export class DesignsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    userId: string,
    query: ListDesignsDto,
  ): Promise<PaginatedDesignsResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.DesignWhereInput = {
      userId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, designs] = await this.prisma.$transaction([
      this.prisma.design.count({ where }),
      this.prisma.design.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items: designs.map(toDesignResponse),
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  async getById(userId: string, id: string): Promise<DesignResponse> {
    const design = await this.prisma.design.findFirst({
      where: { id, userId },
    });

    if (!design) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        'Design not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return toDesignResponse(design);
  }

  async create(userId: string, dto: CreateDesignDto): Promise<DesignResponse> {
    await this.assertThumbnailAsset(userId, dto.thumbnailAssetId);

    const panels = {
      ...EMPTY_PANELS(),
      ...(dto.panels ?? {}),
    };

    const design = await this.prisma.design.create({
      data: {
        userId,
        title: dto.title.trim(),
        color: dto.color.trim(),
        prompt: dto.prompt?.trim() ?? '',
        method: dto.method ?? 'prompt',
        background: dto.background ?? 'ink',
        status: dto.status ?? 'draft',
        garmentId: dto.garmentId ?? 'classic',
        activePanel: dto.activePanel ?? 'front',
        panels: panels as Prisma.InputJsonValue,
        thumbnailAssetId: dto.thumbnailAssetId,
        chat: (dto.chat ?? []) as unknown as Prisma.InputJsonValue,
      },
    });

    return toDesignResponse(design);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateDesignDto,
  ): Promise<DesignResponse> {
    const existing = await this.prisma.design.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        'Design not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (dto.thumbnailAssetId !== undefined && dto.thumbnailAssetId !== null) {
      await this.assertThumbnailAsset(userId, dto.thumbnailAssetId, id);
    }

    const data: Prisma.DesignUncheckedUpdateInput = {};

    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.color !== undefined) data.color = dto.color.trim();
    if (dto.prompt !== undefined) data.prompt = dto.prompt.trim();
    if (dto.method !== undefined) data.method = dto.method;
    if (dto.background !== undefined) data.background = dto.background;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.garmentId !== undefined) data.garmentId = dto.garmentId;
    if (dto.activePanel !== undefined) data.activePanel = dto.activePanel;
    if (dto.chat !== undefined) {
      data.chat = dto.chat as unknown as Prisma.InputJsonValue;
    }
    if (dto.thumbnailAssetId !== undefined) {
      data.thumbnailAssetId = dto.thumbnailAssetId;
    }

    if (dto.panels !== undefined) {
      const currentPanels =
        existing.panels &&
        typeof existing.panels === 'object' &&
        !Array.isArray(existing.panels)
          ? (existing.panels as Record<string, unknown>)
          : {};

      data.panels = {
        ...EMPTY_PANELS(),
        ...currentPanels,
        ...dto.panels,
      } as Prisma.InputJsonValue;
    }

    const design = await this.prisma.design.update({
      where: { id },
      data,
    });

    return toDesignResponse(design);
  }

  async remove(userId: string, id: string): Promise<{ id: string }> {
    const existing = await this.prisma.design.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existing) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        'Design not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.prisma.design.delete({ where: { id } });
    return { id };
  }

  private async assertThumbnailAsset(
    userId: string,
    assetId?: string,
    designId?: string,
  ): Promise<void> {
    if (!assetId) {
      return;
    }

    const asset = await this.prisma.asset.findFirst({
      where: {
        id: assetId,
        userId,
        ...(designId ? { designId } : {}),
      },
      select: { id: true },
    });

    if (!asset) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        'Thumbnail asset not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
