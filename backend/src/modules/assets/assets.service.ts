import { HttpStatus, Injectable } from '@nestjs/common';
import { ErrorCodes } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { toAssetResponse } from './asset.mapper';
import {
  AssetResponse,
  DownloadAssetResponse,
  PresignAssetResponse,
} from './asset.types';
import { CompleteAssetDto } from './dto/complete-asset.dto';
import { PresignAssetDto } from './dto/presign-asset.dto';
import { StorageService } from './storage.service';

const UPLOAD_TTL_SECONDS = 900;
const DOWNLOAD_TTL_SECONDS = 900;

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async list(userId: string, designId?: string): Promise<AssetResponse[]> {
    if (designId) {
      await this.assertDesignOwnership(userId, designId);
    }

    const assets = await this.prisma.asset.findMany({
      where: {
        userId,
        ...(designId ? { designId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return assets.map(toAssetResponse);
  }

  async presign(
    userId: string,
    dto: PresignAssetDto,
  ): Promise<PresignAssetResponse> {
    if (dto.designId) {
      await this.assertDesignOwnership(userId, dto.designId);
    }

    const asset = await this.prisma.asset.create({
      data: {
        userId,
        designId: dto.designId,
        name: dto.name.trim(),
        mime: dto.mime.trim(),
        storageKey: 'pending',
        sizeBytes: dto.sizeBytes,
      },
    });

    const storageKey = this.storageService.buildStorageKey(
      userId,
      asset.id,
      dto.name,
    );

    const updated = await this.prisma.asset.update({
      where: { id: asset.id },
      data: { storageKey },
    });

    const uploadUrl = await this.storageService.createPresignedUploadUrl(
      storageKey,
      dto.mime,
      UPLOAD_TTL_SECONDS,
    );

    return {
      asset: toAssetResponse(updated),
      uploadUrl,
      expiresIn: UPLOAD_TTL_SECONDS,
    };
  }

  async complete(
    userId: string,
    id: string,
    dto: CompleteAssetDto,
  ): Promise<AssetResponse> {
    const asset = await this.getOwnedAsset(userId, id);
    const head = await this.storageService.headObject(asset.storageKey);

    const sizeBytes = dto.sizeBytes ?? head.sizeBytes ?? asset.sizeBytes;

    if (!sizeBytes || sizeBytes < 1) {
      throw new AppException(
        ErrorCodes.VALIDATION_ERROR,
        'Uploaded asset size could not be determined',
        HttpStatus.BAD_REQUEST,
      );
    }

    const updated = await this.prisma.asset.update({
      where: { id },
      data: { sizeBytes },
    });

    return toAssetResponse(updated);
  }

  async getDownloadUrl(
    userId: string,
    id: string,
  ): Promise<DownloadAssetResponse> {
    const asset = await this.getOwnedAsset(userId, id);

    const url = await this.storageService.createPresignedDownloadUrl(
      asset.storageKey,
      DOWNLOAD_TTL_SECONDS,
    );

    return {
      url,
      expiresIn: DOWNLOAD_TTL_SECONDS,
    };
  }

  async remove(userId: string, id: string): Promise<{ id: string }> {
    const asset = await this.getOwnedAsset(userId, id);

    await this.storageService.deleteObject(asset.storageKey);
    await this.prisma.asset.delete({ where: { id } });

    return { id };
  }

  private async getOwnedAsset(userId: string, id: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, userId },
    });

    if (!asset) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        'Asset not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return asset;
  }

  private async assertDesignOwnership(
    userId: string,
    designId: string,
  ): Promise<void> {
    const design = await this.prisma.design.findFirst({
      where: { id: designId, userId },
      select: { id: true },
    });

    if (!design) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        'Design not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
