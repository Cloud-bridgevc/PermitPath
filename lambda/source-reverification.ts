// Weekly job: approved sources whose last-verified date is older than the policy window
// get a re-verification task for the content reviewer. Nothing is changed automatically.
import type { ScheduledHandler } from "aws-lambda";
import { getRepo } from "../src/lib/repo/index.ts";
import { daysBetween } from "../src/lib/engine/renewals.ts";
import { todayISO } from "../src/lib/services.ts";

const WINDOW = Number(process.env.REVERIFY_AFTER_DAYS ?? 90);
const REVIEWER = process.env.CONTENT_REVIEWER_ID ?? "u-rosa";

export const handler: ScheduledHandler = async () => {
  const repo = await getRepo();
  const today = todayISO();
  const [sources, tasks] = await Promise.all([repo.listSources(), repo.listTasks()]);
  const stale = sources.filter((s) => s.status === "approved" && daysBetween(s.lastVerifiedAt, today) > WINDOW);
  for (const s of stale) {
    const id = `t-reverify-${s.id}-${s.lastVerifiedAt}`;
    if (tasks.some((t) => t.id === id)) continue;
    await repo.createTask(
      { id, title: `Re-verify source with ${s.authority}: ${s.title} (last verified ${s.lastVerifiedAt})`, assigneeId: REVIEWER, dueDate: today, status: "open", createdBy: "system:source-monitor", createdAt: new Date().toISOString() },
      "system:source-monitor",
    );
  }
  console.log(JSON.stringify({ job: "source-reverification", today, stale: stale.length }));
};
