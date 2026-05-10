import { describe, it, expect } from "vitest";
import { toBibtex } from "../src/lib/utils/bibtex.js";
import type { Paper } from "../src/lib/types.js";

const attention: Paper = {
  id: "1706.03762",
  version: "v7",
  title: "Attention Is All You Need",
  authors: ["Ashish Vaswani", "Noam Shazeer", "Niki Parmar"],
  abstract: "...",
  categories: ["cs.CL", "cs.LG"],
  primaryCategory: "cs.CL",
  published: "2017-06-12T17:57:34Z",
  updated: "2023-08-02T00:41:18Z",
  pdfUrl: "https://arxiv.org/pdf/1706.03762v7",
  absUrl: "https://arxiv.org/abs/1706.03762v7"
};

describe("bibtex", () => {
  it("emits a well-formed @misc entry", () => {
    const out = toBibtex(attention);
    expect(out).toMatch(/^@misc\{vaswani2017attention,$/m);
    expect(out).toContain("title = {Attention Is All You Need}");
    expect(out).toContain(
      "author = {Vaswani, Ashish and Shazeer, Noam and Parmar, Niki}"
    );
    expect(out).toContain("year = {2017}");
    expect(out).toContain("eprint = {1706.03762v7}");
    expect(out).toContain("archivePrefix = {arXiv}");
    expect(out).toContain("primaryClass = {cs.CL}");
    expect(out).toContain("url = {https://arxiv.org/abs/1706.03762v7}");
    expect(out.endsWith("}")).toBe(true);
  });

  it("falls back gracefully on missing optional fields", () => {
    const out = toBibtex({
      ...attention,
      version: undefined,
      primaryCategory: undefined,
      authors: ["Single Author"]
    });
    expect(out).toContain("eprint = {1706.03762}");
    expect(out).not.toContain("primaryClass");
    expect(out).toContain("author = {Author, Single}");
  });

  it("includes journalRef when present", () => {
    const out = toBibtex({ ...attention, journalRef: "NeurIPS 2017" });
    expect(out).toContain("journal = {NeurIPS 2017}");
  });
});
