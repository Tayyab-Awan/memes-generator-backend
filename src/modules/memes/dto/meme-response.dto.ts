import { ApiProperty } from '@nestjs/swagger';
import { MEME_STATUSES, type MemeStatus } from '../memes.types';
import { CaptionDto } from './caption.dto';

export class MemeResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  imageUrl!: string;

  @ApiProperty()
  width!: number;

  @ApiProperty()
  height!: number;

  @ApiProperty({ type: [CaptionDto] })
  captions!: CaptionDto[];

  @ApiProperty({ enum: MEME_STATUSES })
  status!: MemeStatus;

  @ApiProperty()
  createdAt!: Date;
}

export class PaginatedMemesResponseDto {
  @ApiProperty({ type: [MemeResponseDto] })
  items!: MemeResponseDto[];

  @ApiProperty({ type: String, nullable: true })
  nextCursor!: string | null;
}
