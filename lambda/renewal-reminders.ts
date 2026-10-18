// Scheduled daily by EventBridge Scheduler (infra/template.yaml).
// Creates a renewal task for the permit owner whenever a permit's RECORDED expiration
// date reaches one of its CONFIGURED reminder thresholds. Idempotent per (permit, threshold).
import type { ScheduledHandler } from "aws-lambda";
import { getRepo } from "../src/lib/repo/index.ts";
import { remindersDue } from "../src/lib/engine/renewals.ts";
import { todayISO } from "../src/lib/services.ts";

export const handler: ScheduledHandler = async () => {
  const repo = await getRepo();
  const today = todayISO();
  const [permits, permitTypes, tasks] = await Promise.all([repo.listPermits(), repo.listPermitTypes(), repo.listTasks()]);
  const due = remindersDue(permits, today);
  let created = 0;

  for (const { permit, threshold, daysUntilExpiry } of due) {
    if (!(await repo.recordReminder(permit.id, threshold))) continue; // already handled
    const typeName = permitTypes.find((t) => t.id === permit.permitTypeId)?.name ?? permit.permitTypeId;
    const openRenewalTask = tasks.find((t) => t.permitId === permit.id && t.status !== "done");
    if (!openRenewalTask) {
      await repo.createTask(
        {
          id: `t-renew-${permit.id}-${threshold}`,
          permitId: permit.id,
          title: `Start renewal for ${permit.permitNumber} (${typeName}) — recorded expiration ${permit.expiresOn}`,
          assigneeId: permit.ownerId,
          dueDate: today,
          status: "open",
          createdBy: "system:renewal-monitor",
          createdAt: new Date().toISOString(),
        },
        "system:renewal-monitor",
      );
      created++;
    }
    await repo.appendAudit({
      actorId: "system:renewal-monitor",
      action: "renewal.reminder",
      entityType: "permit",
      entityId: permit.id,
      detail: `${threshold}-day threshold reached (${daysUntilExpiry} days to recorded expiration ${permit.expiresOn}).${openRenewalTask ? ` Existing task ${openRenewalTask.id} kept open.` : " Renewal task created."}`,
    });
  }
  console.log(JSON.stringify({ job: "renewal-reminders", today, remindersDue: due.length, tasksCreated: created }));
};
