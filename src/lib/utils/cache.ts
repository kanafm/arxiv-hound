/**
 * Local markdown cache for fetched papers. Lives at
 * `${ARXIV_HOUND_CACHE || XDG_CACHE_HOME/arxiv-hound || ~/.cache/arxiv-hound}`.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

function resolveDefaultDir(): string {
  const override = process.env.ARXIV_HOUND_CACHE;
  if (override) return override;
  const xdg = process.env.XDG_CACHE_HOME;
  if (xdg) return join(xdg, "arxiv-hound");
  return join(homedir(), ".cache", "arxiv-hound");
}

let cacheDir: string | null = null;

export function getCacheDir(): string {
  if (cacheDir === null) cacheDir = resolveDefaultDir();
  return cacheDir;
}

export function setCacheDir(dir: string): void {
  cacheDir = dir;
}

function safeKey(id: string, version?: string): string {
  const v = version ?? "";
  return `${id}${v}`.replace(/[\/\\]/g, "_");
}

export function cachePath(id: string, version?: string): string {
  return join(getCacheDir(), `${safeKey(id, version)}.md`);
}

export async function readCache(id: string, version?: string): Promise<string | null> {
  try {
    return await readFile(cachePath(id, version), "utf-8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

export async function writeCache(
  id: string,
  markdown: string,
  version?: string
): Promise<void> {
  const p = cachePath(id, version);
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, markdown, "utf-8");
}
