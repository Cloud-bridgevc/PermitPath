import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepo } from "@/lib/repo";
import { loadWorkspace } from "@/lib/services";
import { Days, PageHead, RenewalBadge, StatusBadge } from "@/components/ui";
import { FictionalBadge } from "@/components/trust";

export default async function BusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ws = await loadWorkspace(await getRepo());
  const b = ws.maps.businesses.get(id);
  if (!b) notFound();
  const locs = ws.locations.filter((l) => l.businessId === id);
  return (
    <>
      <div className="xs muted" style={{ marginBottom: 6 }}><Link href="/app/businesses">Businesses</Link> / {b.name}</div>
      <PageHead title={b.name} sub={`${b.primaryContact} · ${b.contactEmail}`}><FictionalBadge /></PageHead>
      <div className="stack">
        {locs.map((l) => {
          const apps = ws.applications.filter((a) => a.locationId === l.id);
          const renewals = ws.renewals.filter((r) => r.permit.locationId === l.id);
          return (
            <div key={l.id} className="card">
              <div className="card-head">
                <div><h3>{l.name}</h3><div className="xs muted">{l.address}</div></div>
                <div className="row">{l.jurisdictionIds.map((j) => <span key={j} className="badge b-gray">{ws.jurisdictionName(j)}</span>)}</div>
              </div>
              <div className="grid-2 card-pad">
                <div>
                  <div className="xs strong muted" style={{ textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>Applications</div>
                  {apps.length === 0 && <div className="small muted">None</div>}
                  {apps.map((a) => (
                    <div key={a.id} className="row between small" style={{ padding: "6px 0" }}>
                      <Link href={`/app/applications/${a.id}`}>{a.reference} · {ws.maps.permitTypes.get(a.permitTypeId)?.name}</Link>
                      <StatusBadge status={a.status} />
                    </div>
                  ))}
                </div>
                <div>
                  <div className="xs strong muted" style={{ textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>Issued permits</div>
                  {renewals.length === 0 && <div className="small muted">None recorded</div>}
                  {renewals.map((r) => (
                    <div key={r.permit.id} className="small" style={{ padding: "6px 0" }}>
                      <div className="row between"><span>{ws.maps.permitTypes.get(r.permit.permitTypeId)?.name}</span><RenewalBadge r={r} /></div>
                      <div className="row xs muted"><span className="mono">{r.permit.permitNumber}</span><span>expires {r.permit.expiresOn}</span><Days n={r.daysUntilExpiry} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
