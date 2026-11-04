import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { join } from 'node:path';
import { loadSync, type Font } from 'opentype.js';
import sharp from 'sharp';
import { MAX_INPUT_PIXELS, MAX_OUTPUT_DIMENSION } from '../memes.constants';
import type { Caption, OutputFormat, RenderedMeme } from '../memes.types';
import { buildCaptionsSvg } from './svg-caption.util';

const FONT_PATH = join(__dirname, 'fonts', 'Anton-Regular.ttf');

@Injectable()
export class MemeRendererService implements OnModuleInit {
  private font!: Font;

  onModuleInit(): void {
    this.font = loadSync(FONT_PATH);
  }

  async render(input: Buffer, captions: Caption[]): Promise<RenderedMeme> {
    const options = { limitInputPixels: MAX_INPUT_PIXELS, animated: false };

    let base: { data: Buffer; info: sharp.OutputInfo };
    let format: OutputFormat;
    try {
      const metadata = await sharp(input, options).metadata();
      format = this.outputFormatFor(metadata.format);
      base = await sharp(input, options)
        .rotate()
        .resize({
          width: MAX_OUTPUT_DIMENSION,
          height: MAX_OUTPUT_DIMENSION,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .raw()
        .toBuffer({ resolveWithObject: true });
    } catch {
      throw new BadRequestException(
        'Uploaded file is not a valid or supported image',
      );
    }

    const { width, height, channels } = base.info;
    const svg = buildCaptionsSvg(this.font, captions, { width, height });

    const pipeline = sharp(base.data, {
      raw: { width, height, channels },
    }).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]);

    const buffer = await this.encode(pipeline, format).toBuffer();
    return { buffer, width, height, format };
  }

  private outputFormatFor(inputFormat: string | undefined): OutputFormat {
    if (inputFormat === 'jpeg') return 'jpeg';
    if (inputFormat === 'webp') return 'webp';
    return 'png';
  }

  private encode(pipeline: sharp.Sharp, format: OutputFormat): sharp.Sharp {
    if (format === 'jpeg') return pipeline.jpeg({ quality: 90, mozjpeg: true });
    if (format === 'webp') return pipeline.webp({ quality: 90 });
    return pipeline.png({ compressionLevel: 9 });
  }
}
