import { z } from "zod";
import { getMetadata } from "../client/arxiv.js";
import { defineTool } from "../tool.js";

const inputSchema = {
  ids: z
    .array(z.string().min(1))
    .min(1)
    .max(100)
    .describe(
      'Array of arXiv IDs to look up in a single batched call, e.g. ["2402.08954", "1706.03762"]. Up to 100 per call.'
    )
};

export const metadata = defineTool({
  name: "metadata",
  description:
    "Look up metadata for a batch of arXiv papers in a single round-trip. Returns titles, authors, abstracts, categories, and dates for each ID.",
  inputSchema,
  handler: async (input) => {
    const papers = await getMetadata(input.ids);
    return { count: papers.length, papers };
  }
});
