import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { CaptureRecord } from "../../../shared/types";

export interface ScreenshotCaptureOptions {
  storageDirectory: string;
  now?: () => Date;
  screenshotPng: () => Promise<Buffer>;
}

export async function captureScreenshot(options: ScreenshotCaptureOptions): Promise<CaptureRecord> {
  const now = options.now?.() ?? new Date();
  const id = randomUUID();
  const imagePath = join(options.storageDirectory, `${id}.png`);
  const png = await options.screenshotPng();

  await mkdir(dirname(imagePath), { recursive: true });
  await writeFile(imagePath, png);

  return {
    id,
    capturedAt: now.toISOString(),
    imagePath,
    activeApp: null,
    windowTitle: null,
    status: "captured",
    skipReason: null
  };
}
