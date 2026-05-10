import { z } from "zod";
import { fetchContent } from "../client/content.js";
import { defineTool } from "../tool.js";

const inputSchema = {
  id: z
    .string()
    .min(1)
    .describe('arXiv ID, e.g. "2402.08954" or an old-style id like "cs/9901001".'),
  version: z
    .string()
    .regex(/^v\d+$/)
    .optional()
    .describe('Optional version tag, e.g. "v2". Omit for the latest version.'),
  forceRefresh: z
    .boolean()
    .optional()
    .default(false)
    .describe("If true, ignore the local cache and re-fetch.")
};

export const fetchTool = defineTool({
  name: "fetch",
  description:
    "Fetch the full text of an arXiv paper as markdown. Tries the native HTML rendering, then ar5iv, then the PDF. Results are cached locally so repeat reads are free.",
  inputSchema,
  handler: async (input) =>
    fetchContent(input.id, input.version, { forceRefresh: input.forceRefresh })
});
