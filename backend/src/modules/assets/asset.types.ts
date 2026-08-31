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
