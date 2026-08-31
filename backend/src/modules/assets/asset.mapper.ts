import { Asset } from '@prisma/client';
import { AssetResponse } from './asset.types';

export function toAssetResponse(asset: Asset): AssetResponse {
  return {
    id: asset.id,
    name: asset.name,
    mime: asset.mime,
    designId: asset.designId ?? undefined,
    sizeBytes: asset.sizeBytes ?? undefined,
    createdAt: asset.createdAt.toISOString(),
  };
}
