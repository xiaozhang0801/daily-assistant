import { describe, expect, it } from "vitest";
import { composeBitmapsHorizontally } from "../../src/main/services/capture/screenshotComposer";

describe("screenshot composer", () => {
  it("combines screen bitmaps into one horizontal bitmap", () => {
    const composed = composeBitmapsHorizontally([
      {
        width: 2,
        height: 2,
        bitmap: Buffer.from([1, 2, 3, 4])
      },
      {
        width: 1,
        height: 1,
        bitmap: Buffer.from([9])
      }
    ]);

    expect(composed.width).toBe(3);
    expect(composed.height).toBe(2);
    expect([...composed.bitmap]).toEqual([1, 2, 9, 3, 4, 255]);
  });

  it("rejects an empty screen list", () => {
    expect(() => composeBitmapsHorizontally([])).toThrow("No screen bitmap available.");
  });
});
