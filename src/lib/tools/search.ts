import { z } from "zod";
import { searchPapers } from "../client/arxiv.js";
import { enrichWithTldr } from "../client/semantic-scholar.js";
import { defineTool } from "../tool.js";

const inputSchema = {
  query: z
    .string()
    .min(1)
    .describe(
      "Search query. Supports arXiv field prefixes (ti:, au:, abs:, cat:, all:) and Boolean operators (AND, OR, ANDNOT)."
    ),
  max: z
    .number()
    .int()
    .positive()
    .max(50)
    .default(10)
    .describe("Max papers to return (1 to 50)."),
  category: z
    .string()
    .optional()
    .describe('Optional arXiv category filter, e.g. "cs.LG".'),
  sort: z
    .enum(["relevance", "submitted", "updated"])
    .optional()
    .describe("Sort field. Default is relevance."),
  sortOrder: z
    .enum(["asc", "desc"])
    .optional()
    .describe("Sort direction. Default is descending.")
};

export const search = defineTool({
  name: "search",
  description:
    "Search arXiv for papers. Returns titles, authors, abstracts, and arXiv IDs that an LLM can pass to fetch, similar, citations, or cite.",
  inputSchema,
  handler: async (input) => {
    const raw = await searchPapers(input.query, {
      max: input.max,
      category: input.category,
      sort: input.sort,
      sortOrder: input.sortOrder
    });
    const papers = await enrichWithTldr(raw);
    return { count: papers.length, papers };
  }
});
