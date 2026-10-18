import Link from "next/link";
import { getRepo } from "@/lib/repo";
import { applicationLabel, loadWorkspace } from "@/lib/services";
import { buildFacts, templateNarrative } from "@/lib/ai/summary";
import { daysBetween } from "@/lib/engine/renewals";
import { Days, Kpi, OriginBadge, PageHead, RenewalBadge, StatusBadge } from "@/components/ui";
import { AiNotice } from "@/components/trust";
import { IconArrow } from "@/components/icons";

export default async function Overview() {
  const ws = await loadWorkspace(await getRepo());
  const active = ws.applications.filter((a) => !["approved", "denied", "withdrawn"].includes(a.status));
  const blocking = active.flatMap((a) => (ws.reports.get(a.id)?.blocking ?? []).map((r) => ({ a, r })));

  const dated = [
    ...active.flatMap((a) => a.deadlines.map((d) => ({ kind: "deadline" as const, date: d.date, label: d.label, origin: d.origin, a, days: daysBetween(ws.today, d.date) }))),
    ...ws.tasks.filter((t) => t.status !== "done" && t.dueDate).map((t) => ({ kind: "task" as const, date: t.dueDate!, label: t.title, t, days: daysBetween(ws.today, t.dueDate!) })),
  ].sort((x, y) => x.date.localeCompare(y.date));
  const next14 = dated.filter((d) => d.days <= 14);
  const renewals90 = ws.renewals.filter((r) => r.daysUntilExpiry <= 90);
  const staleSources = ws.sources.filter((s) => s.status === "approved" && daysBetween(s.lastVerifiedAt, ws.today) > 90);

  return (
    <>
      <PageHead title="Overview" sub={`Portfolio status as of ${ws.today}`} />

      <div className="grid-4" style={{ marginBottom: 24 }}>
        <Kpi num={active.length} label="Active applications" />
        <Kpi num={blocking.length} label="Missing or problem items" tone={blocking.length ? "red" : undefined} />
        <Kpi num={next14.length} label="Recorded dates in next 14 days" tone="amber" />
        <Kpi num={renewals90.length} label="Permits expiring within 90 days" tone="teal" />
      </div>

      <div className="split">
        <div className="stack">
          <div className="card">
            <div className="card-head"><h3>Application tracking summary</h3><span className="badge b-ai">AI-generated · from your records</span></div>
            <div className="card-pad stack">
              <AiNotice>
                Summaries are composed only from recorded checklist results, deadlines and tasks. They add no regulatory information. Open an application for its full, cited checklist.
              </AiNotice>
              {active.map((a) => {
                const report = ws.reports.get(a.id);
                if (!report) return null;
                const { business, permitType } = applicationLabel(ws, a);
                const facts = buildFacts(a, report, { permitName: permitType.name, businessName: business.name, tasks: ws.tasks, userName: ws.userName, today: ws.today });
                return (
                  <div key={a.id} style={{ borderBottom: "1px solid var(--line-2)", paddingBottom: 14 }}>
                    <div className="row between">
                      <Link href={`/app/applications/${a.id}`} className="strong">{a.reference} · {permitType.name}</Link>
                      <StatusBadge status={a.status} />
                    </div>
                    <div className="row" style={{ margin: "6px 0" }}>
                      <div className="progress" style={{ flex: 1, maxWidth: 240 }}><span style={{ width: `${report.progress * 100}%` }} /></div>
                      <span className="xs muted">{Math.round(report.progress * 100)}%</span>
                    </div>
                    <p className="small" style={{ margin: 0, color: "var(--ink-2)" }}>{templateNarrative(facts)}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h3>Needs attention</h3><span className="xs muted">Computed from verified checklists</span></div>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Item</th><th>Application</th><th>Why</th></tr></thead>
                <tbody>
                  {blocking.map(({ a, r }) => (
                    <tr key={a.id + r.item.id}>
                      <td><span className="req-code">{r.item.code}</span><div className="strong small">{r.item.title}</div></td>
                      <td className="small"><Link href={`/app/applications/${a.id}#${r.item.code}`}>{a.reference}</Link><div className="xs muted">{ws.maps.businesses.get(a.businessId)?.name}</div></td>
                      <td className="small">{r.state === "missing" ? <span className="badge b-red">Missing</span> : <span className="badge b-amber">Issue</span>}<div className="xs muted" style={{ marginTop: 4 }}>{r.reason}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-head"><h3>Upcoming dates</h3></div>
            <div>
              {next14.length === 0 && <div className="empty">Nothing in the next 14 days.</div>}
              {next14.map((d, i) => (
                <div key={i} style={{ padding: "12px 18px", borderBottom: "1px solid var(--line-2)" }}>
                  <div className="row between"><span className="small strong">{d.date}</span><Days n={d.days} /></div>
                  <div className="small">{d.label}</div>
                  <div className="row xs muted" style={{ marginTop: 4 }}>
                    {d.kind === "deadline" ? <><Link href={`/app/applications/${d.a.id}`}>{d.a.reference}</Link><OriginBadge origin={d.origin} /></> : <>Task · {ws.userName(d.t.assigneeId)}</>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><h3>Renewals</h3><Link href="/app/renewals" className="xs row">Calendar <IconArrow width={12} height={12} /></Link></div>
            {renewals90.map((r) => (
              <div key={r.permit.id} style={{ padding: "12px 18px", borderBottom: "1px solid var(--line-2)" }}>
                <div className="row between"><span className="small strong">{ws.maps.permitTypes.get(r.permit.permitTypeId)?.name}</span><RenewalBadge r={r} /></div>
                <div className="xs muted">{ws.maps.businesses.get(r.permit.businessId)?.name} · {ws.maps.locations.get(r.permit.locationId)?.name}</div>
                <div className="xs" style={{ marginTop: 4 }}>Recorded expiration <b>{r.permit.expiresOn}</b> · {r.daysUntilExpiry} days</div>
              </div>
            ))}
          </div>

          <div className="card card-pad">
            <h3>Source re-verification</h3>
            {staleSources.length === 0 ? (
              <p className="small muted" style={{ margin: 0 }}>All approved sources were verified within the last 90 days.</p>
            ) : (
              <div className="stack-sm">
                {staleSources.map((s) => (
                  <div key={s.id} className="small"><Link href={`/app/sources#${s.id}`}>{s.title}</Link><div className="xs muted">Last verified {s.lastVerifiedAt} ({daysBetween(s.lastVerifiedAt, ws.today)} days ago)</div></div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
