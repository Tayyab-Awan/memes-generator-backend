export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = /^image\/(jpeg|png|webp|gif)$/;
export const MAX_INPUT_PIXELS = 40_000_000;
export const MAX_OUTPUT_DIMENSION = 2000;

export const MIN_CAPTIONS = 1;
export const MAX_CAPTIONS = 5;
export const MAX_CAPTION_LENGTH = 200;
export const MIN_FONT_SCALE = 0.5;
export const MAX_FONT_SCALE = 2;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

export const CREATE_MEME_THROTTLE = { limit: 10, ttl: 60_000 };
