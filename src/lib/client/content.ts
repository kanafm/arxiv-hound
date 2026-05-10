/**
 * Paper-content fetch chain. Tries the native arxiv.org HTML rendering
 * first, falls back to ar5iv.labs.arxiv.org, then to the PDF extracted
 * with pdfjs-dist. The first hit is converted to markdown and cached.
 */

import TurndownService from "turndown";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { withArxivRateLimit } from "../utils/rate-limit.js";
import { readCache, writeCache, cachePath } from "../utils/cache.js";
import type { FetchResult, FetchSource } from "../types.js";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-"
});

turndown.remove(["script", "style", "nav", "header", "footer"]);

function fullId(id: string, version?: string): string {
  return version ? `${id}${version}` : id;
}

async function tryArxivHtml(id: string, version?: string): Promise<string | null> {
  const url = `https://arxiv.org/html/${fullId(id, version)}`;
  return withArxivRateLimit(async () => {
    const res = await fetch(url, { redirect: "follow" });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const text = await res.text();
    if (text.includes("HTML is not available for the source")) return null;
    return text;
  });
}

async function tryAr5iv(id: string, version?: string): Promise<string | null> {
  const url = `https://ar5iv.labs.arxiv.org/html/${fullId(id, version)}`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) return null;
  const text = await res.text();
  if (text.includes("No paper")) return null;
  return text;
}

async function tryPdf(id: string, version?: string): Promise<string | null> {
  const url = `https://arxiv.org/pdf/${fullId(id, version)}`;
  const data = await withArxivRateLimit(async () => {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  });
  if (!data) return null;

  const doc = await pdfjs.getDocument({ data, disableFontFace: true }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    parts.push(text);
  }
  await doc.destroy();
  return parts.join("\n\n").trim();
}

function htmlToMarkdown(html: string): string {
  return turndown.turndown(html).replace(/\n{3,}/g, "\n\n").trim();
}

export interface FetchContentOptions {
  forceRefresh?: boolean;
}

/**
 * Fetch a paper as markdown, trying HTML, ar5iv, and PDF in order. Caches
 * the first successful result under the cache directory.
 */
export async function fetchContent(
  id: string,
  version?: string,
  opts: FetchContentOptions = {}
): Promise<FetchResult> {
  if (!opts.forceRefresh) {
    const cached = await readCache(id, version);
    if (cached) {
      return {
        id,
        version,
        source: "cache",
        markdown: cached,
        cachePath: cachePath(id, version)
      };
    }
  }

  const attempts: Array<{ source: FetchSource; fn: () => Promise<string | null> }> = [
    { source: "html", fn: () => tryArxivHtml(id, version) },
    { source: "ar5iv", fn: () => tryAr5iv(id, version) },
    { source: "pdf", fn: () => tryPdf(id, version) }
  ];

  for (const { source, fn } of attempts) {
    const raw = await fn();
    if (!raw) continue;
    const markdown = source === "pdf" ? raw : htmlToMarkdown(raw);
    await writeCache(id, markdown, version);
    return {
      id,
      version,
      source,
      markdown,
      cachePath: cachePath(id, version)
    };
  }

  throw new Error(`No content available for arXiv paper ${fullId(id, version)}`);
}
