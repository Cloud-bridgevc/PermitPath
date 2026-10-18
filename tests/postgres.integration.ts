// Integration check against a live database:  DATABASE_URL=... node --experimental-strip-types tests/postgres.integration.ts
import assert from "node:assert/strict";
import { getRepo } from "../src/lib/repo/index.ts";
import { loadWorkspace } from "../src/lib/services.ts";

const repo = await getRepo();
const ws = await loadWorkspace(repo);
const r = ws.reports.get("app-1001")!;
const byCode = Object.fromEntries(r.results.map((x) => [x.item.code, x.state]));
assert.equal(byCode["FS-03"], "missing");
assert.equal(byCode["FS-05"], "issue");
assert.equal(byCode["FS-06"], "not_applicable");
await repo.linkDocument("doc-05", "ri-fs-03", "u-amara");
await repo.setItemStatus("app-1001", "ri-fs-08", "met", "test", "u-amara");
await repo.createTask({ id: "t-int", title: "integration", assigneeId: "u-devin", status: "open", createdBy: "u-amara", createdAt: new Date().toISOString() }, "u-amara");
await repo.updateTask("t-int", { status: "done" }, "u-amara");
assert.equal(await repo.recordReminder("pm-01", 30), true);
assert.equal(await repo.recordReminder("pm-01", 30), false);
const after = await loadWorkspace(repo);
const r2 = Object.fromEntries(after.reports.get("app-1001")!.results.map((x) => [x.item.code, x.state]));
assert.equal(r2["FS-03"], "issue", "linked quote file has wrong doc type, so it should be flagged");
assert.equal(r2["FS-08"], "satisfied");
assert.ok((await repo.listAudit({ entityId: "doc-05" })).some((e) => e.action === "document.linked"));
console.log("postgres integration OK:", after.applications.length, "applications,", after.sources.length, "sources");
process.exit(0);
