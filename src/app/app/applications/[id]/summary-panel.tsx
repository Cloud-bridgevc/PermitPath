"use client";

import { useState, useTransition } from "react";
import type { ApplicationSummary } from "@/lib/ai/summary";
import { generateSummary } from "../../actions";
import { IconSparkle } from "@/components/icons";

export function SummaryPanel({ applicationId }: { applicationId: string }) {
  const [summary, setSummary] = useState<ApplicationSummary | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="card" style={{ borderColor: "var(--amber-100)" }}>
      <div className="card-head">
        <h3>AI application summary</h3>
        <span className="badge b-ai"><IconSparkle />AI-generated</span>
      </div>
      <div className="card-pad stack-sm">
        {!summary && <p className="small muted" style={{ margin: 0 }}>Summarize outstanding requirements, recorded dates and open tasks for a client update.</p>}
        {summary && (
          <>
            <p className="small" style={{ margin: 0 }}>{summary.narrative}</p>
            <div className="xs muted">
              {summary.method === "bedrock" ? "Written by Claude on Amazon Bedrock" : "Template summary (Bedrock not configured)"} from {summary.facts.missing.length + summary.facts.issues.length} open
              checklist item(s), {summary.facts.deadlines.length} recorded date(s) and {summary.facts.openTasks.length} task(s). Contains no regulatory information beyond your checklist.
            </div>
          </>
        )}
        <button className="btn btn-outline btn-sm" disabled={pending} onClick={() => start(async () => setSummary(await generateSummary(applicationId)))}>
          <IconSparkle width={14} height={14} />{pending ? "Generating…" : summary ? "Regenerate" : "Generate summary"}
        </button>
      </div>
    </div>
  );
}
