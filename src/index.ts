/**
 * Public library surface for arxiv-hound. Importers get the same handlers
 * the MCP server and CLI use.
 */

export { searchPapers, getMetadata } from "./lib/client/arxiv.js";
export { fetchContent } from "./lib/client/content.js";
export type { FetchContentOptions } from "./lib/client/content.js";
export {
  enrichWithTldr,
  getCitations,
  getSimilar
} from "./lib/client/semantic-scholar.js";
export { getCacheDir, setCacheDir, cachePath } from "./lib/utils/cache.js";
export { toBibtex } from "./lib/utils/bibtex.js";
export type {
  Paper,
  SearchOptions,
  SortField,
  FetchResult,
  FetchSource,
  CitationRef,
  CitationsResult,
  SimilarPaper
} from "./lib/types.js";
