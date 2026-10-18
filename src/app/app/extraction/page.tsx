import Link from "next/link";
import { getRepo } from "@/lib/repo";
import { loadWorkspace } from "@/lib/services";
import { bedrockEnabled } from "@/lib/ai/client";
import { fmtDateTime, PageHead } from "@/components/ui";
import { AiNotice, ProvenanceBadge, SourceCitation } from "@/components/trust";
import { IconScan } from "@/components/icons";
import { reviewExtraction, runExtraction } from "../actions";

export default async function Extraction({ searchParams }: { searchParams: Promise<{ run?: string }> }) {
  const repo = await getRepo();
  const ws = await loadWorkspace(repo);
  const runs = await repo.listExtractionRuns();
  const { run: runId } = await searchParams;
  const run = runs.find((r) => r.id === runId) ?? runs.find((r) => r.status === "pending_review") ?? runs[0];

  return (
    <>
      <PageHead title="Requirement extraction" sub="Turn official guidance into candidate checklist items. Candidates are AI suggestions until a reviewer verifies them." />

      <div className="card card-pad" style={{ marginBottom: 20 }}>
        <form action={runExtraction} className="row">
          <label htmlFor="sourceId" style={{ margin: 0 }}>Extract from</label>
          <select id="sourceId" name="sourceId" defaultValue="src-hc-food-2026" style={{ maxWidth: 520 }}>
            {ws.sources.map((s) => <option key={s.id} value={s.id}>{s.title} — {s.authority} ({s.status.replace("_", " ")}, effective {s.effectiveDate})</option>)}
          </select>
          <button className="btn btn-primary"><IconScan width={16} height={16} />Run extraction</button>
          <span className="xs muted">{bedrockEnabled() ? "Uses Claude on Amazon Bedrock" : "Bedrock not configured — uses heuristic extraction"}</span>
        </form>
      </div>

      <div className="split split-left">
        <div className="card">
          <div className="card-head"><h3>Runs</h3></div>
          {runs.map((r) => (
            <Link key={r.id} href={`/app/extraction?run=${r.id}`} className="card-pad" style={{ display: "block", borderBottom: "1px solid var(--line-2)", background: r.id === run?.id ? "var(--teal-50)" : undefined, color: "inherit", textDecoration: "none", padding: "12px 16px" }}>
              <div className="small strong">{ws.maps.sources.get(r.sourceId)?.title}</div>
              <div className="xs muted">{fmtDateTime(r.createdAt)} · {r.method}</div>
              <span className={"badge " + (r.status === "pending_review" ? "b-amber" : r.status === "accepted" ? "b-green" : "b-gray")} style={{ marginTop: 6 }}>{r.status.replace("_", " ")}</span>
            </Link>
          ))}
        </div>

        {run && (() => {
          const source = ws.maps.sources.get(run.sourceId)!;
          const prior = source.supersedesId ? ws.maps.sources.get(source.supersedesId) : undefined;
          const priorChecklist = ws.checklists.find((c) => c.permitTypeId === run.permitTypeId && c.status === "verified");
          return (
            <div className="stack">
              <AiNotice>
                <b>These are AI suggestions, not requirements.</b> Each candidate quotes the source; PermitPath checks the quote really appears in the cited section. Candidates that fail the check
                cannot be accepted. Accepted items go to a draft checklist that a reviewer must verify before it is used for completeness checks.
              </AiNotice>
              {prior && (
                <div className="callout callout-info small">
                  <div>This source is a revision of <b>{prior.title}</b> (effective {prior.effectiveDate}). New version effective <b>{source.effectiveDate}</b>, status <b>{source.status.replace("_", " ")}</b>.
                    {priorChecklist && <> Current verified checklist: <Link href={`/app/checklists/${priorChecklist.id}`}>{priorChecklist.name} v{priorChecklist.version}</Link>.</>}</div>
                </div>
              )}
              <form action={reviewExtraction} className="card">
                <input type="hidden" name="runId" value={run.id} />
                <div className="card-head"><h3>{run.items.length} candidate requirement(s)</h3><span className="xs muted">Run by {ws.userName(run.createdBy)} via {run.method}</span></div>
                {run.items.map((i) => {
                  const p = i.provenance;
                  const grounded = p.kind === "ai_suggested" && p.groundingCheck === "quote_found";
                  const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
                  const known = priorChecklist?.items.some((x) => {
                    if (x.provenance.kind !== "verified" || !p.quote) return false;
                    const a = norm(x.provenance.quote), b = norm(p.quote);
                    return a.includes(b) || b.includes(a);
                  });
                  const section = source.sections.find((s) => s.id === p.sectionId);
                  return (
                    <div key={i.id} className="card-pad" style={{ borderBottom: "1px solid var(--line-2)" }}>
                      <div className="row between">
                        <label className="row" style={{ margin: 0, color: "var(--ink)" }}>
                          <input type="checkbox" name="itemId" value={i.id} disabled={!grounded || run.status !== "pending_review"} defaultChecked={grounded && !known} />
                          <span className="req-title">{i.title}</span>
                        </label>
                        <div className="row">
                          {known ? <span className="badge b-gray">Already in verified checklist</span> : grounded ? <span className="badge b-teal">New vs current checklist</span> : null}
                          <span className="badge b-gray">{i.kind}{i.mandatory ? "" : " · conditional"}</span>
                          <ProvenanceBadge p={p} />
                        </div>
                      </div>
                      <p className="small muted" style={{ margin: "6px 0 10px" }}>{i.description}</p>
                      <SourceCitation source={source} section={section} quote={p.quote} jurisdictionName={ws.jurisdictionName(source.jurisdictionId)} ai />
                      {!grounded && <div className="callout callout-red xs" style={{ marginTop: 8 }}>The quoted text was not found in {section?.heading ?? "the cited section"}. This candidate may be invented and cannot be accepted.</div>}
                    </div>
                  );
                })}
                {run.status === "pending_review" ? (
                  <div className="card-pad row">
                    <button className="btn btn-primary" name="decision" value="accepted">Accept selected into draft checklist</button>
                    <button className="btn btn-outline" name="decision" value="rejected">Reject run</button>
                  </div>
                ) : (
                  <div className="card-pad small muted">This run was {run.status}.</div>
                )}
              </form>
            </div>
          );
        })()}
      </div>
    </>
  );
}
