import Link from "next/link";
import { getRepo } from "@/lib/repo";
import { loadWorkspace } from "@/lib/services";
import { daysBetween } from "@/lib/engine/renewals";
import type { TaskStatus } from "@/lib/types";
import { Days, PageHead, TASK_LABEL } from "@/components/ui";
import { createTask, updateTask } from "../actions";

const COLS: TaskStatus[] = ["open", "in_progress", "blocked", "done"];

export default async function Tasks({ searchParams }: { searchParams: Promise<{ assignee?: string }> }) {
  const ws = await loadWorkspace(await getRepo());
  const { assignee } = await searchParams;
  const tasks = ws.tasks.filter((t) => !assignee || t.assigneeId === assignee);

  return (
    <>
      <PageHead title="Consultant tasks" sub="Assign and track work across applications and renewals." />
      <div className="row" style={{ marginBottom: 16 }}>
        <Link href="/app/tasks" className={"btn btn-sm " + (!assignee ? "btn-navy" : "btn-outline")}>Everyone ({ws.tasks.filter((t) => t.status !== "done").length})</Link>
        {ws.users.map((u) => {
          const n = ws.tasks.filter((t) => t.assigneeId === u.id && t.status !== "done").length;
          return <Link key={u.id} href={`/app/tasks?assignee=${u.id}`} className={"btn btn-sm " + (assignee === u.id ? "btn-navy" : "btn-outline")}>{u.name} ({n})</Link>;
        })}
      </div>

      <div className="kanban">
        {COLS.map((col) => (
          <div key={col} className="kanban-col">
            <h4>{TASK_LABEL[col]} · {tasks.filter((t) => t.status === col).length}</h4>
            {tasks.filter((t) => t.status === col).map((t) => {
              const app = t.applicationId ? ws.maps.applications.get(t.applicationId) : undefined;
              const permit = t.permitId ? ws.permits.find((p) => p.id === t.permitId) : undefined;
              return (
                <div key={t.id} className="task-card">
                  <div className="strong">{t.title}</div>
                  <div className="row xs muted" style={{ margin: "6px 0" }}>
                    {app && <Link href={`/app/applications/${app.id}`}>{app.reference}</Link>}
                    {permit && <span className="mono">{permit.permitNumber}</span>}
                    {t.requirementId && <span className="req-code">{ws.itemIndex.get(t.requirementId)?.code}</span>}
                    {t.dueDate && <Days n={daysBetween(ws.today, t.dueDate)} />}
                    {t.createdBy.startsWith("system:") && <span className="badge b-gray">Auto · renewal monitor</span>}
                  </div>
                  <form action={updateTask} className="row task-form" style={{ gap: 6 }}>
                    <input type="hidden" name="taskId" value={t.id} />
                    <select name="assigneeId" defaultValue={t.assigneeId} style={{ height: 30, padding: "2px 6px", fontSize: 12.5 }}>{ws.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
                    <select name="status" defaultValue={t.status} style={{ height: 30, padding: "2px 6px", fontSize: 12.5 }}>{COLS.map((c) => <option key={c} value={c}>{TASK_LABEL[c]}</option>)}</select>
                    <button className="btn btn-sm btn-outline">Save</button>
                  </form>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="card card-pad" style={{ marginTop: 24, maxWidth: 760 }}>
        <h3>New task</h3>
        <form action={createTask}>
          <div className="field"><label>Title</label><input type="text" name="title" required /></div>
          <div className="field-row">
            <div className="field"><label>Application</label><select name="applicationId" defaultValue=""><option value="">None</option>{ws.applications.map((a) => <option key={a.id} value={a.id}>{a.reference} · {ws.maps.businesses.get(a.businessId)?.name}</option>)}</select></div>
            <div className="field"><label>Assignee</label><select name="assigneeId" defaultValue="u-amara">{ws.users.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.title}</option>)}</select></div>
          </div>
          <div className="field" style={{ maxWidth: 220 }}><label>Due date</label><input type="date" name="dueDate" /></div>
          <button className="btn btn-primary">Create task</button>
        </form>
      </div>
    </>
  );
}
