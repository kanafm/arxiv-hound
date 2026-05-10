/**
 * Pure metadata-to-BibTeX conversion. No network, no I/O.
 *
 * Emits `@misc` entries since arXiv preprints aren't journal articles; if
 * the paper has a journalRef we still keep `@misc` and surface the journal
 * as a `journal` field so downstream BibTeX tooling can promote the type.
 */

import type { Paper } from "../types.js";

function authorToBibtex(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0] ?? "";
  const last = parts[parts.length - 1]!;
  const first = parts.slice(0, -1).join(" ");
  return `${last}, ${first}`;
}

function asciiSlug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function bibtexKey(paper: Paper): string {
  const firstAuthor = paper.authors[0] ?? "anon";
  const last = firstAuthor.trim().split(/\s+/).pop() ?? "anon";
  const year = paper.published.slice(0, 4);
  const firstWord = (paper.title.split(/\s+/)[0] ?? "paper").toLowerCase();
  return `${asciiSlug(last)}${year}${asciiSlug(firstWord)}`;
}

function escapeFieldValue(s: string): string {
  return s.replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Generate a BibTeX `@misc` entry for an arXiv paper.
 */
export function toBibtex(paper: Paper): string {
  const key = bibtexKey(paper);
  const year = paper.published.slice(0, 4);
  const authors = paper.authors.map(authorToBibtex).join(" and ");
  const eprint = `${paper.id}${paper.version ?? ""}`;

  const fields: Array<[string, string]> = [
    ["title", paper.title],
    ["author", authors],
    ["year", year],
    ["eprint", eprint],
    ["archivePrefix", "arXiv"]
  ];
  if (paper.primaryCategory) fields.push(["primaryClass", paper.primaryCategory]);
  if (paper.absUrl) fields.push(["url", paper.absUrl]);
  if (paper.journalRef) fields.push(["journal", paper.journalRef]);

  const body = fields
    .map(([k, v]) => `  ${k} = {${escapeFieldValue(v)}}`)
    .join(",\n");
  return `@misc{${key},\n${body}\n}`;
}
