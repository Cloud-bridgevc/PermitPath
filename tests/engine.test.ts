import { test } from "node:test";
import assert from "node:assert/strict";
import * as seed from "../src/lib/demo/seed.ts";
import { assessCompleteness } from "../src/lib/engine/completeness.ts";
import { validateDocument } from "../src/lib/engine/validation.ts";
import { quoteAppears, retrieve, jurisdictionScope } from "../src/lib/engine/retrieval.ts";
import { renewalStatus, remindersDue, daysBetween } from "../src/lib/engine/renewals.ts";
import { extractHeuristic } from "../src/lib/ai/extraction.ts";
import { extractiveAnswer } from "../src/lib/ai/assistant.ts";
import type { DocumentRecord } from "../src/lib/types.ts";

const today = new Date().toISOString().slice(0, 10);

function validatedDocs(): DocumentRecord[] {
  const items = new Map(seed.checklists.flatMap((c) => c.items.map((i) => [i.id, i] as const)));
  return seed.documents.map((d) => ({ ...d, validation: validateDocument(d, d.requirementId ? items.get(d.requirementId) : undefined, today) }));
}

test("every verified requirement quote appears verbatim in its cited source section", () => {
  for (const cl of seed.checklists) {
    for (const item of cl.items) {
      assert.equal(item.provenance.kind, "verified", `${item.code} in a verified checklist must be verified`);
      if (item.provenance.kind !== "verified") continue;
      const src = seed.sources.find((s) => s.id === item.provenance.sourceId);
      assert.ok(src, `${item.code}: source missing`);
      assert.equal(src.status, "approved", `${item.code}: cites a non-approved source`);
      const section = src.sections.find((s) => s.id === item.provenance.sectionId);
      assert.ok(section, `${item.code}: section missing`);
      assert.ok(quoteAppears(item.provenance.quote, section.text), `${item.code}: quote not found in ${src.id}#${section.id}`);
    }
  }
});

test("all demo jurisdictions, sources and permit types are flagged fictional", () => {
  assert.ok(seed.jurisdictions.every((j) => j.fictional));
  assert.ok(seed.sources.every((s) => s.fictional && new URL(s.url).hostname.endsWith(".example")));
  assert.ok(seed.permitTypes.every((p) => p.fictional));
});

test("completeness flags missing equipment schedule and expired manager certificate for PP-1001", () => {
  const app = seed.applications.find((a) => a.id === "app-1001")!;
  const cl = seed.checklists.find((c) => c.id === app.checklistId)!;
  const r = assessCompleteness(app, cl, validatedDocs());
  const byCode = Object.fromEntries(r.results.map((x) => [x.item.code, x.state]));
  assert.equal(byCode["FS-01"], "satisfied");
  assert.equal(byCode["FS-03"], "missing");
  assert.equal(byCode["FS-05"], "issue");
  assert.equal(byCode["FS-06"], "not_applicable");
  assert.equal(byCode["FS-08"], "missing");
  assert.equal(r.unlinkedDocuments.length, 1);
  assert.equal(r.suggestions[0]?.requirementId, "ri-fs-03");
  assert.equal(r.suggestions[0]?.method, "filename_similarity");
});

test("completeness refuses to run against an unverified checklist", () => {
  const app = seed.applications[0];
  const cl = { ...seed.checklists[0], status: "draft" as const };
  assert.throws(() => assessCompleteness(app, cl, []));
});

test("doc type mismatch fails validation", () => {
  const item = seed.checklists[0].items[2];
  const v = validateDocument({ ...seed.documents[0], docType: "menu", requirementId: item.id }, item, today);
  assert.equal(v.state, "issues");
});

test("retrieval only returns approved sources and respects jurisdiction scope", () => {
  const hits = retrieve("grease interceptor sizing worksheet", seed.sources);
  assert.ok(hits.every((h) => h.source.status === "approved"));
  assert.ok(!hits.some((h) => h.section.text.includes("grease interceptor")), "pending source leaked into results");

  const scope = jurisdictionScope(["j-portlinden"], seed.jurisdictions);
  const scoped = retrieve("zoning verification letter", seed.sources, { jurisdictionIds: scope });
  assert.ok(scoped.every((h) => scope.has(h.source.jurisdictionId)));

  const food = retrieve("what documents are needed for food establishment plan review menu floor plan", seed.sources);
  assert.equal(food[0]?.source.id, "src-hc-food-2025");
});

test("unrelated questions return nothing rather than a guess", () => {
  assert.equal(retrieve("what is the fee for a fireworks display", seed.sources).length, 0);
});

test("extractive answer cites verbatim section text", () => {
  const ans = extractiveAnswer(retrieve("zoning verification letter beverage", seed.sources));
  for (const c of ans.claims) for (const cite of c.citations) {
    const src = seed.sources.find((s) => s.id === cite.sourceId)!;
    assert.ok(quoteAppears(cite.quote, src.sections.find((s) => s.id === cite.sectionId)!.text));
  }
});

test("heuristic extraction finds the new grease interceptor item and every quote is grounded", () => {
  const src = seed.sources.find((s) => s.id === "src-hc-food-2026")!;
  const r = extractHeuristic(src);
  assert.ok(r.items.some((i) => /grease interceptor/i.test(i.description)));
  assert.ok(r.items.every((i) => i.provenance.kind === "ai_suggested" && i.provenance.groundingCheck === "quote_found"));
});

test("renewals use recorded expiry and configured thresholds", () => {
  const p = { ...seed.permits[0], expiresOn: "2026-03-01", reminderDays: [90, 60, 30] };
  assert.equal(daysBetween("2026-01-30", "2026-03-01"), 30);
  assert.equal(renewalStatus(p, "2026-01-30").activeThreshold, 30);
  assert.equal(renewalStatus(p, "2026-03-02").urgency, "expired");
  assert.deepEqual(remindersDue([p], "2025-12-31").map((r) => r.threshold), [60]);
});

test("fee questions never return unrelated passages", async () => {
  const { askRegulatoryQuestion } = await import("../src/lib/ai/assistant.ts");
  const a = await askRegulatoryQuestion("What is the fee for a sign permit?", seed.sources, seed.jurisdictions);
  assert.equal(a.status, "no_approved_source");
  assert.ok(a.scopeNotice);
});
