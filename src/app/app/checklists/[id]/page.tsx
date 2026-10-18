import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepo } from "@/lib/repo";
import { loadWorkspace, sourceForItem } from "@/lib/services";
import { PageHead } from "@/components/ui";
import { ConfirmWithAuthority, FictionalBadge, ProvenanceBadge, SourceCitation } from "@/components/trust";

export default async function ChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ws = await loadWorkspace(await getRepo());
  const c = ws.maps.checklists.get(id);
  if (!c) notFound();
  const pt = ws.maps.permitTypes.get(c.permitTypeId)!;
  return (
    <>
      <div className="xs muted" style={{ marginBottom: 6 }}><Link href="/app/checklists">Checklists</Link> / {c.name}</div>
      <PageHead title={c.name} sub={`${pt.authority} · ${ws.jurisdictionName(c.jurisdictionId)} · v${c.version}, verified ${c.lastVerifiedAt} by ${ws.userName(c.verifiedBy)}`}>
        {pt.fictional && <FictionalBadge />}
      </PageHead>
      <div className="card">
        {c.items.map((item) => {
          const { source, section } = sourceForItem(ws, item);
          return (
            <div key={item.id} className="card-pad" style={{ borderBottom: "1px solid var(--line-2)" }}>
              <div className="row between">
                <div><span className="req-code">{item.code}</span> <span className="req-title">{item.title}</span></div>
                <div className="row">
                  <span className="badge b-gray">{item.mandatory ? "Mandatory" : "Conditional"}</span>
                  <span className="badge b-gray">{item.kind}</span>
                  <ProvenanceBadge p={item.provenance} />
                </div>
              </div>
              <p className="small muted" style={{ margin: "6px 0 10px" }}>{item.description}{item.acceptedDocTypes.length > 0 && <> · Accepts: <span className="mono">{item.acceptedDocTypes.join(", ")}</span></>}</p>
              {source && (
                <SourceCitation
                  source={source}
                  section={section}
                  quote={item.provenance.quote}
                  jurisdictionName={ws.jurisdictionName(source.jurisdictionId)}
                  verifiedByName={item.provenance.kind === "verified" ? ws.userName(item.provenance.verifiedBy) : undefined}
                />
              )}
              {item.confirmWithAuthority && source && <div style={{ marginTop: 8 }}><ConfirmWithAuthority authority={source.authority} /></div>}
            </div>
          );
        })}
      </div>
    </>
  );
}
