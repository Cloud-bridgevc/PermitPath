import Link from "next/link";
import { getRepo } from "@/lib/repo";
import { loadWorkspace } from "@/lib/services";
import { PageHead } from "@/components/ui";

const INDUSTRY: Record<string, string> = { construction: "Construction", retail: "Retail", hospitality: "Hospitality", consulting: "Consulting", enterprise: "Enterprise" };

export default async function Businesses() {
  const ws = await loadWorkspace(await getRepo());
  return (
    <>
      <PageHead title="Businesses & locations" sub="Client profiles and the jurisdictions that govern each location." />
      <div className="grid-2">
        {ws.businesses.map((b) => {
          const locs = ws.locations.filter((l) => l.businessId === b.id);
          const apps = ws.applications.filter((a) => a.businessId === b.id);
          const permits = ws.permits.filter((p) => p.businessId === b.id);
          return (
            <Link key={b.id} href={`/app/businesses/${b.id}`} className="card card-pad" style={{ color: "inherit", textDecoration: "none" }}>
              <div className="row between"><h3 style={{ margin: 0 }}>{b.name}</h3><span className="badge b-gray">{INDUSTRY[b.industry]}</span></div>
              <p className="small muted" style={{ margin: "6px 0 12px" }}>{b.notes}</p>
              <div className="row small"><span><b>{locs.length}</b> location{locs.length !== 1 && "s"}</span><span><b>{apps.length}</b> application{apps.length !== 1 && "s"}</span><span><b>{permits.length}</b> issued permit{permits.length !== 1 && "s"}</span></div>
              <div className="xs muted" style={{ marginTop: 8 }}>Contact: {b.primaryContact} · {b.contactEmail}</div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
