const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

// Shown in any <img> whose source fails to load (a stored data-URL that got
// corrupted, a swapped-out sample path, etc.) so the UI degrades to a branded
// tile instead of a broken-image box with raw alt text.
export const FALLBACK_IMAGE = '/images/placeholder-magnet-1.svg';

// Downscales an uploaded photo and re-encodes it as JPEG before it gets
// stored as a base64 string in localStorage. Phone camera photos (often
// 3-10MB) would otherwise blow past localStorage's ~5-10MB per-origin quota
// after just a couple of uploads, silently breaking the save.
// Ported verbatim from the old src/utils/image.ts.
export function fileToCompressedDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not read image file'));
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
