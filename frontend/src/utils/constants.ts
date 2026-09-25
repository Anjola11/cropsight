export const APP_NAME = 'CropSight';

export const UPLOAD_MAX_SIDE = Number(import.meta.env.VITE_UPLOAD_MAX_SIDE) || 1280;
export const UPLOAD_JPEG_QUALITY = 0.85;

export const THUMB_MAX_SIDE = 640;
export const THUMB_JPEG_QUALITY = 0.7;

export const HISTORY_MAX_ITEMS = 10;
export const CLIENT_MAX_FILE_MB = 25;
export const MAX_BATCH_SIZE = 8;

export const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
