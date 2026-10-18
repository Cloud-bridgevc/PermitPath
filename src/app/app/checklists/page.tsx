import Link from "next/link";
import { getRepo } from "@/lib/repo";
import { loadWorkspace } from "@/lib/services";
import { PageHead } from "@/components/ui";
import { FictionalBadge, VerifiedBadge } from "@/components/trust";

export default async function Checklists() {
  const ws = await loadWorkspace(await getRepo());
  return (
    <>
      <PageHead title="Jurisdiction-specific checklists" sub="Versioned checklists. Only verified versions are used for completeness checks." />
      <div className="card table-wrap">
        <table className="table">
          <thead><tr><th>Checklist</th><th>Permit type · authority</th><th>Jurisdiction</th><th>Items</th><th>Version</th><th>Last verified</th><th>Status</th></tr></thead>
          <tbody>
            {ws.checklists.map((c) => {
              const pt = ws.maps.permitTypes.get(c.permitTypeId)!;
              return (
                <tr key={c.id}>
                  <td><Link href={`/app/checklists/${c.id}`} className="strong">{c.name}</Link></td>
                  <td className="small">{pt.name}<div className="xs muted">{pt.authority}</div></td>
                  <td className="small"><div className="row">{ws.jurisdictionName(c.jurisdictionId)}{pt.fictional && <FictionalBadge />}</div></td>
                  <td className="small">{c.items.length} ({c.items.filter((i) => i.mandatory).length} mandatory)</td>
                  <td className="small">v{c.version}</td>
                  <td className="small">{c.lastVerifiedAt}<div className="xs muted">{ws.userName(c.verifiedBy)}</div></td>
                  <td>{c.status === "verified" ? <VerifiedBadge label="Verified" /> : <span className="badge b-gray">{c.status}</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
