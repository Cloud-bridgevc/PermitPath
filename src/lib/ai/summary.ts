// Application Tracking Intelligence.
//
// Facts (outstanding items, deadlines, open tasks) are computed deterministically from
// recorded data. The model, when enabled, only rewrites those facts as a readable
// narrative; it receives no regulatory content beyond what is in the facts and is told
// not to add any. The narrative is always labelled AI-generated.

import type { Application, Deadline, Task } from "../types.ts";
import type { CompletenessReport } from "../engine/completeness.ts";
import { daysBetween } from "../engine/renewals.ts";
import { ACCURACY_RULES, MODEL_ID, bedrockEnabled, getBedrock } from "./client.ts";

export interface SummaryFacts {
  reference: string;
  permitName: string;
  businessName: string;
  status: Application["status"];
  progressPct: number;
  missing: { code: string; title: string; reason: string }[];
  issues: { code: string; title: string; reason: string }[];
  conditionalOpen: { code: string; title: string }[];
  unlinkedFiles: string[];
  deadlines: (Deadline & { daysAway: number })[];
  openTasks: { title: string; assignee: string; dueDate?: string; status: Task["status"] }[];
}

export interface ApplicationSummary {
  facts: SummaryFacts;
  narrative: string;
  method: "bedrock" | "template";
  generatedAt: string;
}

export function buildFacts(
  app: Application,
  report: CompletenessReport,
  ctx: { permitName: string; businessName: string; tasks: Task[]; userName: (id: string) => string; today: string },
): SummaryFacts {
  const pick = (state: string) =>
    report.results.filter((r) => r.state === state).map((r) => ({ code: r.item.code, title: r.item.title, reason: r.reason }));
  return {
    reference: app.reference,
    permitName: ctx.permitName,
    businessName: ctx.businessName,
    status: app.status,
    progressPct: Math.round(report.progress * 100),
    missing: pick("missing"),
    issues: pick("issue"),
    conditionalOpen: pick("conditional_open").map(({ code, title }) => ({ code, title })),
    unlinkedFiles: report.unlinkedDocuments.map((d) => d.fileName),
    deadlines: app.deadlines
      .map((d) => ({ ...d, daysAway: daysBetween(ctx.today, d.date) }))
      .sort((a, b) => a.daysAway - b.daysAway),
    openTasks: ctx.tasks
      .filter((t) => t.applicationId === app.id && t.status !== "done")
      .map((t) => ({ title: t.title, assignee: ctx.userName(t.assigneeId), dueDate: t.dueDate, status: t.status })),
  };
}

export function templateNarrative(f: SummaryFacts): string {
  const parts: string[] = [];
  parts.push(`${f.reference} (${f.permitName}) for ${f.businessName} is ${f.progressPct}% complete against its verified checklist.`);
  if (f.missing.length) parts.push(`Missing: ${f.missing.map((m) => `${m.code} ${m.title}`).join("; ")}.`);
  if (f.issues.length) parts.push(`Needs attention: ${f.issues.map((m) => `${m.code} ${m.title} — ${m.reason}`).join("; ")}`);
  if (f.conditionalOpen.length) parts.push(`Applicability still to be decided: ${f.conditionalOpen.map((m) => m.code).join(", ")}.`);
  if (f.unlinkedFiles.length) parts.push(`${f.unlinkedFiles.length} uploaded file(s) are not linked to a requirement: ${f.unlinkedFiles.join(", ")}.`);
  const next = f.deadlines.find((d) => d.daysAway >= 0);
  if (next) parts.push(`Next recorded date: ${next.label} on ${next.date} (${next.daysAway} days, ${originLabel(next.origin)}).`);
  const overdue = f.deadlines.filter((d) => d.daysAway < 0);
  if (overdue.length) parts.push(`${overdue.length} recorded date(s) have passed.`);
  if (f.openTasks.length) parts.push(`${f.openTasks.length} open task(s); ${f.openTasks.filter((t) => t.status === "blocked").length} blocked.`);
  if (!f.missing.length && !f.issues.length && !f.conditionalOpen.length) parts.push("All applicable checklist items are satisfied.");
  return parts.join(" ");
}

export function originLabel(o: Deadline["origin"]): string {
  return o === "authority_notice" ? "from authority notice" : o === "internal_target" ? "internal target" : "entered by user";
}

export async function summarizeApplication(facts: SummaryFacts): Promise<ApplicationSummary> {
  const generatedAt = new Date().toISOString();
  if (bedrockEnabled()) {
    try {
      const client = await getBedrock();
      const response = await client.messages.create({
        model: MODEL_ID,
        max_tokens: 2000,
        output_config: { effort: "low" },
        system: `${ACCURACY_RULES}

Write a 3–5 sentence status summary for a permit consultant using ONLY the JSON facts provided. Lead with what blocks submission, then the nearest dated item. Use requirement codes. Do not add requirements, advice about the authority's process, or any estimate of time.`,
        messages: [{ role: "user", content: `<facts>${JSON.stringify(facts)}</facts>` }],
      });
      const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim();
      if (response.stop_reason !== "refusal" && text) return { facts, narrative: text, method: "bedrock", generatedAt };
    } catch {
      // fall back to template
    }
  }
  return { facts, narrative: templateNarrative(facts), method: "template", generatedAt };
}
