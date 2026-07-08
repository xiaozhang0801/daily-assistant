import { execFile } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";

export interface GitCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export type GitCommandRunner = (
  repoPath: string,
  args: string[],
  options?: { timeoutMs?: number }
) => Promise<GitCommandResult>;

export interface GitRepositoryActivity {
  path: string;
  name: string;
  branch: string;
  commits: string[];
  changedFiles: string[];
  diffStats: string[];
}

export interface GitActivitySummary {
  generatedAt: string;
  repositories: GitRepositoryActivity[];
}

interface DiscoverGitRepositoriesOptions {
  roots: string[];
  maxDepth?: number;
  maxRepositories?: number;
}

interface SummarizeGitRepositoriesOptions {
  repositories: string[];
  now?: () => Date;
  runGit?: GitCommandRunner;
}

interface CollectGitActivityOptions {
  roots?: string[];
  now?: () => Date;
  runGit?: GitCommandRunner;
}

const ignoredDirectoryNames = new Set([
  ".git",
  ".hg",
  ".svn",
  ".next",
  ".nuxt",
  ".vite",
  "dist",
  "out",
  "build",
  "node_modules",
  "AppData"
]);

export const runGitCommand: GitCommandRunner = (repoPath, args, options = {}) =>
  new Promise((resolveResult) => {
    execFile(
      "git",
      args,
      {
        cwd: repoPath,
        timeout: options.timeoutMs ?? 6_000,
        windowsHide: true,
        maxBuffer: 512 * 1024
      },
      (error, stdout, stderr) => {
        resolveResult({
          exitCode: error ? Number((error as NodeJS.ErrnoException).code ?? 1) || 1 : 0,
          stdout: stdout.toString(),
          stderr: stderr.toString()
        });
      }
    );
  });

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

async function isGitRepository(path: string): Promise<boolean> {
  return pathExists(join(path, ".git"));
}

function uniquePaths(paths: string[]): string[] {
  return Array.from(new Set(paths.map((path) => resolve(path))));
}

export function defaultGitSearchRoots(): string[] {
  const roots = [process.cwd(), resolve(process.cwd(), ".."), join(homedir(), "Desktop"), join(homedir(), "Documents")];

  if (process.platform === "win32") {
    roots.push("C:\\project");
  }

  return uniquePaths(roots);
}

export async function discoverGitRepositories(options: DiscoverGitRepositoriesOptions): Promise<string[]> {
  const maxDepth = options.maxDepth ?? 2;
  const maxRepositories = options.maxRepositories ?? 12;
  const repositories: string[] = [];
  const visited = new Set<string>();

  async function walk(directory: string, depth: number): Promise<void> {
    if (repositories.length >= maxRepositories) return;

    const absolutePath = resolve(directory);
    if (visited.has(absolutePath)) return;
    visited.add(absolutePath);

    if (!(await isDirectory(absolutePath))) return;

    if (await isGitRepository(absolutePath)) {
      repositories.push(absolutePath);
      return;
    }

    if (depth >= maxDepth) return;

    const entries = await readdir(absolutePath, { withFileTypes: true }).catch(() => []);

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (ignoredDirectoryNames.has(entry.name)) continue;
      await walk(join(absolutePath, entry.name), depth + 1);
    }
  }

  for (const root of uniquePaths(options.roots)) {
    await walk(root, 0);
  }

  return repositories.sort((left, right) => left.localeCompare(right));
}

function startOfLocalDay(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
}

function cleanLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeStatusLine(line: string): string | null {
  const raw = line.trimEnd();
  if (!raw.trim()) return null;
  const status = raw.slice(0, 2).trim();
  const file = raw.slice(2).trim();
  if (!status || !file) return null;
  return `${status} ${file}`;
}

async function gitOutput(runGit: GitCommandRunner, repoPath: string, args: string[]): Promise<string> {
  const result = await runGit(repoPath, args, { timeoutMs: 6_000 });
  return result.exitCode === 0 ? result.stdout : "";
}

export async function summarizeGitRepositories(options: SummarizeGitRepositoriesOptions): Promise<GitActivitySummary> {
  const now = options.now ?? (() => new Date());
  const generatedAt = now();
  const runGit = options.runGit ?? runGitCommand;
  const since = startOfLocalDay(generatedAt);
  const repositories: GitRepositoryActivity[] = [];

  for (const repoPath of options.repositories) {
    const branch = cleanLines(await gitOutput(runGit, repoPath, ["rev-parse", "--abbrev-ref", "HEAD"]))[0] ?? "";
    const commits = cleanLines(
      await gitOutput(runGit, repoPath, ["log", `--since=${since}`, "--pretty=format:%s", "--no-merges", "--max-count=12"])
    );
    const changedFiles = cleanLines(await gitOutput(runGit, repoPath, ["status", "--short"]))
      .map(normalizeStatusLine)
      .filter((line): line is string => Boolean(line))
      .slice(0, 24);
    const diffStats = [
      ...cleanLines(await gitOutput(runGit, repoPath, ["diff", "--stat", "--", "."])),
      ...cleanLines(await gitOutput(runGit, repoPath, ["diff", "--cached", "--stat", "--", "."]))
    ].slice(0, 20);

    if (commits.length === 0 && changedFiles.length === 0 && diffStats.length === 0) {
      continue;
    }

    repositories.push({
      path: repoPath,
      name: basename(repoPath),
      branch,
      commits,
      changedFiles,
      diffStats
    });
  }

  return {
    generatedAt: generatedAt.toISOString(),
    repositories
  };
}

export async function collectGitActivity(options: CollectGitActivityOptions = {}): Promise<GitActivitySummary> {
  const now = options.now ?? (() => new Date());
  const repositories = await discoverGitRepositories({
    roots: options.roots ?? defaultGitSearchRoots(),
    maxDepth: 2,
    maxRepositories: 12
  });

  return summarizeGitRepositories({
    repositories,
    now,
    runGit: options.runGit
  });
}

export function formatGitActivityMarkdown(summary: GitActivitySummary): string {
  const lines = ["## 代码工作总结", ""];

  if (summary.repositories.length === 0) {
    lines.push("- 未发现今日 Git 提交或工作区变更。");
    return lines.join("\n");
  }

  for (const repository of summary.repositories) {
    const branchLabel = repository.branch ? `（${repository.branch}）` : "";
    lines.push(`### ${repository.name}${branchLabel}`);

    if (repository.commits.length > 0) {
      lines.push("- 今日提交：");
      for (const commit of repository.commits) {
        lines.push(`  - ${commit}`);
      }
    }

    if (repository.changedFiles.length > 0) {
      lines.push("- 当前变更文件：");
      for (const file of repository.changedFiles) {
        lines.push(`  - ${file}`);
      }
    }

    if (repository.diffStats.length > 0) {
      lines.push("- 变更规模：");
      for (const statLine of repository.diffStats.slice(0, 8)) {
        lines.push(`  - ${statLine}`);
      }
    }

    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
