/**
 * arXiv Query API client.
 *
 * Honors the 3-second-between-requests etiquette via a process-wide mutex.
 * Parses Atom XML responses. Retries once on 429 / 503 using the Retry-After
 * header when present.
 *
 * @see https://info.arxiv.org/help/api/user-manual.html
 */

import { XMLParser } from "fast-xml-parser";
import { withArxivRateLimit } from "../utils/rate-limit.js";
import type { Paper, SearchOptions } from "../types.js";

const API_BASE = "https://export.arxiv.org/api/query";

/**
 * One GET against the arXiv API. Retries once on 429 / 503 honoring Retry-After.
 */
async function arxivFetch(url: string): Promise<string> {
  return withArxivRateLimit(async () => {
    const res = await fetch(url);
    if (res.status === 429 || res.status === 503) {
      const header = res.headers.get("retry-after");
      const seconds = header ? Number.parseInt(header, 10) : 5;
      const waitMs = Number.isFinite(seconds) ? seconds * 1000 : 5000;
      await new Promise((r) => setTimeout(r, waitMs));
      const retry = await fetch(url);
      if (!retry.ok) {
        throw new Error(`arXiv ${retry.status} after Retry-After for ${url}`);
      }
      return await retry.text();
    }
    if (!res.ok) {
      throw new Error(`arXiv ${res.status} for ${url}`);
    }
    return await res.text();
  });
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  isArray: (name) => ["entry", "author", "category", "link"].includes(name)
});

interface RawLink {
  "@_href": string;
  "@_rel"?: string;
  "@_title"?: string;
  "@_type"?: string;
}

interface RawEntry {
  id: string;
  title: string;
  summary: string;
  author?: Array<{ name: string }>;
  category?: Array<{ "@_term": string }>;
  primary_category?: { "@_term": string };
  published: string;
  updated: string;
  link?: RawLink[];
  comment?: string;
  journal_ref?: string;
}

function parseIdFromUrl(url: string): { id: string; version?: string } {
  const m = url.match(/abs\/(.+?)(v\d+)?$/);
  if (!m || !m[1]) {
    throw new Error(`Cannot parse arXiv id from URL: ${url}`);
  }
  return { id: m[1], version: m[2] };
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function rawToPaper(raw: RawEntry): Paper {
  const { id, version } = parseIdFromUrl(raw.id);
  const links = raw.link ?? [];
  const pdfLink = links.find(
    (l) => l["@_title"] === "pdf" || l["@_type"] === "application/pdf"
  );
  const absLink = links.find((l) => l["@_rel"] === "alternate");
  return {
    id,
    version,
    title: normalizeWhitespace(raw.title),
    authors: (raw.author ?? []).map((a) => a.name),
    abstract: normalizeWhitespace(raw.summary),
    categories: (raw.category ?? []).map((c) => c["@_term"]),
    primaryCategory: raw.primary_category?.["@_term"],
    published: raw.published,
    updated: raw.updated,
    pdfUrl: pdfLink?.["@_href"] ?? `https://arxiv.org/pdf/${id}`,
    absUrl: absLink?.["@_href"] ?? `https://arxiv.org/abs/${id}`,
    comment: raw.comment ? normalizeWhitespace(raw.comment) : undefined,
    journalRef: raw.journal_ref ? normalizeWhitespace(raw.journal_ref) : undefined
  };
}

function parseFeed(xml: string): Paper[] {
  const parsed = parser.parse(xml) as { feed?: { entry?: RawEntry[] } };
  return (parsed.feed?.entry ?? []).map(rawToPaper);
}

const SORT_MAP: Record<NonNullable<SearchOptions["sort"]>, string> = {
  relevance: "relevance",
  submitted: "submittedDate",
  updated: "lastUpdatedDate"
};

/**
 * Search arXiv. Returns up to `opts.max` papers (default 10) for the given query.
 * Supports an optional category filter (e.g. "cs.LG") and sort field.
 */
export async function searchPapers(
  query: string,
  opts: SearchOptions = {}
): Promise<Paper[]> {
  const params = new URLSearchParams();
  const q = opts.category ? `(${query}) AND cat:${opts.category}` : query;
  params.set("search_query", q);
  params.set("start", String(opts.start ?? 0));
  params.set("max_results", String(opts.max ?? 10));
  if (opts.sort) {
    params.set("sortBy", SORT_MAP[opts.sort]);
    params.set("sortOrder", opts.sortOrder === "asc" ? "ascending" : "descending");
  }
  const xml = await arxivFetch(`${API_BASE}?${params.toString()}`);
  return parseFeed(xml);
}

/**
 * Look up metadata for a batch of arXiv IDs in a single API round-trip.
 * Each id should be the bare identifier (e.g. "2402.08954" or "2402.08954v3").
 */
export async function getMetadata(ids: string[]): Promise<Paper[]> {
  if (ids.length === 0) return [];
  const params = new URLSearchParams();
  params.set("id_list", ids.join(","));
  params.set("max_results", String(ids.length));
  const xml = await arxivFetch(`${API_BASE}?${params.toString()}`);
  return parseFeed(xml);
}
