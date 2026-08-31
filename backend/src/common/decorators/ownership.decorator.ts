import { SetMetadata } from '@nestjs/common';

export type OwnershipResource = 'design' | 'asset' | 'order';

export interface OwnershipMetadata {
  resource: OwnershipResource;
  param?: string;
}

export const OWNERSHIP_KEY = 'ownership';

export const CheckOwnership = (metadata: OwnershipMetadata) =>
  SetMetadata(OWNERSHIP_KEY, metadata);
