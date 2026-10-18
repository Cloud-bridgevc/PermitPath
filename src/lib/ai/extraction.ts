// Requirement Extraction — turns uploaded official guidance into CANDIDATE checklist
// items. Every candidate is stored as `ai_suggested` with a grounding check result.
// Nothing becomes a verified requirement until a reviewer accepts it.

import { z } from "zod";
import type { RegulatorySource, RequirementItem } from "../types.ts";
import { quoteAppears } from "../engine/retrieval.ts";
import { ACCURACY_RULES, MODEL_ID, bedrockEnabled, getBedrock } from "./client.ts";

const Candidate = z.object({
  title: z.string(),
  description: z.string(),
  kind: z.enum(["document", "condition", "step"]),
  mandatory: z.boolean(),
  condition_text: z.string().describe("If the source makes this conditional, the condition; otherwise empty."),
  section_id: z.string(),
  quote: z.string().describe("Verbatim text copied from the section that states this requirement."),
  suggested_doc_type: z.string().describe("snake_case document type label, or empty for steps/conditions."),
});
const ExtractionSchema = z.object({ requirements: z.array(Candidate) });

export interface ExtractionResult {
  method: "bedrock" | "heuristic";
  items: RequirementItem[];
  warnings: string[];
}

export async function extractRequirements(source: RegulatorySource): Promise<ExtractionResult> {
  if (bedrockEnabled()) {
    try {
      return await extractWithBedrock(source);
    } catch (err) {
      const r = extractHeuristic(source);
      r.warnings.unshift(`Bedrock extraction failed (${(err as Error).message}); used heuristic extraction instead.`);
      return r;
    }
  }
  return extractHeuristic(source);
}

async function extractWithBedrock(source: RegulatorySource): Promise<ExtractionResult> {
  const client = await getBedrock();
  const { zodOutputFormat } = await import("@anthropic-ai/sdk/helpers/zod");
  const passages = source.sections
    .map((s) => `<section id="${s.id}" heading="${escapeAttr(s.heading)}">\n${s.text}\n</section>`)
    .join("\n");

  const response = await client.messages.parse({
    model: MODEL_ID,
    max_tokens: 16000,
    output_config: { effort: "medium", format: zodOutputFormat(ExtractionSchema) },
    system: `${ACCURACY_RULES}

Task: list every application requirement (required document, condition, or procedural step) that the source states. Do not add requirements the source does not state, even if they are common elsewhere. Copy the quote exactly from the section text.`,
    messages: [
      {
        role: "user",
        content: `<source title="${escapeAttr(source.title)}" authority="${escapeAttr(source.authority)}" effective="${source.effectiveDate}">\n${passages}\n</source>`,
      },
    ],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error(`model returned no structured output (stop_reason=${response.stop_reason})`);
  }
  return {
    method: "bedrock",
    items: response.parsed_output.requirements.map((c, i) => toItem(source, i, c, "bedrock")),
    warnings: [],
  };
}

function toItem(
  source: RegulatorySource,
  index: number,
  c: z.infer<typeof Candidate>,
  method: "bedrock" | "heuristic",
): RequirementItem {
  const section = source.sections.find((s) => s.id === c.section_id);
  const grounded = section ? quoteAppears(c.quote, section.text) : false;
  return {
    id: `cand-${source.id}-${index + 1}`,
    code: `NEW-${index + 1}`,
    title: c.title,
    description: c.condition_text ? `${c.description} Condition: ${c.condition_text}` : c.description,
    kind: c.kind,
    acceptedDocTypes: c.suggested_doc_type ? [c.suggested_doc_type] : [],
    mandatory: c.mandatory && !c.condition_text,
    confirmWithAuthority: true,
    provenance: {
      kind: "ai_suggested",
      sourceId: source.id,
      sectionId: c.section_id,
      quote: c.quote,
      method,
      groundingCheck: c.quote ? (grounded ? "quote_found" : "quote_not_found") : "no_quote",
      createdAt: new Date().toISOString(),
    },
  };
}

/**
 * Deterministic fallback: split sections into clauses and keep those that contain
 * obligation language. Quotes are copied verbatim, so grounding always passes, but a
 * reviewer still has to name, type and accept each candidate.
 */
export function extractHeuristic(source: RegulatorySource): ExtractionResult {
  const OBLIGATION = /\b(must|shall|required|is required|are required|require)\b/i;
  const candidates: z.infer<typeof Candidate>[] = [];
  for (const s of source.sections) {
    const clauses = s.text
      .split(/(?<=[.;])\s+|\s*\([a-z]\)\s+/)
      .map((c) => c.trim().replace(/[;.]$/, ""))
      .filter((c) => c.length > 15);
    const sectionHasObligation = OBLIGATION.test(s.text);
    for (const clause of clauses) {
      const listItem = /^(a|an|the)\s/i.test(clause) && sectionHasObligation && !OBLIGATION.test(clause);
      if (!OBLIGATION.test(clause) && !listItem) continue;
      if (/^the applicant must submit the following/i.test(clause)) continue;
      if (/^(this (guide|checklist|document)|applicants should (contact|confirm|follow))/i.test(clause)) continue; // preamble / advisory text
      const conditional = /^(if|where|for any|only)\b/i.test(clause) || /\bif\b/i.test(clause);
      const isStep = /\b(inspection|post|schedule|notify|renew)\b/i.test(clause) && !/\b(form|plan|letter|copy|report|drawing|certificate|agreement)\b/i.test(clause);
      candidates.push({
        title: titleFrom(clause),
        description: clause,
        kind: isStep ? "step" : "document",
        mandatory: !conditional,
        condition_text: conditional ? clause.split(",")[0] : "",
        section_id: s.id,
        quote: clause,
        suggested_doc_type: "",
      });
    }
  }
  return {
    method: "heuristic",
    items: candidates.map((c, i) => toItem(source, i, c, "heuristic")),
    warnings: ["Heuristic extraction: titles and document types are rough and need reviewer edits."],
  };
}

function titleFrom(clause: string): string {
  const words = clause.replace(/^(a|an|the|each|if|where)\s+/i, "").split(/\s+/).slice(0, 7).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;");
}
