/**
 * arxiv-hound CLI entry. Dispatches `serve` to the MCP server and every
 * other subcommand to the same handlers the server registers via the
 * shared tool registry.
 */

import { cac } from "cac";
import { startServer } from "./server.js";
import { tools } from "../lib/tools/index.js";

const VERSION = "0.0.1";

function findTool(name: string) {
  const t = tools.find((x) => x.name === name);
  if (!t) throw new Error(`Unknown tool: ${name}`);
  return t;
}

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function runCli(): Promise<void> {
  const cli = cac("arxiv-hound");

  cli
    .command("serve", "Run the MCP server over stdio (default if no subcommand).")
    .action(async () => {
      await startServer();
    });

  cli
    .command("search <query>", "Search arXiv papers.")
    .option("--max <n>", "Max results (1 to 50)", { default: 10 })
    .option("--category <cat>", 'Category filter, e.g. "cs.LG"')
    .option("--sort <field>", "Sort field: relevance | submitted | updated")
    .option("--sort-order <order>", "Sort direction: asc | desc")
    .action(async (query: string, opts) => {
      const result = await findTool("search").invoke({
        query,
        max: Number(opts.max),
        category: opts.category,
        sort: opts.sort,
        sortOrder: opts.sortOrder
      });
      printJson(result);
    });

  cli
    .command("metadata <...ids>", "Batch-fetch metadata for arXiv IDs.")
    .action(async (ids: string[]) => {
      const result = await findTool("metadata").invoke({ ids });
      printJson(result);
    });

  cli
    .command("fetch <id>", "Fetch a paper as markdown (HTML, ar5iv, or PDF).")
    .option("--version <v>", 'Optional version tag, e.g. "v2"')
    .option("--force-refresh", "Ignore the local cache and re-fetch.")
    .action(async (id: string, opts) => {
      const result = (await findTool("fetch").invoke({
        id,
        version: opts.version,
        forceRefresh: Boolean(opts.forceRefresh)
      })) as { source: string; markdown: string; cachePath: string };
      process.stderr.write(
        `source=${result.source} cachePath=${result.cachePath}\n`
      );
      process.stdout.write(`${result.markdown}\n`);
    });

  cli
    .command("similar <id>", "Find papers similar to an arXiv paper.")
    .option("--max <n>", "Max results (1 to 50)", { default: 10 })
    .action(async (id: string, opts) => {
      const result = await findTool("similar").invoke({
        id,
        max: Number(opts.max)
      });
      printJson(result);
    });

  cli
    .command("citations <id>", "Get reference list and papers that cite this one.")
    .action(async (id: string) => {
      const result = await findTool("citations").invoke({ id });
      printJson(result);
    });

  cli
    .command("cite <id>", "Generate a BibTeX citation for an arXiv paper.")
    .option("--style <style>", "Citation style: bibtex", { default: "bibtex" })
    .action(async (id: string, opts) => {
      const result = (await findTool("cite").invoke({
        id,
        style: opts.style
      })) as { bibtex: string };
      process.stdout.write(`${result.bibtex}\n`);
    });

  cli.help();
  cli.version(VERSION);

  cli.parse(process.argv, { run: false });
  await cli.runMatchedCommand();
}

const [, , first] = process.argv;

if (first === undefined || first === "serve") {
  await startServer();
} else {
  try {
    await runCli();
  } catch (err) {
    process.stderr.write(`arxiv-hound: ${(err as Error).message}\n`);
    process.exit(1);
  }
}
