# AI JSON Repair And Report History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 自动修复截图 AI 的轻微 JSON 格式错误，并在报告页展示当前自然周内可查看的历史日报。

**Architecture:** 新增一个只负责提取、修复和校验截图分析响应的共享解析器，两种 AI Provider 统一调用它。现有 `dashboard.getHistory()` 扩展为返回当前自然周的日报正文，报告页视图模型负责合并今天草稿和历史只读日报。

**Tech Stack:** Electron、Vue 3、TypeScript、Vitest、SQLite、`jsonrepair`

---

## 执行约束

- 直接在当前 `master` 工作区执行，用户已明确要求继续且此前明确不使用 worktree。
- 严格按 RED-GREEN 顺序执行，不先写生产代码。
- 不保存 AI 原始响应，不新增 AI 二次请求。
- 不自动提交实现代码，等待用户后续明确要求提交。

### Task 1: 截图 AI 响应解析器

**Files:**
- Create: `src/main/services/ai/workEventResponseParser.ts`
- Create: `tests/unit/ai-work-event-response-parser.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: 写共享解析器失败测试**

测试调用期望存在的 `parseWorkEventResponse()`，覆盖：

```ts
expect(parseWorkEventResponse(`前置说明
\`\`\`json
{
  "title": "修复解析",
  "summary": "正在查看 "日报助手" 的错误提示",
  "category": "开发",
  "confidence": 0.88
}
\`\`\`
后置说明`)).toEqual({
  title: "修复解析",
  summary: "正在查看 \"日报助手\" 的错误提示",
  category: "开发",
  confidence: 0.88
});
```

另加字符串原始换行测试，以及字段缺失时抛出
`截图 AI 返回内容格式异常，自动修复失败，请稍后重试。`。

- [ ] **Step 2: 运行测试并确认 RED**

Run:

```powershell
& 'C:\Program Files\HBuilderX\plugins\npm\npm.cmd' exec vitest -- run tests\unit\ai-work-event-response-parser.test.ts --config vitest.config.ts
```

Expected: FAIL，原因是共享解析器模块或导出尚不存在。

- [ ] **Step 3: 安装生产依赖**

Run:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' install jsonrepair
```

Expected: `package.json` 和 `package-lock.json` 增加 `jsonrepair`。

- [ ] **Step 4: 实现最小共享解析器**

实现以下公开接口和固定错误：

```ts
import { jsonrepair } from "jsonrepair";
import type { WorkEventDraft } from "../../../shared/types";

export const invalidWorkEventResponseMessage =
  "截图 AI 返回内容格式异常，自动修复失败，请稍后重试。";

export function parseWorkEventResponse(content: string): WorkEventDraft {
  try {
    const candidate = extractJsonCandidate(content);
    const value = parseJsonCandidate(candidate);
    return validateWorkEventDraft(value);
  } catch {
    throw new Error(invalidWorkEventResponseMessage);
  }
}
```

内部函数负责：

- 优先提取 Markdown 代码块内容。
- 没有代码块时提取第一个 `{` 到最后一个 `}`。
- 先标准 `JSON.parse`，失败后执行 `JSON.parse(jsonrepair(candidate))`。
- 要求结果是对象，三个文本字段去除首尾空白后非空，`confidence` 可转换为有限数字。

- [ ] **Step 5: 运行解析器测试并确认 GREEN**

重复 Step 2 命令。

Expected: 解析器测试全部 PASS。

### Task 2: 两种 Provider 统一解析并强化提示词

**Files:**
- Modify: `src/main/services/ai/minimaxProvider.ts`
- Modify: `src/main/services/ai/openaiCompatibleProvider.ts`
- Modify: `src/main/services/ai/prompts.ts`
- Modify: `tests/unit/ai-connection-test.test.ts`
- Modify: `tests/unit/ai-providers.test.ts`

- [ ] **Step 1: 写 Provider 行为失败测试**

为 MiniMax 和 OpenAI-compatible 分别构造包含未转义双引号的响应，期望
`analyzeScreenshot()` 返回修复后的 `WorkEventDraft`。增加无法修复时只返回统一中文错误的断言。

提示词测试增加：

```ts
expect(defaultScreenshotPrompt).toContain("严格有效的 JSON");
expect(defaultScreenshotPrompt).toContain("双引号");
```

- [ ] **Step 2: 运行 Provider 测试并确认 RED**

Run:

```powershell
& 'C:\Program Files\HBuilderX\plugins\npm\npm.cmd' exec vitest -- run tests\unit\ai-connection-test.test.ts tests\unit\ai-providers.test.ts --config vitest.config.ts
```

Expected: 至少一个损坏 JSON 或提示词断言 FAIL。

- [ ] **Step 3: 替换重复解析逻辑**

两个 Provider 删除本地 `parseWorkEvent()`；统一导入并调用：

```ts
import { parseWorkEventResponse } from "./workEventResponseParser";
```

截图分析返回：

```ts
return parseWorkEventResponse(extractedContent);
```

默认截图提示词增加严格 JSON、字符串双引号必须转义、不得输出额外说明的约束。

- [ ] **Step 4: 运行 Provider 与解析器测试并确认 GREEN**

Run:

```powershell
& 'C:\Program Files\HBuilderX\plugins\npm\npm.cmd' exec vitest -- run tests\unit\ai-work-event-response-parser.test.ts tests\unit\ai-connection-test.test.ts tests\unit\ai-providers.test.ts --config vitest.config.ts
```

Expected: 三个测试文件全部 PASS。

### Task 3: 当前自然周历史数据

**Files:**
- Modify: `src/shared/types/report.ts`
- Modify: `src/main/ipc/dashboardHistory.ts`
- Modify: `tests/unit/dashboard-history.test.ts`

- [ ] **Step 1: 写自然周与日报正文失败测试**

在 `2026-07-08`（周三）且不传 `days` 时，期望只返回：

```ts
["2026-07-08", "2026-07-07", "2026-07-06"]
```

每一项增加 `reportContent`；保存日报必须通过：

```ts
repositories.reports.getByDateAndType(date, "daily")
```

读取，不再调用无类型约束的 `getByDate(date)`。

- [ ] **Step 2: 运行历史测试并确认 RED**

Run:

```powershell
& 'C:\Program Files\HBuilderX\plugins\npm\npm.cmd' exec vitest -- run tests\unit\dashboard-history.test.ts --config vitest.config.ts
```

Expected: `reportContent` 缺失或未调用 `getByDateAndType` 导致 FAIL。

- [ ] **Step 3: 扩展历史类型和查询**

`DailyHistoryDay` 增加：

```ts
reportContent: string | null;
```

`buildDashboardHistory()` 默认天数改为 `today.getUTCDay() || 7`，即周一到今天；
显式传入 `days` 时保留测试和调用兼容性。日报查询改为：

```ts
const report = options.repositories.reports.getByDateAndType(date, "daily");
```

返回 `reportContent: report?.content ?? null`。

- [ ] **Step 4: 运行历史测试并确认 GREEN**

重复 Step 2 命令。

Expected: 历史测试全部 PASS。

### Task 4: 报告页历史查看与只读保护

**Files:**
- Modify: `src/renderer/pages/reportsViewModel.ts`
- Modify: `tests/unit/reports-view-model.test.ts`
- Modify: `src/renderer/pages/ReportsPage.vue`

- [ ] **Step 1: 写报告库视图模型失败测试**

新增 `buildReportLibraryView()` 测试，输入今天草稿及自然周历史后，期望：

- 今天始终是第一项且 `readOnly: false`。
- 周一到昨天只保留 `reportContent` 非空的已保存日报。
- 历史日报包含正文并且 `readOnly: true`。

新增 `resolveSelectedReportDate()` 测试：

```ts
expect(resolveSelectedReportDate("2026-07-07", reports, "2026-07-08"))
  .toBe("2026-07-07");
```

确保自动刷新保留仍存在的历史选择；选择不存在时回退今天。

- [ ] **Step 2: 运行视图模型测试并确认 RED**

Run:

```powershell
& 'C:\Program Files\HBuilderX\plugins\npm\npm.cmd' exec vitest -- run tests\unit\reports-view-model.test.ts --config vitest.config.ts
```

Expected: 新函数或新字段尚不存在导致 FAIL。

- [ ] **Step 3: 实现报告库视图模型**

列表项统一为：

```ts
export interface ReportListItem {
  id: string;
  date: string;
  status: string;
  count: number;
  content: string;
  readOnly: boolean;
}
```

`buildReportLibraryView()` 合并今天和历史日报并过滤空白历史项。
`resolveSelectedReportDate()` 在刷新后保留有效选择，否则回退今天。

- [ ] **Step 4: 接入报告页**

`loadReports()` 使用：

```ts
const [today, history] = await Promise.all([
  dashboard.getToday(),
  dashboard.getHistory()
]);
```

报告行改为可点击按钮并增加 active 状态。今天使用独立草稿状态；历史内容从列表项读取。
历史选中时 textarea 设置 `readonly`，保存按钮设置 `disabled`，复制保持可用。
刷新时通过 `resolveSelectedReportDate()` 保留历史选择。

- [ ] **Step 5: UTF-8 回读 Vue 和中文提示**

Run:

```powershell
Get-Content -LiteralPath 'src\renderer\pages\ReportsPage.vue' -Encoding UTF8 |
  Select-String -Pattern '历史日报只读|dashboard.getHistory|readonly'
```

Expected: 中文文案无乱码，历史接口和只读属性存在。

- [ ] **Step 6: 运行视图模型测试和类型检查**

Run:

```powershell
& 'C:\Program Files\HBuilderX\plugins\npm\npm.cmd' exec vitest -- run tests\unit\reports-view-model.test.ts tests\unit\dashboard-history.test.ts --config vitest.config.ts
& 'C:\Program Files\HBuilderX\plugins\npm\npm.cmd' run lint
```

Expected: 测试全部 PASS，类型检查退出码为 0。

### Task 5: 完整验证

**Files:**
- Verify all modified files

- [ ] **Step 1: 运行全部单元测试**

Run:

```powershell
& 'C:\Program Files\HBuilderX\plugins\npm\npm.cmd' test -- tests/unit
```

Expected: 所有单元测试 PASS。

- [ ] **Step 2: 运行生产构建**

Run:

```powershell
& 'C:\nvm4w\nodejs\npm.cmd' run build
```

Expected: `vue-tsc --noEmit` 和 `electron-vite build` 均退出码为 0。

- [ ] **Step 3: 检查差异**

Run:

```powershell
git diff --check
git status --short
```

Expected: `git diff --check` 退出码为 0；状态只包含本次计划、依赖、AI 解析和报告历史相关文件。
