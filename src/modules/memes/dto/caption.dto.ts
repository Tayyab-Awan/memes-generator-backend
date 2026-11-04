import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsHexColor,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import {
  MAX_CAPTION_LENGTH,
  MAX_FONT_SCALE,
  MIN_FONT_SCALE,
} from '../memes.constants';
import {
  CAPTION_POSITIONS,
  type Caption,
  type CaptionPosition,
} from '../memes.types';

export class CaptionDto implements Caption {
  @ApiProperty({ minLength: 1, maxLength: MAX_CAPTION_LENGTH })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, MAX_CAPTION_LENGTH)
  text!: string;

  @ApiProperty({ enum: CAPTION_POSITIONS })
  @IsIn(CAPTION_POSITIONS)
  position!: CaptionPosition;

  @ApiPropertyOptional({ example: '#FFFFFF' })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({
    minimum: MIN_FONT_SCALE,
    maximum: MAX_FONT_SCALE,
    default: 1,
  })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(MIN_FONT_SCALE)
  @Max(MAX_FONT_SCALE)
  fontScale?: number;
}
