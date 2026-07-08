import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { captureScreenshots } from "../../src/main/services/capture/screenshotCapture";

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
  it("writes every screen png as an independent capture record", async () => {
    const storageDirectory = await createTemporaryDirectory();

    const records = await captureScreenshots({
      storageDirectory,
      now: () => new Date("2026-07-08T09:00:00.000Z"),
      screenshotPngs: async () => [Buffer.from("screen-one"), Buffer.from("screen-two")]
    });

    expect(records).toHaveLength(2);
    expect(new Set(records.map((record) => record.id)).size).toBe(2);
    expect(records.map((record) => record.capturedAt)).toEqual([
      "2026-07-08T09:00:00.000Z",
      "2026-07-08T09:00:00.000Z"
    ]);
    expect(records.every((record) => record.status === "captured")).toBe(true);
    await expect(readdir(storageDirectory)).resolves.toHaveLength(2);
    await expect(readFile(records[0].imagePath, "utf8")).resolves.toBe("screen-one");
    await expect(readFile(records[1].imagePath, "utf8")).resolves.toBe("screen-two");
  });
});
