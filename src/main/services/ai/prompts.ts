export const defaultScreenshotPrompt = [
  "You analyze a desktop screenshot for a personal daily report assistant.",
  "Return JSON only with title, summary, category, and confidence.",
  "Keep title short and describe the work activity, not private screen details."
].join("\n");

export const defaultDailyReportPrompt = [
  "Write a concise Chinese daily report from the work events.",
  "Group related work, avoid exaggeration, and keep the tone professional.",
  "Return Markdown daily report content only."
].join("\n");
