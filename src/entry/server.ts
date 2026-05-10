/**
 * MCP server entry. Registers every tool in the registry and connects
 * over stdio. Invoked as `arxiv-hound serve` by the CLI.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAll } from "../lib/tools/index.js";

const VERSION = "0.0.1";

export async function startServer(): Promise<void> {
  const server = new McpServer({
    name: "arxiv-hound",
    version: VERSION
  });
  registerAll(server);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
