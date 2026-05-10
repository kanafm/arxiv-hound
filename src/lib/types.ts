/**
 * Core types shared across clients, tools, and entry points.
 */

export interface Paper {
  id: string;
  version?: string;
  title: string;
  authors: string[];
  abstract: string;
  categories: string[];
  primaryCategory?: string;
  published: string;
  updated: string;
  pdfUrl: string;
  absUrl: string;
  comment?: string;
  journalRef?: string;
  tldr?: string;
  citationCount?: number;
}

export type SortField = "relevance" | "submitted" | "updated";

export interface SearchOptions {
  max?: number;
  start?: number;
  category?: string;
  sort?: SortField;
  sortOrder?: "asc" | "desc";
}

export type FetchSource = "html" | "ar5iv" | "pdf" | "cache";

export interface FetchResult {
  id: string;
  version?: string;
  source: FetchSource;
  markdown: string;
  cachePath: string;
}

export interface CitationRef {
  paperId?: string;
  arxivId?: string;
  title?: string;
  authors?: string[];
  year?: number;
  url?: string;
}

export interface CitationsResult {
  references: CitationRef[];
  citers: CitationRef[];
}

export interface SimilarPaper {
  paperId?: string;
  arxivId?: string;
  title: string;
  authors: string[];
  year?: number;
  abstract?: string;
  tldr?: string;
  citationCount?: number;
}
