export function isBlacklistedWindow(activeApp: string | null, windowTitle: string | null, blacklist: string[]): boolean {
  const haystack = `${activeApp ?? ""} ${windowTitle ?? ""}`.toLowerCase();
  return blacklist.some((item) => haystack.includes(item.toLowerCase()));
}
