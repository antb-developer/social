/**
 * Client-side compress-and-resize before upload, targeting the spec's
 * ≤300KB budget. Relies on canvas/createImageBitmap (browser-only), so it
 * isn't unit-tested here — there's no jsdom canvas backend in this project
 * and adding one just for this would be a heavy dependency for one function.
 */
export async function compressImage(
  file: File,
  maxBytes = 300 * 1024,
  maxDimension = 1280
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  if (width > maxDimension || height > maxDimension) {
    const scale = maxDimension / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas is not supported in this browser");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);

  let quality = 0.9;
  let blob = await canvasToBlob(canvas, quality);
  while (blob.size > maxBytes && quality > 0.1) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, quality);
  }
  return blob;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to compress image"));
      },
      "image/jpeg",
      quality
    );
  });
}
