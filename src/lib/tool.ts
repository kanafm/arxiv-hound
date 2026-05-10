/**
 * Shared shape for every tool. Each tool file exports an object built by
 * `defineTool` that knows how to register itself with an MCP server and
 * how to be invoked directly (e.g. from the CLI subcommand router).
 */

import type { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface ToolDef<S extends z.ZodRawShape = z.ZodRawShape> {
  name: string;
  description: string;
  inputSchema: S;
  handler: (input: z.objectOutputType<S, z.ZodTypeAny>) => Promise<unknown>;
}

export interface RegisterableTool {
  name: string;
  description: string;
  inputSchema: z.ZodRawShape;
  invoke: (input: Record<string, unknown>) => Promise<unknown>;
  register: (server: McpServer) => void;
}

/**
 * Returns the tool def augmented with `register(server)` and `invoke(input)`.
 * Each tool keeps its specific zod-schema generic at definition time; the
 * registry consumes the wider `RegisterableTool` interface.
 */
export function defineTool<S extends z.ZodRawShape>(def: ToolDef<S>): RegisterableTool {
  return {
    name: def.name,
    description: def.description,
    inputSchema: def.inputSchema,
    invoke: (input) => def.handler(input as z.objectOutputType<S, z.ZodTypeAny>),
    register(server: McpServer) {
      const callback = async (args: Record<string, unknown>) => {
        const result = await def.handler(args as z.objectOutputType<S, z.ZodTypeAny>);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      };
      (server.registerTool as (
        name: string,
        config: { description?: string; inputSchema?: z.ZodRawShape },
        cb: typeof callback
      ) => unknown)(
        def.name,
        { description: def.description, inputSchema: def.inputSchema },
        callback
      );
    }
  };
}
