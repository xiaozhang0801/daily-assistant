import { normalize, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { resolvePreloadPath } from "../../src/main/preloadPath";

describe("preload path", () => {
  it("points to electron-vite preload mjs output", () => {
    expect(normalize(resolvePreloadPath("C:/project/日报/out/main")).endsWith(`${sep}out${sep}preload${sep}preload.mjs`)).toBe(
      true
    );
  });
});
