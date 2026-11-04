import {
  BadGatewayException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../shared/database/database.constants';
import type { Database } from '../../shared/database/database.types';
import { CloudinaryService } from '../../shared/storage/cloudinary.service';
import { STORAGE_FOLDERS } from '../../shared/storage/storage.constants';
import type { StoredFile } from '../../shared/storage/storage.types';
import type { ListMemesQueryDto } from './dto/list-memes-query.dto';
import type {
  MemeResponseDto,
  PaginatedMemesResponseDto,
} from './dto/meme-response.dto';
import { memes } from './memes.schema';
import type { Caption } from './memes.types';
import { decodeCursor, encodeCursor, toMemeResponse } from './memes.utils';
import { MemeRendererService } from './rendering/meme-renderer.service';

@Injectable()
export class MemesService {
  private readonly logger = new Logger(MemesService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly renderer: MemeRendererService,
    private readonly storage: CloudinaryService,
  ) {}

  async create(image: Buffer, captions: Caption[]): Promise<MemeResponseDto> {
    const rendered = await this.renderer.render(image, captions);

    let stored: StoredFile;
    try {
      stored = await this.storage.upload(rendered.buffer, {
        folder: STORAGE_FOLDERS.memes,
      });
    } catch (error) {
      this.logger.error('Meme upload failed', (error as Error).stack);
      throw new BadGatewayException('Could not store the generated meme');
    }

    try {
      const [row] = await this.db
        .insert(memes)
        .values({
          captions,
          imagePublicId: stored.publicId,
          imageUrl: stored.url,
          width: rendered.width,
          height: rendered.height,
          status: 'ready',
        })
        .returning();
      return toMemeResponse(row);
    } catch (error) {
      await this.storage
        .delete(stored.publicId)
        .catch((cleanupError) =>
          this.logger.warn(
            `Failed to remove orphaned image ${stored.publicId}: ${(cleanupError as Error).message}`,
          ),
        );
      throw error;
    }
  }

  async findOne(id: string): Promise<MemeResponseDto> {
    const [row] = await this.db
      .select()
      .from(memes)
      .where(eq(memes.id, id))
      .limit(1);
    if (!row) throw new NotFoundException('Meme not found');
    return toMemeResponse(row);
  }

  async list(query: ListMemesQueryDto): Promise<PaginatedMemesResponseDto> {
    const cursor = query.cursor ? decodeCursor(query.cursor) : null;
    const rows = await this.db
      .select()
      .from(memes)
      .where(
        and(
          eq(memes.status, 'ready'),
          cursor
            ? sql`(${memes.createdAt}, ${memes.id}) < (${cursor.createdAt.toISOString()}::timestamptz, ${cursor.id}::uuid)`
            : undefined,
        ),
      )
      .orderBy(desc(memes.createdAt), desc(memes.id))
      .limit(query.limit + 1);

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const last = page.at(-1);

    return {
      items: page.map(toMemeResponse),
      nextCursor: hasMore && last ? encodeCursor(last) : null,
    };
  }
}
