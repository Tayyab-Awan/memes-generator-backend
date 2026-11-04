import type { Font } from 'opentype.js';
import type { Caption } from '../memes.types';

export interface CaptionLayout {
  lines: string[];
  fontSize: number;
}

export interface ImageBox {
  width: number;
  height: number;
}

const HORIZONTAL_FILL = 0.92;
const VERTICAL_PADDING = 0.03;
const BASE_SIZE_BY_WIDTH = 0.1;
const BASE_SIZE_BY_HEIGHT = 0.14;
const MAX_BLOCK_HEIGHT_RATIO = 0.3;
const MIN_FONT_SIZE = 12;
const SHRINK_STEP = 0.9;
const LINE_SPACING = 1.1;
const STROKE_RATIO = 0.08;
const DEFAULT_FILL = '#FFFFFF';
const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function normalizeCaptionText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toUpperCase();
}

function capHeight(font: Font, fontSize: number): number {
  const os2 = font.tables.os2 as { sCapHeight?: number } | undefined;
  const units = os2?.sCapHeight || font.ascender * 0.7;
  return (units / font.unitsPerEm) * fontSize;
}

function splitLongWord(
  font: Font,
  word: string,
  fontSize: number,
  maxWidth: number,
): string[] {
  const parts: string[] = [];
  let current = '';
  for (const char of word) {
    const candidate = current + char;
    if (current && font.getAdvanceWidth(candidate, fontSize) > maxWidth) {
      parts.push(current);
      current = char;
    } else {
      current = candidate;
    }
  }
  if (current) parts.push(current);
  return parts;
}

export function wrapText(
  font: Font,
  text: string,
  fontSize: number,
  maxWidth: number,
  breakLongWords = false,
): string[] | null {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(' ')) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.getAdvanceWidth(candidate, fontSize) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    if (font.getAdvanceWidth(word, fontSize) <= maxWidth) {
      current = word;
      continue;
    }
    if (!breakLongWords) return null;
    const pieces = splitLongWord(font, word, fontSize, maxWidth);
    current = pieces.pop() ?? '';
    lines.push(...pieces);
  }
  if (current) lines.push(current);
  return lines;
}

function blockHeight(font: Font, layout: CaptionLayout): number {
  return (
    capHeight(font, layout.fontSize) +
    (layout.lines.length - 1) * layout.fontSize * LINE_SPACING
  );
}

export function layoutCaption(
  font: Font,
  caption: Caption,
  image: ImageBox,
): CaptionLayout {
  const text = normalizeCaptionText(caption.text);
  const maxWidth = image.width * HORIZONTAL_FILL;
  const heightRatio =
    caption.position === 'center'
      ? MAX_BLOCK_HEIGHT_RATIO * 2
      : MAX_BLOCK_HEIGHT_RATIO;
  const maxBlockHeight = image.height * heightRatio;
  const baseSize = Math.min(
    image.width * BASE_SIZE_BY_WIDTH,
    image.height * BASE_SIZE_BY_HEIGHT,
  );
  let fontSize = Math.max(MIN_FONT_SIZE, baseSize * (caption.fontScale ?? 1));

  while (fontSize > MIN_FONT_SIZE) {
    const lines = wrapText(font, text, fontSize, maxWidth);
    if (lines && blockHeight(font, { lines, fontSize }) <= maxBlockHeight) {
      return { lines, fontSize };
    }
    fontSize = Math.max(MIN_FONT_SIZE, fontSize * SHRINK_STEP);
  }

  return {
    lines: wrapText(font, text, MIN_FONT_SIZE, maxWidth, true) ?? [text],
    fontSize: MIN_FONT_SIZE,
  };
}

export function lineBaselines(
  font: Font,
  layout: CaptionLayout,
  position: Caption['position'],
  imageHeight: number,
): number[] {
  const cap = capHeight(font, layout.fontSize);
  const gap = layout.fontSize * LINE_SPACING;
  const padding = imageHeight * VERTICAL_PADDING;
  const height = blockHeight(font, layout);

  let first: number;
  if (position === 'top') {
    first = padding + cap;
  } else if (position === 'bottom') {
    first = imageHeight - padding - height + cap;
  } else {
    first = (imageHeight - height) / 2 + cap;
  }

  return layout.lines.map((_, index) => first + index * gap);
}

function relativeLuminance(hex: string): number {
  const digits = hex.slice(1);
  const full =
    digits.length === 3
      ? digits
          .split('')
          .map((c) => c + c)
          .join('')
      : digits;
  const [r, g, b] = [0, 2, 4].map(
    (i) => parseInt(full.slice(i, i + 2), 16) / 255,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function captionColors(color: string | undefined): {
  fill: string;
  stroke: string;
} {
  const fill = color && HEX_COLOR.test(color) ? color : DEFAULT_FILL;
  const stroke = relativeLuminance(fill) < 0.4 ? '#FFFFFF' : '#000000';
  return { fill, stroke };
}

export function buildCaptionsSvg(
  font: Font,
  captions: Caption[],
  image: ImageBox,
): string {
  const paths = captions.flatMap((caption) => {
    const layout = layoutCaption(font, caption, image);
    const { fill, stroke } = captionColors(caption.color);
    const strokeWidth = (layout.fontSize * STROKE_RATIO).toFixed(2);
    const baselines = lineBaselines(
      font,
      layout,
      caption.position,
      image.height,
    );
    return layout.lines.map((line, index) => {
      const lineWidth = font.getAdvanceWidth(line, layout.fontSize);
      const x = (image.width - lineWidth) / 2;
      const d = font
        .getPath(line, x, baselines[index], layout.fontSize)
        .toPathData(2);
      return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round" paint-order="stroke"/>`;
    });
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${image.width}" height="${image.height}" viewBox="0 0 ${image.width} ${image.height}">${paths.join('')}</svg>`;
}
