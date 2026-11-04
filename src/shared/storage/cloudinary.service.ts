import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  UploadApiErrorResponse,
  UploadApiOptions,
  UploadApiResponse,
} from 'cloudinary';
import type { Env } from '../config/env.schema';
import { STORAGE_ROOT_FOLDER } from './storage.constants';
import type {
  DeleteOptions,
  StorageFolder,
  StoredFile,
  UploadOptions,
} from './storage.types';

@Injectable()
export class CloudinaryService {
  constructor(config: ConfigService<Env, true>) {
    const url = new URL(config.get('CLOUDINARY_URL', { infer: true }));
    cloudinary.config({
      cloud_name: url.hostname,
      api_key: decodeURIComponent(url.username),
      api_secret: decodeURIComponent(url.password),
      secure: true,
    });
  }

  static folderPath(folder: StorageFolder): string {
    return `${STORAGE_ROOT_FOLDER}/${folder}`;
  }

  upload(buffer: Buffer, options: UploadOptions): Promise<StoredFile> {
    const uploadOptions: UploadApiOptions = {
      ...options.providerOptions,
      folder: CloudinaryService.folderPath(options.folder),
      resource_type: options.resourceType ?? 'image',
      public_id: options.publicId,
      tags: options.tags,
      overwrite: options.overwrite,
    };

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
          if (error || !result) {
            reject(
              new Error(
                `Cloudinary upload failed: ${error?.message ?? 'empty response'}`,
              ),
            );
            return;
          }
          resolve(this.toStoredFile(result));
        },
      );
      stream.end(buffer);
    });
  }

  async delete(publicId: string, options: DeleteOptions = {}): Promise<void> {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: options.resourceType ?? 'image',
      invalidate: options.invalidate ?? true,
    });
  }

  private toStoredFile(result: UploadApiResponse): StoredFile {
    return {
      publicId: result.public_id,
      url: result.secure_url,
      resourceType: result.resource_type,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
    };
  }
}
