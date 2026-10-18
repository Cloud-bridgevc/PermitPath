import Link from "next/link";
import { getRepo } from "@/lib/repo";
import { applicationLabel, loadWorkspace } from "@/lib/services";
import { daysBetween } from "@/lib/engine/renewals";
import { Days, PageHead, StatusBadge } from "@/components/ui";

export default async function Applications() {
  const ws = await loadWorkspace(await getRepo());
  return (
    <>
      <PageHead title="Permit & application register" sub="Every application across businesses and locations, checked against its verified checklist." />
      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr><th>Reference</th><th>Permit</th><th>Business · location</th><th>Status</th><th>Completeness</th><th>Next recorded date</th><th>Lead</th></tr>
          </thead>
          <tbody>
            {ws.applications.map((a) => {
              const { business, location, permitType } = applicationLabel(ws, a);
              const r = ws.reports.get(a.id);
              const next = [...a.deadlines].sort((x, y) => x.date.localeCompare(y.date)).find((d) => d.date >= ws.today);
              return (
                <tr key={a.id}>
                  <td><Link href={`/app/applications/${a.id}`} className="strong">{a.reference}</Link>{a.authorityReference && <div className="xs muted mono">{a.authorityReference}</div>}</td>
                  <td className="small">{permitType.name}<div className="xs muted">{permitType.authority}</div></td>
                  <td className="small"><Link href={`/app/businesses/${business.id}`}>{business.name}</Link><div className="xs muted">{location.name}</div></td>
                  <td><StatusBadge status={a.status} /></td>
                  <td style={{ minWidth: 150 }}>
                    {r && (
                      <>
                        <div className="progress"><span style={{ width: `${r.progress * 100}%` }} /></div>
                        <div className="xs muted" style={{ marginTop: 4 }}>{Math.round(r.progress * 100)}% · {r.counts.missing} missing · {r.counts.issue} issues</div>
                      </>
                    )}
                  </td>
                  <td className="small">{next ? <><div>{next.label}</div><div className="row xs" style={{ marginTop: 2 }}>{next.date} <Days n={daysBetween(ws.today, next.date)} /></div></> : <span className="muted">—</span>}</td>
                  <td className="small">{ws.userName(a.leadConsultantId)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: 32 }}>Issued permits</h2>
      <p className="muted small">Expiration dates are recorded from the issued permit. Renewal reminders use the thresholds configured on each permit.</p>
      <div className="card table-wrap">
        <table className="table">
          <thead><tr><th>Permit number</th><th>Type</th><th>Business · location</th><th>Issued</th><th>Expires (recorded)</th><th>Reminders</th><th>Owner</th></tr></thead>
          <tbody>
            {ws.renewals.map(({ permit: p, daysUntilExpiry }) => (
              <tr key={p.id}>
                <td className="mono small">{p.permitNumber}</td>
                <td className="small">{ws.maps.permitTypes.get(p.permitTypeId)?.name}</td>
                <td className="small">{ws.maps.businesses.get(p.businessId)?.name}<div className="xs muted">{ws.maps.locations.get(p.locationId)?.name}</div></td>
                <td className="small">{p.issuedOn}</td>
                <td className="small"><div className="row">{p.expiresOn}<Days n={daysUntilExpiry} /></div></td>
                <td className="xs">{[...p.reminderDays].sort((a, b) => b - a).join(" · ")} days</td>
                <td className="small">{ws.userName(p.ownerId)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
