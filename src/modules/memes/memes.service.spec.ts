import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DRIZZLE } from '../../shared/database/database.constants';
import { CloudinaryService } from '../../shared/storage/cloudinary.service';
import { STORAGE_FOLDERS } from '../../shared/storage/storage.constants';
import type { MemeRow } from './memes.schema';
import { MemesService } from './memes.service';
import type { Caption } from './memes.types';
import { MemeRendererService } from './rendering/meme-renderer.service';

const captions: Caption[] = [{ text: 'hello', position: 'top' }];

const row: MemeRow = {
  id: '6f1c3a1e-2b7d-4c55-9a43-1d2e3f4a5b6c',
  captions,
  imagePublicId: 'memes/abc',
  imageUrl: 'https://res.cloudinary.com/demo/image/upload/memes/abc.png',
  width: 800,
  height: 600,
  status: 'ready',
  createdAt: new Date('2026-11-04T10:00:00.000Z'),
  updatedAt: new Date('2026-11-04T10:00:00.000Z'),
};

function createDbMock() {
  const returning = jest.fn();
  const values = jest.fn(() => ({ returning }));
  const insert = jest.fn(() => ({ values }));

  const limit = jest.fn();
  const orderBy = jest.fn(() => ({ limit }));
  const where = jest.fn(() => ({ limit, orderBy }));
  const from = jest.fn(() => ({ where }));
  const select = jest.fn(() => ({ from }));

  return { db: { insert, select }, insert, values, returning, where, limit };
}

describe('MemesService', () => {
  let service: MemesService;
  let dbMock: ReturnType<typeof createDbMock>;
  const renderer = { render: jest.fn() };
  const storage = { upload: jest.fn(), delete: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    dbMock = createDbMock();

    const moduleRef = await Test.createTestingModule({
      providers: [
        MemesService,
        { provide: DRIZZLE, useValue: dbMock.db },
        { provide: MemeRendererService, useValue: renderer },
        { provide: CloudinaryService, useValue: storage },
      ],
    }).compile();

    service = moduleRef.get(MemesService);

    renderer.render.mockResolvedValue({
      buffer: Buffer.from('png'),
      width: 800,
      height: 600,
      format: 'png',
    });
    storage.upload.mockResolvedValue({
      publicId: row.imagePublicId,
      url: row.imageUrl,
      width: 800,
      height: 600,
      bytes: 3,
      format: 'png',
    });
    storage.delete.mockResolvedValue(undefined);
  });

  describe('create', () => {
    it('renders, uploads and stores the meme', async () => {
      dbMock.returning.mockResolvedValue([row]);

      const result = await service.create(Buffer.from('input'), captions);

      expect(renderer.render).toHaveBeenCalledWith(
        Buffer.from('input'),
        captions,
      );
      expect(storage.upload).toHaveBeenCalledWith(Buffer.from('png'), {
        folder: STORAGE_FOLDERS.memes,
      });
      expect(dbMock.values).toHaveBeenCalledWith(
        expect.objectContaining({
          captions,
          imagePublicId: row.imagePublicId,
          imageUrl: row.imageUrl,
          width: 800,
          height: 600,
        }),
      );
      expect(result).toEqual({
        id: row.id,
        imageUrl: row.imageUrl,
        width: 800,
        height: 600,
        captions,
        status: 'ready',
        createdAt: row.createdAt,
      });
    });

    it('does not upload or insert when rendering fails', async () => {
      renderer.render.mockRejectedValue(new BadRequestException());

      await expect(
        service.create(Buffer.from('bad'), captions),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(storage.upload).not.toHaveBeenCalled();
      expect(dbMock.insert).not.toHaveBeenCalled();
    });

    it('maps storage failures to 502 and skips the insert', async () => {
      storage.upload.mockRejectedValue(new Error('cloudinary down'));

      await expect(
        service.create(Buffer.from('input'), captions),
      ).rejects.toBeInstanceOf(BadGatewayException);
      expect(dbMock.insert).not.toHaveBeenCalled();
    });

    it('removes the uploaded image when the insert fails', async () => {
      const dbError = new Error('db down');
      dbMock.returning.mockRejectedValue(dbError);

      await expect(service.create(Buffer.from('input'), captions)).rejects.toBe(
        dbError,
      );
      expect(storage.delete).toHaveBeenCalledWith(row.imagePublicId);
    });
  });

  describe('list', () => {
    it('returns a next cursor only when there are more rows', async () => {
      const second = { ...row, id: '7f1c3a1e-2b7d-4c55-9a43-1d2e3f4a5b6c' };
      dbMock.limit.mockResolvedValue([row, second]);

      const page = await service.list({ limit: 1 });

      expect(dbMock.limit).toHaveBeenCalledWith(2);
      expect(page.items.map((m) => m.id)).toEqual([row.id]);
      expect(page.nextCursor).toEqual(expect.any(String));

      dbMock.limit.mockResolvedValue([row]);
      const next = await service.list({ limit: 1, cursor: page.nextCursor! });
      expect(next.nextCursor).toBeNull();
    });

    it('rejects a malformed cursor', async () => {
      await expect(
        service.list({ limit: 10, cursor: 'garbage' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('throws NotFound when the meme does not exist', async () => {
      dbMock.limit.mockResolvedValue([]);

      await expect(service.findOne(row.id)).rejects.toThrow('Meme not found');
    });
  });
});
