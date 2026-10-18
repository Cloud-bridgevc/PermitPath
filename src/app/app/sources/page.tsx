import { getRepo } from "@/lib/repo";
import { loadWorkspace } from "@/lib/services";
import { daysBetween } from "@/lib/engine/renewals";
import { PageHead } from "@/components/ui";
import { FictionalBadge, VerifiedBadge } from "@/components/trust";
import { IconExternal } from "@/components/icons";

const REVERIFY_DAYS = 90;

export default async function Sources() {
  const ws = await loadWorkspace(await getRepo());
  return (
    <>
      <PageHead title="Source library" sub="The approved knowledge base. Only approved sources are used for search, extraction grounding and checklists." />
      <div className="callout callout-info small" style={{ marginBottom: 16 }}>
        <div>
          Each source records the issuing authority, jurisdiction, the <b>effective date</b> stated in the document, and the <b>last-verified date</b> when a reviewer confirmed with the authority that it is current.
          Sources are flagged for re-verification after {REVERIFY_DAYS} days. New versions stay in <b>pending review</b> until approved, and are invisible to search until then.
        </div>
      </div>
      <div className="stack">
        {ws.sources.map((s) => {
          const age = daysBetween(s.lastVerifiedAt, ws.today);
          const usedBy = ws.checklists.filter((c) => c.items.some((i) => i.provenance.sourceId === s.id));
          return (
            <div key={s.id} id={s.id} className="card">
              <div className="card-head">
                <div>
                  <h3>{s.title}</h3>
                  <div className="xs muted">{s.authority} · {ws.jurisdictionName(s.jurisdictionId)} · {s.documentType.replace("_", " ")}</div>
                </div>
                <div className="row">
                  {s.fictional && <FictionalBadge />}
                  {s.status === "approved" ? <VerifiedBadge label="Approved" /> : <span className={"badge " + (s.status === "pending_review" ? "b-amber" : "b-gray")}>{s.status.replace("_", " ")}</span>}
                  {s.status === "approved" && age > REVERIFY_DAYS && <span className="badge b-red">Re-verification due</span>}
                </div>
              </div>
              <div className="card-pad grid-4 small">
                <div><div className="xs muted">Effective date</div><b>{s.effectiveDate}</b>{s.effectiveDate > ws.today && <div className="xs" style={{ color: "var(--amber-700)" }}>Future — not yet in effect</div>}</div>
                <div><div className="xs muted">Last verified</div><b>{s.lastVerifiedAt}</b><div className="xs muted">{age} days ago · {ws.userName(s.verifiedBy)}</div></div>
                <div><div className="xs muted">Storage</div><span className="mono xs break">{s.s3Key ?? "web page (URL only)"}</span></div>
                <div><div className="xs muted">Used by</div>{usedBy.length ? usedBy.map((c) => <div key={c.id} className="xs">{c.name} v{c.version}</div>) : <span className="xs muted">No checklists</span>}</div>
              </div>
              <details style={{ padding: "0 20px 16px" }}>
                <summary className="xs strong" style={{ cursor: "pointer", color: "var(--teal-700)" }}>{s.sections.length} indexed sections</summary>
                <div className="stack-sm" style={{ marginTop: 10 }}>
                  {s.sections.map((x) => <div key={x.id} className="citation"><div className="xs strong">{x.heading}</div><div className="small">{x.text}</div></div>)}
                </div>
              </details>
              <div style={{ padding: "0 20px 16px" }} className="xs break"><a href={s.url} target="_blank" rel="noreferrer" className="break">{s.url} <IconExternal width={12} height={12} /></a></div>
            </div>
          );
        })}
      </div>
    </>
  );
}
