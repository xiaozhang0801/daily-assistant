export interface BitmapFrame {
  width: number;
  height: number;
  bitmap: Buffer;
}

export interface ComposedBitmap extends BitmapFrame {
  bytesPerPixel: number;
}

function resolveBytesPerPixel(frame: BitmapFrame): number {
  if (frame.width <= 0 || frame.height <= 0) {
    throw new Error("Screen bitmap dimensions must be positive.");
  }

  const pixelCount = frame.width * frame.height;
  const bytesPerPixel = frame.bitmap.length / pixelCount;
  if (!Number.isInteger(bytesPerPixel) || bytesPerPixel <= 0) {
    throw new Error("Screen bitmap size does not match its dimensions.");
  }

  return bytesPerPixel;
}

export function composeBitmapsHorizontally(frames: BitmapFrame[]): ComposedBitmap {
  if (frames.length === 0) {
    throw new Error("No screen bitmap available.");
  }

  const bytesPerPixel = resolveBytesPerPixel(frames[0]);
  for (const frame of frames.slice(1)) {
    if (resolveBytesPerPixel(frame) !== bytesPerPixel) {
      throw new Error("Screen bitmaps must use the same pixel format.");
    }
  }

  const width = frames.reduce((sum, frame) => sum + frame.width, 0);
  const height = Math.max(...frames.map((frame) => frame.height));
  const bitmap = Buffer.alloc(width * height * bytesPerPixel, 255);
  let offsetX = 0;

  for (const frame of frames) {
    for (let row = 0; row < frame.height; row += 1) {
      const sourceStart = row * frame.width * bytesPerPixel;
      const sourceEnd = sourceStart + frame.width * bytesPerPixel;
      const targetStart = (row * width + offsetX) * bytesPerPixel;
      frame.bitmap.copy(bitmap, targetStart, sourceStart, sourceEnd);
    }
    offsetX += frame.width;
  }

  return {
    width,
    height,
    bitmap,
    bytesPerPixel
  };
}
