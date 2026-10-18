// Regulatory Document Search — grounded Q&A over the approved knowledge base.
//
// Pipeline: retrieve approved passages (jurisdiction-scoped) → if nothing relevant,
// refuse to answer → otherwise ask the model to answer ONLY from those passages with
// verbatim quotes → drop any claim whose quote is not found in its cited passage.

import { z } from "zod";
import type { Jurisdiction, RegulatorySource } from "../types.ts";
import { jurisdictionScope, quoteAppears, retrieve, type Passage } from "../engine/retrieval.ts";
import { ACCURACY_RULES, MODEL_ID, bedrockEnabled, getBedrock } from "./client.ts";

export interface Citation {
  passageId: string;
  sourceId: string;
  sourceTitle: string;
  authority: string;
  jurisdictionId: string;
  sectionId: string;
  sectionHeading: string;
  quote: string;
  url: string;
  effectiveDate: string;
  lastVerifiedAt: string;
}

export interface AnswerClaim {
  text: string;
  citations: Citation[];
}

export interface AssistantAnswer {
  status: "answered" | "no_approved_source";
  method: "bedrock" | "extractive";
  claims: AnswerClaim[];
  /** Claims the model made that failed the grounding check (shown to reviewers, not users). */
  droppedClaims: number;
  passages: Passage[];
  disclaimer: string;
  /** Set when the question asks for fees or timelines, which PermitPath never supplies itself. */
  scopeNotice?: string;
}

const FEE_OR_TIME = /\b(fees?|costs?|price|pricing|charges?|how long|timelines?|processing time|turnaround|how many (days|weeks)|approval time)\b/i;
const SCOPE_NOTICE =
  "PermitPath does not state or estimate fees, processing times or approval timelines. Only text quoted from an approved source is shown; confirm current fees and timelines with the issuing authority.";

const DISCLAIMER =
  "AI-generated answer drawn only from approved sources in your knowledge base. It is not legal advice. Confirm requirements with the issuing authority before relying on them.";

const AnswerSchema = z.object({
  answerable: z.boolean(),
  claims: z.array(
    z.object({
      text: z.string(),
      citations: z.array(z.object({ passage_id: z.string(), quote: z.string() })),
    }),
  ),
});

export async function askRegulatoryQuestion(
  question: string,
  sources: RegulatorySource[],
  jurisdictions: Jurisdiction[],
  jurisdictionIds?: string[],
): Promise<AssistantAnswer> {
  const scope = jurisdictionIds?.length ? jurisdictionScope(jurisdictionIds, jurisdictions) : undefined;
  let passages = retrieve(question, sources, { jurisdictionIds: scope, limit: 5 });
  const scopeNotice = FEE_OR_TIME.test(question) ? SCOPE_NOTICE : undefined;
  // For fee/timeline questions, only passages that actually talk about fees or time are relevant.
  if (scopeNotice) passages = passages.filter((p) => FEE_OR_TIME.test(p.section.text));

  if (passages.length === 0) {
    return { status: "no_approved_source", method: "extractive", claims: [], droppedClaims: 0, passages, disclaimer: DISCLAIMER, scopeNotice };
  }

  if (bedrockEnabled()) {
    try {
      return { ...(await answerWithBedrock(question, passages)), scopeNotice };
    } catch {
      // fall through to the extractive answer
    }
  }
  return { ...extractiveAnswer(passages), scopeNotice };
}

function cite(p: Passage, quote: string): Citation {
  return {
    passageId: p.passageId,
    sourceId: p.source.id,
    sourceTitle: p.source.title,
    authority: p.source.authority,
    jurisdictionId: p.source.jurisdictionId,
    sectionId: p.section.id,
    sectionHeading: p.section.heading,
    quote,
    url: p.source.url,
    effectiveDate: p.source.effectiveDate,
    lastVerifiedAt: p.source.lastVerifiedAt,
  };
}

/** Fallback: return the top passages verbatim as quoted claims. No generation at all. */
export function extractiveAnswer(passages: Passage[]): AssistantAnswer {
  // Keep only passages reasonably close to the best match, so weak hits aren't presented as answers.
  const best = passages[0]?.score ?? 0;
  const top = passages.filter((p) => p.score >= best * 0.5).slice(0, 3);
  return {
    status: "answered",
    method: "extractive",
    claims: top.map((p) => ({ text: `${p.source.authority} — ${p.section.heading}:`, citations: [cite(p, p.section.text)] })),
    droppedClaims: 0,
    passages,
    disclaimer: DISCLAIMER,
  };
}

async function answerWithBedrock(question: string, passages: Passage[]): Promise<AssistantAnswer> {
  const client = await getBedrock();
  const { zodOutputFormat } = await import("@anthropic-ai/sdk/helpers/zod");
  const context = passages
    .map(
      (p) =>
        `<passage id="${p.passageId}" source="${p.source.title}" authority="${p.source.authority}" effective="${p.source.effectiveDate}" section="${p.section.heading}">\n${p.section.text}\n</passage>`,
    )
    .join("\n");

  const response = await client.messages.parse({
    model: MODEL_ID,
    max_tokens: 8000,
    output_config: { effort: "low", format: zodOutputFormat(AnswerSchema) },
    system: `${ACCURACY_RULES}

Answer the consultant's question as a short list of claims. Each claim must cite at least one passage id with a verbatim quote copied from that passage. If the passages do not answer the question, set answerable to false and return no claims.`,
    messages: [{ role: "user", content: `<passages>\n${context}\n</passages>\n\n<question>${question}</question>` }],
  });

  const parsed = response.parsed_output;
  if (response.stop_reason === "refusal" || !parsed) throw new Error("no structured output");
  if (!parsed.answerable) {
    return { status: "no_approved_source", method: "bedrock", claims: [], droppedClaims: 0, passages, disclaimer: DISCLAIMER };
  }

  const byId = new Map(passages.map((p) => [p.passageId, p]));
  let dropped = 0;
  const claims: AnswerClaim[] = [];
  for (const c of parsed.claims) {
    const citations = c.citations
      .map((x) => {
        const p = byId.get(x.passage_id);
        return p && quoteAppears(x.quote, p.section.text) ? cite(p, x.quote) : undefined;
      })
      .filter((x): x is Citation => x !== undefined);
    if (citations.length === 0) dropped++;
    else claims.push({ text: c.text, citations });
  }
  if (claims.length === 0) return { ...extractiveAnswer(passages), droppedClaims: dropped };
  return { status: "answered", method: "bedrock", claims, droppedClaims: dropped, passages, disclaimer: DISCLAIMER };
}
