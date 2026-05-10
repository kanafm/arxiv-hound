/**
 * Semantic Scholar Graph API client. Fails gracefully (returns the input
 * untouched on enrichment errors) so the rest of the MCP keeps working
 * even when S2 is rate-limiting or down. Pass an API key via the
 * ARXIV_HOUND_S2_KEY env var for higher rate limits.
 *
 * @see https://api.semanticscholar.org/api-docs/graph
 */

import type { CitationRef, CitationsResult, Paper, SimilarPaper } from "../types.js";

const GRAPH_BASE = "https://api.semanticscholar.org/graph/v1";
const REC_BASE = "https://api.semanticscholar.org/recommendations/v1";

function headers(): Record<string, string> {
  const key = process.env.ARXIV_HOUND_S2_KEY;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (key) h["x-api-key"] = key;
  return h;
}

/**
 * Fetch wrapper that retries once on a 429 honoring Retry-After. The
 * unauthenticated S2 pool 429s often; one retry is usually enough.
 */
async function s2Fetch(url: string, init: RequestInit = {}): Promise<Response> {
  const baseHeaders = headers();
  const callerHeaders = (init.headers as Record<string, string> | undefined) ?? {};
  const req: RequestInit = {
    ...init,
    headers: { ...baseHeaders, ...callerHeaders }
  };
  const res = await fetch(url, req);
  if (res.status !== 429) return res;

  const retryAfter = Number.parseInt(res.headers.get("retry-after") ?? "3", 10);
  const waitMs = (Number.isFinite(retryAfter) ? retryAfter : 3) * 1000;
  await new Promise((r) => setTimeout(r, waitMs));
  return await fetch(url, req);
}

function s2Error(label: string, res: Response, body: string): Error {
  if (res.status === 429) {
    return new Error(
      `${label}: Semantic Scholar rate-limited the request (429). Set ARXIV_HOUND_S2_KEY to use a dedicated quota; request a free key at https://www.semanticscholar.org/product/api.`
    );
  }
  return new Error(`${label}: Semantic Scholar ${res.status}${body ? `: ${body}` : ""}`);
}

interface S2Author {
  name?: string;
}

interface S2Paper {
  paperId?: string;
  externalIds?: { ArXiv?: string; DOI?: string };
  title?: string;
  abstract?: string;
  year?: number;
  authors?: S2Author[];
  tldr?: { text: string; model?: string } | null;
  citationCount?: number;
  references?: S2Paper[];
  citations?: S2Paper[];
}

function s2ToCitationRef(s2: S2Paper): CitationRef {
  const arxivId = s2.externalIds?.ArXiv;
  return {
    paperId: s2.paperId,
    arxivId,
    title: s2.title,
    authors: s2.authors?.map((a) => a.name).filter((n): n is string => Boolean(n)),
    year: s2.year,
    url: arxivId
      ? `https://arxiv.org/abs/${arxivId}`
      : s2.paperId
        ? `https://www.semanticscholar.org/paper/${s2.paperId}`
        : undefined
  };
}

/**
 * Decorate arXiv papers with Semantic Scholar TLDRs and citation counts.
 * On any S2 error, returns the input papers unchanged.
 */
export async function enrichWithTldr(papers: Paper[]): Promise<Paper[]> {
  if (papers.length === 0) return papers;
  try {
    const res = await s2Fetch(`${GRAPH_BASE}/paper/batch?fields=tldr,citationCount`, {
      method: "POST",
      body: JSON.stringify({ ids: papers.map((p) => `ARXIV:${p.id}`) })
    });
    if (!res.ok) return papers;
    const data = (await res.json()) as Array<S2Paper | null>;
    return papers.map((p, i) => {
      const s2 = data[i];
      if (!s2) return p;
      return {
        ...p,
        tldr: s2.tldr?.text ?? p.tldr,
        citationCount: s2.citationCount ?? p.citationCount
      };
    });
  } catch {
    return papers;
  }
}

/**
 * Fetch the reference list and the list of papers that cite this one.
 */
export async function getCitations(id: string): Promise<CitationsResult> {
  const fields = [
    "references.paperId",
    "references.externalIds",
    "references.title",
    "references.authors",
    "references.year",
    "citations.paperId",
    "citations.externalIds",
    "citations.title",
    "citations.authors",
    "citations.year"
  ].join(",");
  const url = `${GRAPH_BASE}/paper/ARXIV:${encodeURIComponent(id)}?fields=${fields}`;
  const res = await s2Fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw s2Error(`citations for ${id}`, res, body);
  }
  const data = (await res.json()) as S2Paper;
  return {
    references: (data.references ?? []).map(s2ToCitationRef),
    citers: (data.citations ?? []).map(s2ToCitationRef)
  };
}

/**
 * Find papers semantically similar to the given arXiv paper, ranked by
 * Semantic Scholar's SPECTER2 embedding model. The recommendations endpoint
 * does not support `tldr`, so similar papers come without it; pass them
 * through `enrichWithTldr` if you need TLDRs.
 */
export async function getSimilar(id: string, max: number): Promise<SimilarPaper[]> {
  const fields = [
    "paperId",
    "externalIds",
    "title",
    "authors",
    "year",
    "abstract",
    "citationCount"
  ].join(",");
  const url = `${REC_BASE}/papers/forpaper/ARXIV:${encodeURIComponent(id)}?limit=${max}&fields=${fields}`;
  const res = await s2Fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw s2Error(`recommendations for ${id}`, res, body);
  }
  const data = (await res.json()) as { recommendedPapers?: S2Paper[] };
  return (data.recommendedPapers ?? []).map((s2) => ({
    paperId: s2.paperId,
    arxivId: s2.externalIds?.ArXiv,
    title: s2.title ?? "(untitled)",
    authors:
      s2.authors?.map((a) => a.name).filter((n): n is string => Boolean(n)) ?? [],
    year: s2.year,
    abstract: s2.abstract,
    citationCount: s2.citationCount
  }));
}
