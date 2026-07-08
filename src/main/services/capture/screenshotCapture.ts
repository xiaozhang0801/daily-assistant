import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { CaptureRecord } from "../../../shared/types";

export interface ScreenshotCaptureOptions {
  storageDirectory: string;
  now?: () => Date;
  screenshotPng: () => Promise<Buffer>;
}

export interface ScreenshotsCaptureOptions {
  storageDirectory: string;
  now?: () => Date;
  screenshotPngs: () => Promise<Buffer[]>;
}

export async function captureScreenshot(options: ScreenshotCaptureOptions): Promise<CaptureRecord> {
  const records = await captureScreenshots({
    storageDirectory: options.storageDirectory,
    now: options.now,
    screenshotPngs: async () => [await options.screenshotPng()]
  });
  const record = records[0];
  if (!record) {
    throw new Error("No screenshot was captured.");
  }

  return record;
}

export async function captureScreenshots(options: ScreenshotsCaptureOptions): Promise<CaptureRecord[]> {
  const now = options.now?.() ?? new Date();
  const pngs = await options.screenshotPngs();

  return Promise.all(
    pngs.map(async (png) => {
      const id = randomUUID();
      const imagePath = join(options.storageDirectory, `${id}.png`);

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
    })
  );
}
