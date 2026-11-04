import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { MemeRendererService } from './meme-renderer.service';

function solidImage(
  width: number,
  height: number,
  format: 'jpeg' | 'png' | 'webp',
): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 30, g: 60, b: 120 },
    },
  })
    .toFormat(format)
    .toBuffer();
}

async function countBrightPixels(
  image: Buffer,
  region: { left: number; top: number; width: number; height: number },
): Promise<number> {
  const { data, info } = await sharp(image)
    .extract(region)
    .raw()
    .toBuffer({ resolveWithObject: true });
  let bright = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200) bright++;
  }
  return bright;
}

describe('MemeRendererService', () => {
  let renderer: MemeRendererService;

  beforeAll(() => {
    renderer = new MemeRendererService();
    renderer.onModuleInit();
  });

  it('renders captions onto the image and keeps its dimensions', async () => {
    const input = await solidImage(800, 600, 'png');

    const result = await renderer.render(input, [
      { text: 'top text', position: 'top' },
      { text: 'bottom text', position: 'bottom' },
    ]);

    const metadata = await sharp(result.buffer).metadata();
    expect(result).toMatchObject({ width: 800, height: 600, format: 'png' });
    expect(metadata).toMatchObject({ format: 'png', width: 800, height: 600 });

    const top = await countBrightPixels(result.buffer, {
      left: 0,
      top: 0,
      width: 800,
      height: 150,
    });
    const middle = await countBrightPixels(result.buffer, {
      left: 0,
      top: 250,
      width: 800,
      height: 100,
    });
    const bottom = await countBrightPixels(result.buffer, {
      left: 0,
      top: 450,
      width: 800,
      height: 150,
    });
    expect(top).toBeGreaterThan(500);
    expect(bottom).toBeGreaterThan(500);
    expect(middle).toBe(0);
  });

  it('keeps jpeg and webp inputs in their format', async () => {
    const captions = [{ text: 'hi', position: 'center' as const }];

    const jpeg = await renderer.render(
      await solidImage(300, 300, 'jpeg'),
      captions,
    );
    const webp = await renderer.render(
      await solidImage(300, 300, 'webp'),
      captions,
    );

    expect((await sharp(jpeg.buffer).metadata()).format).toBe('jpeg');
    expect((await sharp(webp.buffer).metadata()).format).toBe('webp');
  });

  it('downscales large images to the max dimension', async () => {
    const input = await solidImage(3000, 1500, 'jpeg');

    const result = await renderer.render(input, [
      { text: 'big', position: 'top' },
    ]);

    expect(result).toMatchObject({ width: 2000, height: 1000 });
  });

  it('applies EXIF orientation before rendering', async () => {
    const input = await sharp(await solidImage(800, 600, 'jpeg'))
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();

    const result = await renderer.render(input, [
      { text: 'rotated', position: 'top' },
    ]);

    expect(result).toMatchObject({ width: 600, height: 800 });
  });

  it('handles XML-special and long text', async () => {
    const input = await solidImage(400, 400, 'png');

    const result = await renderer.render(input, [
      { text: '<script>&"quotes"\'</script>', position: 'top' },
      {
        text:
          'a very long caption '.repeat(10) +
          'Supercalifragilisticexpialidocious'.repeat(3),
        position: 'bottom',
        color: '#000',
        fontScale: 2,
      },
    ]);

    expect(result.width).toBe(400);
  });

  it('rejects data that is not an image', async () => {
    await expect(
      renderer.render(Buffer.from('definitely not an image'), [
        { text: 'x', position: 'top' },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
