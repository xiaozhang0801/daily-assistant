import { describe, expect, it } from "vitest";
import {
  invalidWorkEventResponseMessage,
  parseWorkEventResponse
} from "../../src/main/services/ai/workEventResponseParser";

describe("AI work event response parser", () => {
  it("repairs unescaped quotes inside JSON wrapped with explanation and a code fence", () => {
    const content = `前置说明
\`\`\`json
{
  "title": "修复解析",
  "summary": "正在查看 "日报助手" 的错误提示",
  "category": "开发",
  "confidence": 0.88
}
\`\`\`
后置说明`;

    expect(parseWorkEventResponse(content)).toEqual({
      title: "修复解析",
      summary: "正在查看 \"日报助手\" 的错误提示",
      category: "开发",
      confidence: 0.88
    });
  });

  it("repairs raw newlines inside JSON strings and converts numeric confidence", () => {
    const content = `{
  "title": "整理日报",
  "summary": "第一行
第二行",
  "category": "文档",
  "confidence": "0.76"
}`;

    expect(parseWorkEventResponse(content)).toEqual({
      title: "整理日报",
      summary: "第一行\n第二行",
      category: "文档",
      confidence: 0.76
    });
  });

  it("prefers a JSON code fence over an earlier unlabeled example fence", () => {
    const content = `示例：
\`\`\`
{ "example": true }
\`\`\`
实际结果：
\`\`\`json
{
  "title": "分析代码",
  "summary": "正在检查 JSON 解析流程。",
  "category": "开发",
  "confidence": 0.9
}
\`\`\``;

    expect(parseWorkEventResponse(content)).toMatchObject({
      title: "分析代码",
      category: "开发"
    });
  });

  it("finds a valid work event after explanatory braces and another JSON object", () => {
    const content = `字段格式为 {title, summary}。
示例对象：{"example": true}
最终结果：
{
  "title": "生成日报",
  "summary": "正在整理今日工作内容。",
  "category": "文档",
  "confidence": 0.93
}`;

    expect(parseWorkEventResponse(content)).toEqual({
      title: "生成日报",
      summary: "正在整理今日工作内容。",
      category: "文档",
      confidence: 0.93
    });
  });

  it("returns a stable Chinese error when repaired content is still unusable", () => {
    expect(() =>
      parseWorkEventResponse(`{
  "title": "",
  "summary": "缺少有效标题",
  "category": "开发",
  "confidence": 0.5
}`)
    ).toThrow(invalidWorkEventResponseMessage);
  });
});
