import type { UploadApiOptions } from 'cloudinary';
import type { STORAGE_FOLDERS } from './storage.constants';

export type StorageFolder =
  (typeof STORAGE_FOLDERS)[keyof typeof STORAGE_FOLDERS];

export type StorageResourceType = 'image' | 'video' | 'raw';

export interface UploadOptions {
  folder: StorageFolder;
  resourceType?: StorageResourceType;
  publicId?: string;
  tags?: string[];
  overwrite?: boolean;
  providerOptions?: Omit<
    UploadApiOptions,
    'folder' | 'resource_type' | 'public_id' | 'tags' | 'overwrite'
  >;
}

export interface DeleteOptions {
  resourceType?: StorageResourceType;
  invalidate?: boolean;
}

export interface StoredFile {
  publicId: string;
  url: string;
  resourceType: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
}
