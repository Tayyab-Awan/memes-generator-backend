import type { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import type { Env } from '../config/env.schema';
import { CloudinaryService } from './cloudinary.service';
import { STORAGE_FOLDERS, STORAGE_ROOT_FOLDER } from './storage.constants';

type UploadCallback = (error?: unknown, result?: UploadApiResponse) => void;

describe('CloudinaryService', () => {
  let service: CloudinaryService;
  let uploadStream: jest.SpyInstance;
  let destroy: jest.SpyInstance;
  const end = jest.fn();

  beforeEach(() => {
    jest.restoreAllMocks();
    end.mockReset();
    const config = {
      get: () => 'cloudinary://key:secret@demo',
    } as unknown as ConfigService<Env, true>;
    service = new CloudinaryService(config);

    uploadStream = jest
      .spyOn(cloudinary.uploader, 'upload_stream')
      .mockImplementation(((_options: unknown, callback: UploadCallback) => {
        end.mockImplementation(() =>
          callback(undefined, {
            public_id: `${STORAGE_ROOT_FOLDER}/memes/abc`,
            secure_url: 'https://res.cloudinary.com/demo/abc.png',
            resource_type: 'image',
            format: 'png',
            bytes: 10,
            width: 100,
            height: 50,
          } as UploadApiResponse),
        );
        return { end };
      }) as never);
    destroy = jest
      .spyOn(cloudinary.uploader, 'destroy')
      .mockResolvedValue({ result: 'ok' });
  });

  it('uploads under the root folder and maps the response', async () => {
    const result = await service.upload(Buffer.from('img'), {
      folder: STORAGE_FOLDERS.memes,
      tags: ['meme'],
    });

    expect(uploadStream).toHaveBeenCalledWith(
      expect.objectContaining({
        folder: `${STORAGE_ROOT_FOLDER}/${STORAGE_FOLDERS.memes}`,
        resource_type: 'image',
        tags: ['meme'],
      }),
      expect.any(Function),
    );
    expect(end).toHaveBeenCalledWith(Buffer.from('img'));
    expect(result).toEqual({
      publicId: `${STORAGE_ROOT_FOLDER}/memes/abc`,
      url: 'https://res.cloudinary.com/demo/abc.png',
      resourceType: 'image',
      format: 'png',
      bytes: 10,
      width: 100,
      height: 50,
    });
  });

  it('does not let providerOptions override the folder', async () => {
    await service.upload(Buffer.from('img'), {
      folder: STORAGE_FOLDERS.memes,
      providerOptions: {
        quality: 'auto',
        ...({ folder: 'elsewhere' } as object),
      },
    });

    expect(uploadStream).toHaveBeenCalledWith(
      expect.objectContaining({
        folder: `${STORAGE_ROOT_FOLDER}/${STORAGE_FOLDERS.memes}`,
        quality: 'auto',
      }),
      expect.any(Function),
    );
  });

  it('rejects with a wrapped error when Cloudinary fails', async () => {
    uploadStream.mockImplementation(((
      _options: unknown,
      callback: UploadCallback,
    ) => {
      end.mockImplementation(() => callback({ message: 'bad creds' }));
      return { end };
    }) as never);

    await expect(
      service.upload(Buffer.from('img'), { folder: STORAGE_FOLDERS.memes }),
    ).rejects.toThrow('Cloudinary upload failed: bad creds');
  });

  it('deletes with image defaults', async () => {
    await service.delete('some/id');

    expect(destroy).toHaveBeenCalledWith('some/id', {
      resource_type: 'image',
      invalidate: true,
    });
  });
});
