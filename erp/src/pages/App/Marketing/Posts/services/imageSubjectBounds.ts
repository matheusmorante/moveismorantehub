/** Detecta de forma barata o assunto em PNG/JPEG com fundo transparente ou quase branco.
 * Falhas de CORS e fotos sem contraste retornam undefined: o layout mantém o fallback seguro. */
export async function detectImageSubjectBounds(url?: string) {
  if (!url || typeof Image === 'undefined') return undefined;
  try {
    const image = new Image(); image.crossOrigin = 'anonymous'; image.src = url;
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('image')); });
    const longest = Math.max(image.naturalWidth, image.naturalHeight), scale = Math.min(1, 256 / longest);
    const width = Math.max(1, Math.round(image.naturalWidth * scale)), height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true }); if (!context) return undefined;
    context.drawImage(image, 0, 0, width, height); const pixels = context.getImageData(0, 0, width, height).data;
    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4, alpha = pixels[index + 3], nearWhite = pixels[index] > 245 && pixels[index + 1] > 245 && pixels[index + 2] > 245;
      if (alpha < 20 || nearWhite) continue;
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    if (maxX < 0) return undefined;
    const bounds = { x: minX / width, y: minY / height, width: (maxX - minX + 1) / width, height: (maxY - minY + 1) / height };
    return bounds.width * bounds.height < .03 ? undefined : bounds;
  } catch { return undefined; }
}
