export const legacyDefaultScreenshotPrompt = [
  "You analyze a desktop screenshot for a personal daily report assistant.",
  "Return JSON only with title, summary, category, and confidence.",
  "Keep title short and describe the work activity, not private screen details."
].join("\n");

export const legacyDefaultDailyReportPrompt = [
  "Write a concise Chinese daily report from the work events.",
  "Group related work, avoid exaggeration, and keep the tone professional.",
  "Return Markdown daily report content only."
].join("\n");

export const defaultScreenshotPrompt = [
  "你是个人日报助手的截图分析员，请根据桌面截图判断用户正在进行的工作活动。",
  "只返回 JSON，且必须是严格有效的 JSON；不要输出 Markdown 代码块或额外说明，字段必须包含 title、summary、category、confidence。",
  "字符串中的双引号、反斜杠和换行必须按 JSON 规则转义。",
  "title 要简短，summary 用中文概括工作内容，不要暴露隐私细节或逐字描述屏幕内容。"
].join("\n");

export const defaultDailyReportPrompt = [
  "请根据工作事件生成一份简洁的中文日报。",
  "合并相近事项，避免夸大，用专业、自然的工作汇报语气。",
  "只返回 Markdown 格式的日报正文，不要输出额外解释。"
].join("\n");

function resolvePrompt(storedPrompt: string | null, currentDefault: string, legacyDefault: string): string {
  if (!storedPrompt || storedPrompt === legacyDefault) {
    return currentDefault;
  }

  return storedPrompt;
}

export function resolveScreenshotPrompt(storedPrompt: string | null): string {
  return resolvePrompt(storedPrompt, defaultScreenshotPrompt, legacyDefaultScreenshotPrompt);
}

export function resolveDailyReportPrompt(storedPrompt: string | null): string {
  return resolvePrompt(storedPrompt, defaultDailyReportPrompt, legacyDefaultDailyReportPrompt);
}
