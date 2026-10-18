import { NextResponse } from "next/server";
import { z } from "zod";
import { getRepo } from "@/lib/repo";
import { askRegulatoryQuestion } from "@/lib/ai/assistant";

const Body = z.object({ question: z.string().trim().min(3).max(1000), jurisdictionIds: z.array(z.string()).max(10).optional() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid question" }, { status: 400 });
  const repo = await getRepo();
  const [sources, jurisdictions] = await Promise.all([repo.listSources(), repo.listJurisdictions()]);
  const answer = await askRegulatoryQuestion(parsed.data.question, sources, jurisdictions, parsed.data.jurisdictionIds);
  await repo.appendAudit({
    actorId: "u-amara",
    action: "assistant.query",
    entityType: "assistant",
    entityId: "kb",
    detail: `“${parsed.data.question.slice(0, 120)}” → ${answer.status} via ${answer.method}; ${answer.claims.length} claim(s), ${answer.droppedClaims} dropped by grounding check.`,
  });
  // Strip full source objects from passages to keep the payload small.
  return NextResponse.json({ ...answer, passages: answer.passages.map((p) => ({ passageId: p.passageId, score: Number(p.score.toFixed(2)) })) });
}
