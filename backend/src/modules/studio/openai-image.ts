export type ImageQuality = 'low' | 'medium' | 'high';
export type ImageSize = '1024x1024' | '1024x1536' | '1536x1024';

export type StudioImageOption = {
  quality: ImageQuality;
  size: ImageSize;
  /** Approximate USD price per image for gpt-image-1 */
  priceUsd: number;
  label: string;
};

export const STUDIO_IMAGE_MODEL = 'gpt-image-1';

export const DEFAULT_IMAGE_QUALITY: ImageQuality = 'medium';
export const DEFAULT_IMAGE_SIZE: ImageSize = '1024x1024';

/** Allowlisted gpt-image-1 quality × size options with list prices. */
export const STUDIO_IMAGE_OPTIONS: readonly StudioImageOption[] = [
  {
    quality: 'low',
    size: '1024x1024',
    priceUsd: 0.011,
    label: 'Low · Square',
  },
  {
    quality: 'low',
    size: '1024x1536',
    priceUsd: 0.016,
    label: 'Low · Portrait',
  },
  {
    quality: 'low',
    size: '1536x1024',
    priceUsd: 0.016,
    label: 'Low · Landscape',
  },
  {
    quality: 'medium',
    size: '1024x1024',
    priceUsd: 0.042,
    label: 'Medium · Square',
  },
  {
    quality: 'medium',
    size: '1024x1536',
    priceUsd: 0.063,
    label: 'Medium · Portrait',
  },
  {
    quality: 'medium',
    size: '1536x1024',
    priceUsd: 0.063,
    label: 'Medium · Landscape',
  },
  {
    quality: 'high',
    size: '1024x1024',
    priceUsd: 0.167,
    label: 'High · Square',
  },
  {
    quality: 'high',
    size: '1024x1536',
    priceUsd: 0.25,
    label: 'High · Portrait',
  },
  {
    quality: 'high',
    size: '1536x1024',
    priceUsd: 0.25,
    label: 'High · Landscape',
  },
] as const;

const QUALITIES = new Set<ImageQuality>(['low', 'medium', 'high']);
const SIZES = new Set<ImageSize>(['1024x1024', '1024x1536', '1536x1024']);

export function resolveImageQuality(value?: string | null): ImageQuality {
  if (value && QUALITIES.has(value as ImageQuality)) {
    return value as ImageQuality;
  }
  return DEFAULT_IMAGE_QUALITY;
}

export function resolveImageSize(value?: string | null): ImageSize {
  if (value && SIZES.has(value as ImageSize)) {
    return value as ImageSize;
  }
  return DEFAULT_IMAGE_SIZE;
}

export function findImageOption(
  quality: ImageQuality,
  size: ImageSize,
): StudioImageOption {
  return (
    STUDIO_IMAGE_OPTIONS.find(
      (option) => option.quality === quality && option.size === size,
    ) ?? STUDIO_IMAGE_OPTIONS.find((option) => option.quality === 'medium' && option.size === '1024x1024')!
  );
}
