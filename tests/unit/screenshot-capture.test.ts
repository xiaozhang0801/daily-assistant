import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { captureScreenshot } from "../../src/main/services/capture/screenshotCapture";

const temporaryDirectories: string[] = [];

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "daily-captures-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("screenshot capture", () => {
  it("writes one provided screenshot png as one capture record", async () => {
    const storageDirectory = await createTemporaryDirectory();

    const record = await captureScreenshot({
      storageDirectory,
      now: () => new Date("2026-07-08T09:00:00.000Z"),
      screenshotPng: async () => Buffer.from("combined-screens")
    });

    expect(record.capturedAt).toBe("2026-07-08T09:00:00.000Z");
    expect(record.status).toBe("captured");
    await expect(readdir(storageDirectory)).resolves.toHaveLength(1);
    await expect(readFile(record.imagePath, "utf8")).resolves.toBe("combined-screens");
  });
});
