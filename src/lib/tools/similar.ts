import { z } from "zod";
import { getSimilar } from "../client/semantic-scholar.js";
import { defineTool } from "../tool.js";

const inputSchema = {
  id: z.string().min(1).describe('arXiv ID, e.g. "2402.08954".'),
  max: z
    .number()
    .int()
    .positive()
    .max(50)
    .default(10)
    .describe("Max similar papers to return (1 to 50).")
};

export const similar = defineTool({
  name: "similar",
  description:
    "Find papers semantically similar to the given arXiv paper, ranked by Semantic Scholar SPECTER2 embeddings.",
  inputSchema,
  handler: async (input) => {
    const papers = await getSimilar(input.id, input.max);
    return { count: papers.length, papers };
  }
});
