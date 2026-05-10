import { z } from "zod";
import { getCitations } from "../client/semantic-scholar.js";
import { defineTool } from "../tool.js";

const inputSchema = {
  id: z.string().min(1).describe('arXiv ID, e.g. "2402.08954".')
};

export const citations = defineTool({
  name: "citations",
  description:
    "Get the reference list and the list of papers that cite the given arXiv paper, sourced from Semantic Scholar.",
  inputSchema,
  handler: async (input) => getCitations(input.id)
});
