import { join } from "node:path";

export function resolvePreloadPath(mainDirectory: string): string {
  return join(mainDirectory, "../preload/preload.mjs");
}
