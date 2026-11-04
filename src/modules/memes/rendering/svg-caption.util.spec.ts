import { join } from 'node:path';
import { loadSync, type Font } from 'opentype.js';
import {
  buildCaptionsSvg,
  captionColors,
  layoutCaption,
  lineBaselines,
  normalizeCaptionText,
} from './svg-caption.util';

describe('svg-caption.util', () => {
  let font: Font;
  const image = { width: 800, height: 600 };

  beforeAll(() => {
    font = loadSync(join(__dirname, 'fonts', 'Anton-Regular.ttf'));
  });

  it('normalizes whitespace and uppercases text', () => {
    expect(normalizeCaptionText('  hello \n  world ')).toBe('HELLO WORLD');
  });

  it('keeps short captions on one line', () => {
    const layout = layoutCaption(font, { text: 'hi', position: 'top' }, image);
    expect(layout.lines).toEqual(['HI']);
  });

  it('wraps long captions and keeps every line within the image width', () => {
    const layout = layoutCaption(
      font,
      {
        text: 'when you finally fix the bug but create three new ones',
        position: 'bottom',
      },
      image,
    );

    expect(layout.lines.length).toBeGreaterThan(1);
    for (const line of layout.lines) {
      expect(font.getAdvanceWidth(line, layout.fontSize)).toBeLessThanOrEqual(
        image.width,
      );
    }
  });

  it('breaks a single word that cannot fit even at the minimum size', () => {
    const layout = layoutCaption(
      font,
      { text: 'W'.repeat(200), position: 'top' },
      { width: 200, height: 200 },
    );

    expect(layout.lines.length).toBeGreaterThan(1);
    expect(layout.lines.join('')).toBe('W'.repeat(200));
  });

  it('places top, center and bottom captions in the right vertical band', () => {
    const layout = { lines: ['A', 'B'], fontSize: 60 };
    const [top] = lineBaselines(font, layout, 'top', 600);
    const center = lineBaselines(font, layout, 'center', 600);
    const bottom = lineBaselines(font, layout, 'bottom', 600);

    expect(top).toBeLessThan(150);
    expect(center[0]).toBeGreaterThan(200);
    expect(center[1]).toBeLessThan(400);
    expect(bottom[1]).toBeGreaterThan(500);
    expect(bottom[1]).toBeLessThanOrEqual(600);
  });

  it('uses a contrasting stroke and falls back on invalid colours', () => {
    expect(captionColors(undefined)).toEqual({
      fill: '#FFFFFF',
      stroke: '#000000',
    });
    expect(captionColors('#000')).toEqual({ fill: '#000', stroke: '#FFFFFF' });
    expect(captionColors('red" onload="x')).toEqual({
      fill: '#FFFFFF',
      stroke: '#000000',
    });
  });

  it('emits glyph paths instead of raw text', () => {
    const svg = buildCaptionsSvg(
      font,
      [{ text: '<b>&"x"</b>', position: 'top' }],
      image,
    );

    expect(svg).toContain('<path d="M');
    expect(svg).not.toContain('<b>');
    expect(svg).not.toContain('&"');
  });
});
