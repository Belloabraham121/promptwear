import { api } from "@/lib/api/client";

export type AssetResponse = {
  id: string;
  name: string;
  mime: string;
  designId?: string;
  sizeBytes?: number;
  createdAt: string;
};

export type PresignAssetResponse = {
  asset: AssetResponse;
  uploadUrl: string;
  expiresIn: number;
};

export type DownloadAssetResponse = {
  url: string;
  expiresIn: number;
};

export type PresignAssetInput = {
  name: string;
  mime: string;
  designId?: string;
  sizeBytes?: number;
};

export function presignAsset(input: PresignAssetInput) {
  return api.post<PresignAssetResponse>("/assets/presign", input);
}

export async function uploadToMinio(
  uploadUrl: string,
  blob: Blob,
  mime: string,
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": mime },
    body: blob,
  });

  if (!response.ok) {
    throw new Error(`Asset upload failed (${response.status})`);
  }
}

export function completeAsset(id: string, sizeBytes?: number) {
  return api.post<AssetResponse>(
    `/assets/${id}/complete`,
    sizeBytes !== undefined ? { sizeBytes } : {},
  );
}

export function getAssetDownloadUrl(id: string) {
  return api.get<DownloadAssetResponse>(`/assets/${id}/download`);
}

export async function uploadAsset(input: {
  blob: Blob;
  mime: string;
  name: string;
  designId?: string;
}): Promise<{ asset: AssetResponse; url: string }> {
  const presigned = await presignAsset({
    name: input.name,
    mime: input.mime,
    designId: input.designId,
    sizeBytes: input.blob.size,
  });

  await uploadToMinio(presigned.uploadUrl, input.blob, input.mime);
  const asset = await completeAsset(presigned.asset.id, input.blob.size);
  const download = await getAssetDownloadUrl(asset.id);

  return { asset, url: download.url };
}
