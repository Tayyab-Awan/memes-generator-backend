export const CAPTION_POSITIONS = ['top', 'center', 'bottom'] as const;

export type CaptionPosition = (typeof CAPTION_POSITIONS)[number];

export interface Caption {
  text: string;
  position: CaptionPosition;
  color?: string;
  fontScale?: number;
}

export const MEME_STATUSES = ['pending', 'ready', 'failed'] as const;

export type MemeStatus = (typeof MEME_STATUSES)[number];

export type OutputFormat = 'jpeg' | 'png' | 'webp';

export interface RenderedMeme {
  buffer: Buffer;
  width: number;
  height: number;
  format: OutputFormat;
}

export interface MemeCursor {
  createdAt: Date;
  id: string;
}
