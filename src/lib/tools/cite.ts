import { z } from "zod";
import { getMetadata } from "../client/arxiv.js";
import { toBibtex } from "../utils/bibtex.js";
import { defineTool } from "../tool.js";

const inputSchema = {
  id: z.string().min(1).describe('arXiv ID, e.g. "2402.08954".'),
  style: z
    .enum(["bibtex"])
    .default("bibtex")
    .describe('Citation style. Only "bibtex" is supported for now.')
};

export const cite = defineTool({
  name: "cite",
  description:
    "Generate a citation for an arXiv paper. Returns a BibTeX @misc entry by default.",
  inputSchema,
  handler: async (input) => {
    const papers = await getMetadata([input.id]);
    const paper = papers[0];
    if (!paper) {
      throw new Error(`No arXiv metadata found for id: ${input.id}`);
    }
    return { id: input.id, style: input.style, bibtex: toBibtex(paper) };
  }
});
