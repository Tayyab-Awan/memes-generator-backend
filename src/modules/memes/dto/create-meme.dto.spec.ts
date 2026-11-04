import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CaptionDto } from './caption.dto';
import { CreateMemeDto } from './create-meme.dto';

async function validateBody(body: Record<string, unknown>) {
  const dto = plainToInstance(CreateMemeDto, body);
  const errors = await validate(dto, { whitelist: true });
  return { dto, errors };
}

describe('CreateMemeDto', () => {
  it('parses a JSON string of captions into CaptionDto instances', async () => {
    const { dto, errors } = await validateBody({
      captions: JSON.stringify([
        { text: '  top  ', position: 'top', color: '#fff', fontScale: 1.5 },
        { text: 'bottom', position: 'bottom' },
      ]),
    });

    expect(errors).toHaveLength(0);
    expect(dto.captions[0]).toBeInstanceOf(CaptionDto);
    expect(dto.captions[0].text).toBe('top');
  });

  it.each([
    ['invalid JSON', '{not json'],
    ['a non-array', JSON.stringify({ text: 'x', position: 'top' })],
  ])('rejects %s with a 400 during parsing', (_label, captions) => {
    expect(() => plainToInstance(CreateMemeDto, { captions })).toThrow(
      BadRequestException,
    );
  });

  it.each([
    ['an empty array', '[]'],
    [
      'too many captions',
      JSON.stringify(
        Array.from({ length: 6 }, () => ({ text: 'x', position: 'top' })),
      ),
    ],
    ['a blank caption', JSON.stringify([{ text: '   ', position: 'top' }])],
    ['a bad position', JSON.stringify([{ text: 'x', position: 'left' }])],
    [
      'a bad color',
      JSON.stringify([{ text: 'x', position: 'top', color: 'red' }]),
    ],
    [
      'an out of range fontScale',
      JSON.stringify([{ text: 'x', position: 'top', fontScale: 5 }]),
    ],
    [
      'a too long caption',
      JSON.stringify([{ text: 'x'.repeat(201), position: 'top' }]),
    ],
  ])('rejects %s', async (_label, captions) => {
    const { errors } = await validateBody({ captions });
    expect(errors.length).toBeGreaterThan(0);
  });
});
