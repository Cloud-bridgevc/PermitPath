// Application Completeness Assistant — deterministic core.
//
// Compares a user's collected documents against a VERIFIED, jurisdiction-specific
// checklist. The result for every item is computed from recorded data only; nothing
// here is model output. Model-generated hints (e.g. "this unlinked file may satisfy
// FS-03") are produced separately and labelled as suggestions.

import type { Application, Checklist, DocumentRecord, RequirementItem } from "../types.ts";

export type ItemState =
  | "satisfied" // a linked document passed validation, or a step/condition was marked met
  | "issue" // a linked document exists but failed validation
  | "missing" // mandatory item with nothing linked
  | "conditional_open" // non-mandatory item; applicability not yet decided
  | "not_applicable"; // a user recorded that the item does not apply

export interface ItemResult {
  item: RequirementItem;
  state: ItemState;
  documents: DocumentRecord[];
  reason: string;
  decidedBy?: string;
  note?: string;
}

export interface Suggestion {
  documentId: string;
  requirementId: string;
  rationale: string;
  method: "doc_type_match" | "filename_similarity" | "bedrock";
}

export interface CompletenessReport {
  applicationId: string;
  checklistId: string;
  checklistVersion: number;
  checklistVerifiedAt: string;
  results: ItemResult[];
  counts: Record<ItemState, number>;
  /** Share of applicable items satisfied (0–1). Conditional-open items count as outstanding. */
  progress: number;
  unlinkedDocuments: DocumentRecord[];
  suggestions: Suggestion[];
  blocking: ItemResult[];
}

export function assessCompleteness(
  app: Application,
  checklist: Checklist,
  docs: DocumentRecord[],
): CompletenessReport {
  if (checklist.status !== "verified") {
    throw new Error(`Checklist ${checklist.id} is ${checklist.status}; completeness is only assessed against verified checklists.`);
  }
  const appDocs = docs.filter((d) => d.applicationId === app.id);

  const results: ItemResult[] = checklist.items.map((item) => {
    const manual = app.itemStatus[item.id];
    const linked = appDocs.filter((d) => d.requirementId === item.id && d.linkConfirmed);

    if (manual?.state === "not_applicable") {
      return { item, state: "not_applicable", documents: linked, reason: "Marked not applicable.", decidedBy: manual.by, note: manual.note };
    }

    if (item.kind !== "document") {
      if (manual?.state === "met") return { item, state: "satisfied", documents: [], reason: "Marked complete.", decidedBy: manual.by, note: manual.note };
      return item.mandatory
        ? { item, state: "missing", documents: [], reason: `${item.kind === "step" ? "Step" : "Condition"} not yet recorded as complete.` }
        : { item, state: "conditional_open", documents: [], reason: "Decide whether this applies." };
    }

    const passing = linked.filter((d) => d.validation.state === "passed");
    if (passing.length > 0) {
      return { item, state: "satisfied", documents: linked, reason: `${passing.length} linked document${passing.length > 1 ? "s" : ""} passed validation.` };
    }
    if (linked.length > 0) {
      const failed = linked.flatMap((d) => d.validation.checks.filter((c) => c.result === "fail").map((c) => c.detail ?? c.label));
      return { item, state: "issue", documents: linked, reason: failed.join(" ") || "Linked document has validation issues." };
    }
    if (!item.mandatory) {
      return { item, state: "conditional_open", documents: [], reason: "Conditional item — record whether it applies, or link a document." };
    }
    return { item, state: "missing", documents: [], reason: "No document linked to this requirement." };
  });

  const counts: Record<ItemState, number> = { satisfied: 0, issue: 0, missing: 0, conditional_open: 0, not_applicable: 0 };
  for (const r of results) counts[r.state]++;
  const applicable = results.length - counts.not_applicable;
  const progress = applicable === 0 ? 1 : counts.satisfied / applicable;

  const unlinkedDocuments = appDocs.filter((d) => !d.requirementId || !d.linkConfirmed);
  const suggestions = suggestLinks(unlinkedDocuments, results);
  const blocking = results.filter((r) => r.state === "missing" || r.state === "issue");

  return {
    applicationId: app.id,
    checklistId: checklist.id,
    checklistVersion: checklist.version,
    checklistVerifiedAt: checklist.lastVerifiedAt,
    results,
    counts,
    progress,
    unlinkedDocuments,
    suggestions,
    blocking,
  };
}

const STOP = new Set(["the", "and", "of", "a", "an", "for", "to", "pdf", "xlsx", "docx", "draft", "final", "rev"]);
function tokens(s: string): Set<string> {
  return new Set(
    s.toLowerCase().replace(/\.[a-z0-9]+$/, "").split(/[^a-z0-9]+/).filter((t) => t.length > 2 && !STOP.has(t)),
  );
}

/**
 * Heuristic link suggestions for unlinked files. These are SUGGESTIONS: a person must
 * confirm the link before the file counts toward completeness.
 */
export function suggestLinks(unlinked: DocumentRecord[], results: ItemResult[]): Suggestion[] {
  const open = results.filter((r) => r.state === "missing" || r.state === "issue" || r.state === "conditional_open");
  const out: Suggestion[] = [];
  for (const d of unlinked) {
    const exact = open.find((r) => r.item.acceptedDocTypes.includes(d.docType));
    if (exact) {
      out.push({ documentId: d.id, requirementId: exact.item.id, method: "doc_type_match", rationale: `File is tagged ${d.docType}, which ${exact.item.code} accepts.` });
      continue;
    }
    const ft = tokens(d.fileName + " " + d.docType.replace(/_/g, " "));
    let best: { r: ItemResult; score: number; shared: string[] } | undefined;
    for (const r of open) {
      const it = tokens(r.item.title + " " + r.item.acceptedDocTypes.join(" ").replace(/_/g, " "));
      const shared = [...ft].filter((t) => it.has(t));
      if (shared.length > 0 && (!best || shared.length > best.score)) best = { r, score: shared.length, shared };
    }
    if (best) {
      out.push({
        documentId: d.id,
        requirementId: best.r.item.id,
        method: "filename_similarity",
        rationale: `File name shares "${best.shared.join(", ")}" with ${best.r.item.code}. Check that the file actually meets "${best.r.item.title}" before linking.`,
      });
    }
  }
  return out;
}
