/**
 * IMAGE HELPERS
 * =============
 * Browser-side image preparation shared by avatar upload, material upload and
 * the image Q&A screens.
 *
 * Every helper rejects on an unreadable or undecodable file. The previous
 * inline versions only wired up `onload`, so a broken image (or a format the
 * browser cannot decode, such as HEIC on most desktops) left the promise
 * pending forever and the UI stuck on "uploading".
 */

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This image could not be read. Please use a JPEG, PNG or WebP file."));
    };
    img.src = url;
  });
}

function draw(
  img: HTMLImageElement,
  width: number,
  height: number,
  source?: { sx: number; sy: number; sw: number; sh: number }
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image processing is not available in this browser.");
  // JPEG has no alpha channel; paint white so transparent PNGs don't turn black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  if (source) {
    ctx.drawImage(img, source.sx, source.sy, source.sw, source.sh, 0, 0, width, height);
  } else {
    ctx.drawImage(img, 0, 0, width, height);
  }
  return canvas;
}

/**
 * Downscale an image so its longest side is at most `maxDim` and return it as
 * a JPEG data URL. Keeps camera photos well under the AI proxy's body limit.
 */
export async function fileToJpegDataUrl(file: Blob, maxDim = 1600, quality = 0.82): Promise<string> {
  const img = await loadImage(file);
  if (!img.width || !img.height) throw new Error("This image appears to be empty.");
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  return draw(img, width, height).toDataURL("image/jpeg", quality);
}

/** Centre-crop to a square of `size` pixels and return a JPEG blob. */
export async function fileToSquareJpegBlob(file: Blob, size = 200, quality = 0.85): Promise<Blob> {
  const img = await loadImage(file);
  if (!img.width || !img.height) throw new Error("This image appears to be empty.");
  const minDim = Math.min(img.width, img.height);
  const canvas = draw(img, size, size, {
    sx: (img.width - minDim) / 2,
    sy: (img.height - minDim) / 2,
    sw: minDim,
    sh: minDim,
  });
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not process this image."))),
      "image/jpeg",
      quality
    );
  });
}
