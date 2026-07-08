import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  discoverGitRepositories,
  formatGitActivityMarkdown,
  summarizeGitRepositories,
  type GitCommandRunner
} from "../../src/main/services/git/gitActivity";

const cleanupPaths: string[] = [];

afterEach(async () => {
  while (cleanupPaths.length > 0) {
    const path = cleanupPaths.pop();
    if (path) {
      await rm(path, { recursive: true, force: true });
    }
  }
});

describe("git activity", () => {
  it("discovers git repositories from configured roots without descending into ignored folders", async () => {
    const root = await mkdtemp(join(tmpdir(), "daily-assistant-git-"));
    cleanupPaths.push(root);
    const repo = join(root, "client-app");
    const ignoredRepo = join(root, "node_modules", "nested-app");

    await mkdir(join(repo, ".git"), { recursive: true });
    await mkdir(join(ignoredRepo, ".git"), { recursive: true });
    await writeFile(join(root, "README.md"), "not a repository", "utf8");

    const repositories = await discoverGitRepositories({
      roots: [root],
      maxDepth: 2
    });

    expect(repositories).toEqual([repo]);
  });

  it("summarizes today's commits and working tree changes without reading file contents", async () => {
    const runGit = vi.fn<GitCommandRunner>(async (repoPath, args) => {
      const command = args.join(" ");
      if (command === "rev-parse --abbrev-ref HEAD") {
        return { exitCode: 0, stdout: "main\n", stderr: "" };
      }
      if (command.startsWith("log --since=")) {
        return { exitCode: 0, stdout: "feat: add code report mode\nfix: persist report draft\n", stderr: "" };
      }
      if (command === "status --short") {
        return { exitCode: 0, stdout: " M src/main/ipc/dashboardReport.ts\nA  tests/unit/git-activity.test.ts\n", stderr: "" };
      }
      if (command === "diff --stat -- .") {
        return { exitCode: 0, stdout: " src/main/ipc/dashboardReport.ts | 12 +++++++++---\n", stderr: "" };
      }
      if (command === "diff --cached --stat -- .") {
        return { exitCode: 0, stdout: " tests/unit/git-activity.test.ts | 28 ++++++++++++++++++++++++++++\n", stderr: "" };
      }
      throw new Error(`Unexpected git command in ${repoPath}: ${command}`);
    });

    const summary = await summarizeGitRepositories({
      repositories: ["C:/project/client-app"],
      now: () => new Date("2026-07-08T12:00:00.000Z"),
      runGit
    });

    expect(summary.repositories).toHaveLength(1);
    expect(summary.repositories[0]).toMatchObject({
      name: "client-app",
      branch: "main",
      commits: ["feat: add code report mode", "fix: persist report draft"],
      changedFiles: ["M src/main/ipc/dashboardReport.ts", "A tests/unit/git-activity.test.ts"]
    });
    expect(summary.repositories[0].diffStats.join("\n")).toContain("dashboardReport.ts");
    expect(runGit).not.toHaveBeenCalledWith(expect.any(String), expect.arrayContaining(["show"]), expect.anything());
  });

  it("formats git activity as a concise Chinese markdown section", () => {
    const markdown = formatGitActivityMarkdown({
      generatedAt: "2026-07-08T12:00:00.000Z",
      repositories: [
        {
          path: "C:/project/client-app",
          name: "client-app",
          branch: "main",
          commits: ["feat: add code report mode"],
          changedFiles: ["M src/main/ipc/dashboardReport.ts"],
          diffStats: [" src/main/ipc/dashboardReport.ts | 12 +++++++++---"]
        }
      ]
    });

    expect(markdown).toContain("## 代码工作总结");
    expect(markdown).toContain("client-app");
    expect(markdown).toContain("feat: add code report mode");
    expect(markdown).toContain("dashboardReport.ts");
  });
});
