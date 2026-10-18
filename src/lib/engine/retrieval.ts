// Retrieval over the APPROVED knowledge base. Only sources with status "approved" are
// ever indexed; pending or retired sources are invisible to search and to the model.
// Production swaps this BM25 index for pgvector / OpenSearch, but the contract
// (approved-only, jurisdiction filter, passages carry source metadata) is unchanged.

import type { Jurisdiction, RegulatorySource, SourceSection } from "../types.ts";

export interface Passage {
  passageId: string; // `${sourceId}#${sectionId}`
  source: RegulatorySource;
  section: SourceSection;
  score: number;
}

const STOP = new Set(
  "a an and are as at be by do does for from has have how i if in is it its me my of on or our should that the their this to was what when where which who will with you your can must need any all".split(" "),
);

export function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[’']/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
    .map(stem);
}

function stem(t: string): string {
  if (t.length > 5 && t.endsWith("ing")) return t.slice(0, -3);
  if (t.length > 4 && t.endsWith("ies")) return t.slice(0, -3) + "y";
  if (t.length > 3 && t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1);
  return t;
}

/** Jurisdiction ids in scope: the given ones plus all ancestors (city → county → state). */
export function jurisdictionScope(ids: string[], all: Jurisdiction[]): Set<string> {
  const out = new Set<string>();
  for (let id of ids) {
    let guard = 0;
    while (id && guard++ < 10) {
      out.add(id);
      id = all.find((j) => j.id === id)?.parentId ?? "";
    }
  }
  return out;
}

export function retrieve(
  query: string,
  sources: RegulatorySource[],
  opts: { jurisdictionIds?: Set<string>; limit?: number; minScore?: number } = {},
): Passage[] {
  const approved = sources.filter(
    (s) => s.status === "approved" && (!opts.jurisdictionIds || opts.jurisdictionIds.has(s.jurisdictionId)),
  );
  const docs = approved.flatMap((source) =>
    source.sections.map((section) => ({
      source,
      section,
      toks: tokenize(`${source.title} ${section.heading} ${section.text}`),
    })),
  );
  if (docs.length === 0) return [];

  const q = [...new Set(tokenize(query))];
  const N = docs.length;
  const avgLen = docs.reduce((a, d) => a + d.toks.length, 0) / N;
  const df = new Map<string, number>();
  for (const t of q) df.set(t, docs.filter((d) => d.toks.includes(t)).length);

  const k1 = 1.4;
  const b = 0.75;
  const scored = docs.map((d) => {
    let score = 0;
    for (const t of q) {
      const n = df.get(t) ?? 0;
      if (n === 0) continue;
      const tf = d.toks.filter((x) => x === t).length;
      if (tf === 0) continue;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * d.toks.length) / avgLen)));
    }
    return { passageId: `${d.source.id}#${d.section.id}`, source: d.source, section: d.section, score };
  });

  return scored
    .filter((p) => p.score >= (opts.minScore ?? 1.2))
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.limit ?? 5);
}

/** Normalised substring check used to ground every quote a model returns. */
export function quoteAppears(quote: string, text: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[“”"’']/g, "").replace(/\s+/g, " ").trim();
  const q = norm(quote);
  return q.length >= 12 && norm(text).includes(q);
}
