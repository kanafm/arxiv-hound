/**
 * Registry of every tool the server and CLI expose. New tools should be
 * imported here so both surfaces pick them up automatically.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RegisterableTool } from "../tool.js";
import { search } from "./search.js";
import { metadata } from "./metadata.js";
import { fetchTool } from "./fetch.js";
import { similar } from "./similar.js";
import { citations } from "./citations.js";
import { cite } from "./cite.js";

export const tools: RegisterableTool[] = [
  search,
  metadata,
  fetchTool,
  similar,
  citations,
  cite
];

export function registerAll(server: McpServer): void {
  for (const tool of tools) tool.register(server);
}

export { search, metadata, fetchTool, similar, citations, cite };
