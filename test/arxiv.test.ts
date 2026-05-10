import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { searchPapers, getMetadata } from "../src/lib/client/arxiv.js";

process.env.ARXIV_HOUND_RATE_LIMIT_MS = "0";

async function loadFixture(name: string): Promise<string> {
  const url = new URL(`./fixtures/${name}`, import.meta.url);
  return await readFile(fileURLToPath(url), "utf-8");
}

function mockArxivResponse(xml: string): void {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    ok: true,
    status: 200,
    headers: new Headers(),
    text: async () => xml
  } as Response);
}

describe("arxiv client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("parses a search response into Paper objects", async () => {
    mockArxivResponse(await loadFixture("search-attention.xml"));
    const papers = await searchPapers("ti:attention", { max: 1 });
    expect(papers).toHaveLength(1);
    const p = papers[0]!;
    expect(p.id).toBe("1706.03762");
    expect(p.version).toBe("v7");
    expect(p.title).toBe("Attention Is All You Need");
    expect(p.authors).toEqual(["Ashish Vaswani", "Noam Shazeer", "Niki Parmar"]);
    expect(p.primaryCategory).toBe("cs.CL");
    expect(p.categories).toEqual(["cs.CL", "cs.LG"]);
    expect(p.comment).toBe("15 pages, 5 figures");
    expect(p.pdfUrl).toContain("1706.03762v7");
    expect(p.absUrl).toContain("1706.03762v7");
  });

  it("encodes search_query, max_results, and sort parameters", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: async () => "<feed></feed>"
      } as Response);
    await searchPapers("attention", {
      max: 5,
      category: "cs.LG",
      sort: "submitted",
      sortOrder: "desc"
    });
    const url = fetchSpy.mock.calls[0]![0] as string;
    expect(url).toContain("search_query=%28attention%29+AND+cat%3Acs.LG");
    expect(url).toContain("max_results=5");
    expect(url).toContain("sortBy=submittedDate");
    expect(url).toContain("sortOrder=descending");
  });

  it("getMetadata uses id_list and skips the network on empty input", async () => {
    const xml = await loadFixture("search-attention.xml");
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const empty = await getMetadata([]);
    expect(empty).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => xml
    } as Response);
    await getMetadata(["1706.03762"]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const url = fetchSpy.mock.calls[0]![0] as string;
    expect(url).toContain("id_list=1706.03762");
    expect(url).toContain("max_results=1");
  });
});
