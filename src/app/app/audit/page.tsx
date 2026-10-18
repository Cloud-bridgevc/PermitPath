import { getRepo } from "@/lib/repo";
import { loadWorkspace } from "@/lib/services";
import { fmtDateTime, PageHead } from "@/components/ui";

export default async function Audit() {
  const repo = await getRepo();
  const [ws, events, demoRequests] = await Promise.all([loadWorkspace(repo), repo.listAudit({ limit: 300 }), repo.listDemoRequests()]);
  return (
    <>
      <PageHead title="Source & audit records" sub="Append-only record of every source verification, checklist change, document action, AI output and status change." />
      <div className="card table-wrap">
        <table className="table">
          <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Detail</th></tr></thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td className="xs muted" style={{ whiteSpace: "nowrap" }}>{fmtDateTime(e.at)}</td>
                <td className="small">{ws.userName(e.actorId)}</td>
                <td><span className={"badge " + (e.actorId.startsWith("system:") ? "b-gray" : e.action.startsWith("extraction") || e.action.startsWith("assistant") || e.action.startsWith("summary") ? "b-ai" : "b-teal")}>{e.action}</span></td>
                <td className="mono xs">{e.entityType}/{e.entityId}</td>
                <td className="small">{e.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {demoRequests.length > 0 && (
        <>
          <h2 style={{ marginTop: 32 }}>Website demo requests</h2>
          <div className="card table-wrap">
            <table className="table">
              <thead><tr><th>When</th><th>Company</th><th>Segment</th><th>Locations</th><th>HubSpot</th></tr></thead>
              <tbody>
                {demoRequests.map((d) => (
                  <tr key={d.id}><td className="xs muted">{fmtDateTime(d.at)}</td><td className="small">{d.company}<div className="xs muted">{d.name}</div></td><td className="small">{d.segment}</td><td className="small">{d.locations}</td><td className="xs">{d.hubspot.detail}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
