import { BadRequestException } from '@nestjs/common';
import { plainToInstance, Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { MAX_CAPTIONS, MIN_CAPTIONS } from '../memes.constants';
import { CaptionDto } from './caption.dto';

const CAPTIONS_ARRAY_MESSAGE =
  'captions must be a JSON array of caption objects';

function parseCaptions(raw: unknown): unknown {
  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      throw new BadRequestException(['captions must be valid JSON']);
    }
  }
  if (!Array.isArray(value)) {
    throw new BadRequestException([CAPTIONS_ARRAY_MESSAGE]);
  }
  return plainToInstance(CaptionDto, value);
}

export class CreateMemeDto {
  @Transform(({ obj }: { obj: Record<string, unknown> }) =>
    parseCaptions(obj.captions),
  )
  @IsArray({ message: CAPTIONS_ARRAY_MESSAGE })
  @ArrayMinSize(MIN_CAPTIONS)
  @ArrayMaxSize(MAX_CAPTIONS)
  @ValidateNested({ each: true })
  captions!: CaptionDto[];
}
