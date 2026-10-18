import Link from "next/link";
import { getRepo } from "@/lib/repo";
import { loadWorkspace } from "@/lib/services";
import { dayOffset } from "@/lib/demo/seed";
import { Days, PageHead, RenewalBadge } from "@/components/ui";

type Ev = { date: string; kind: "expiry" | "reminder" | "deadline"; label: string; href: string };

export default async function Renewals({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const ws = await loadWorkspace(await getRepo());
  const { m } = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(m ?? "") ? m! : ws.today.slice(0, 7);
  const [y, mo] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, mo - 1, 1));
  const start = new Date(first.getTime() - first.getUTCDay() * 86_400_000);
  const days = Array.from({ length: 42 }, (_, i) => new Date(start.getTime() + i * 86_400_000).toISOString().slice(0, 10));
  const prev = new Date(Date.UTC(y, mo - 2, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(y, mo, 1)).toISOString().slice(0, 7);

  const events: Ev[] = [];
  for (const { permit: p } of ws.renewals) {
    const name = `${ws.maps.permitTypes.get(p.permitTypeId)?.name} — ${ws.maps.businesses.get(p.businessId)?.name}`;
    events.push({ date: p.expiresOn, kind: "expiry", label: `Expires: ${name}`, href: `/app/businesses/${p.businessId}` });
    for (const t of p.reminderDays) {
      events.push({ date: dayOffset(-t, new Date(p.expiresOn + "T00:00:00Z")), kind: "reminder", label: `${t}-day reminder: ${name}`, href: `/app/businesses/${p.businessId}` });
    }
  }
  for (const a of ws.applications) for (const d of a.deadlines) events.push({ date: d.date, kind: "deadline", label: `${a.reference}: ${d.label}`, href: `/app/applications/${a.id}` });

  const monthName = first.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <>
      <PageHead title="Renewal calendar" sub="Built from recorded expiration dates, configured reminder thresholds and recorded application dates.">
        <Link className="btn btn-outline btn-sm" href={`/app/renewals?m=${prev}`}>←</Link>
        <span className="strong" style={{ minWidth: 140, textAlign: "center" }}>{monthName}</span>
        <Link className="btn btn-outline btn-sm" href={`/app/renewals?m=${next}`}>→</Link>
      </PageHead>
      <div className="row xs" style={{ marginBottom: 12 }}>
        <span className="cal-ev ev-expiry">Recorded expiration</span>
        <span className="cal-ev ev-reminder">Configured reminder</span>
        <span className="cal-ev ev-deadline">Application date</span>
      </div>
      <div className="card" style={{ overflow: "hidden" }}>
        <div className="cal">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="dow">{d}</div>)}
          {days.map((d) => (
            <div key={d} className={(d.slice(0, 7) !== month ? "out " : "") + (d === ws.today ? "today" : "")}>
              <div className="strong">{Number(d.slice(8))}</div>
              {events.filter((e) => e.date === d).map((e, i) => (
                <Link key={i} href={e.href} className={`cal-ev ev-${e.kind}`} title={e.label}>{e.label}</Link>
              ))}
            </div>
          ))}
        </div>
        <div className="cal-agenda">
          {(() => {
            const inMonth = events.filter((e) => e.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date));
            if (inMonth.length === 0) return <div className="empty">Nothing recorded in {monthName}.</div>;
            return inMonth.map((e, i) => (
              <Link key={i} href={e.href} className="row" style={{ padding: "10px 16px", borderBottom: "1px solid var(--line-2)", color: "inherit", textDecoration: "none", flexWrap: "nowrap", alignItems: "flex-start" }}>
                <span className="strong small" style={{ width: 52, flex: "none" }}>{new Date(e.date + "T00:00:00Z").toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</span>
                <span className={`cal-ev ev-${e.kind}`} style={{ marginTop: 0, whiteSpace: "normal" }}>{e.label}</span>
              </Link>
            ));
          })()}
        </div>
      </div>

      <h2 style={{ marginTop: 32 }}>Renewal monitor</h2>
      <div className="card table-wrap">
        <table className="table">
          <thead><tr><th>Permit</th><th>Business · location</th><th>Recorded expiration</th><th>Reminder thresholds</th><th>Status</th><th>Renewal application</th></tr></thead>
          <tbody>
            {ws.renewals.map((r) => (
              <tr key={r.permit.id}>
                <td className="small">{ws.maps.permitTypes.get(r.permit.permitTypeId)?.name}<div className="xs mono muted">{r.permit.permitNumber}</div></td>
                <td className="small">{ws.maps.businesses.get(r.permit.businessId)?.name}<div className="xs muted">{ws.maps.locations.get(r.permit.locationId)?.name}</div></td>
                <td className="small"><div className="row">{r.permit.expiresOn}<Days n={r.daysUntilExpiry} /></div></td>
                <td className="xs">
                  {[...r.permit.reminderDays].sort((a, b) => b - a).map((t) => (
                    <span key={t} className={"badge " + (r.daysUntilExpiry <= t ? "b-amber" : "b-gray")} style={{ marginRight: 4 }}>{t}d</span>
                  ))}
                </td>
                <td><RenewalBadge r={r} /></td>
                <td className="small">{r.permit.renewalApplicationId ? <Link href={`/app/applications/${r.permit.renewalApplicationId}`}>{ws.maps.applications.get(r.permit.renewalApplicationId)?.reference}</Link> : <span className="muted">Not started</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="xs muted" style={{ marginTop: 10 }}>
        Reminders fire when the days remaining reach a configured threshold. A daily AWS Lambda job creates the reminder task and notification; PermitPath does not estimate renewal windows or processing times — check the authority’s renewal instructions.
      </p>
    </>
  );
}
