import { BadRequestException } from '@nestjs/common';
import type { MemeResponseDto } from './dto/meme-response.dto';
import type { MemeRow } from './memes.schema';
import type { MemeCursor } from './memes.types';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeCursor(cursor: MemeCursor): string {
  return Buffer.from(
    `${cursor.createdAt.toISOString()}|${cursor.id}`,
    'utf8',
  ).toString('base64url');
}

export function decodeCursor(raw: string): MemeCursor {
  const [createdAtRaw, id] = Buffer.from(raw, 'base64url')
    .toString('utf8')
    .split('|');
  const createdAt = new Date(createdAtRaw ?? '');
  if (!id || !UUID_PATTERN.test(id) || Number.isNaN(createdAt.getTime())) {
    throw new BadRequestException('Invalid cursor');
  }
  return { createdAt, id };
}

export function toMemeResponse(row: MemeRow): MemeResponseDto {
  return {
    id: row.id,
    imageUrl: row.imageUrl,
    width: row.width,
    height: row.height,
    captions: row.captions,
    status: row.status,
    createdAt: row.createdAt,
  };
}
