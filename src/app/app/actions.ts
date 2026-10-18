"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepo } from "@/lib/repo";
import { CURRENT_USER_ID, loadWorkspace } from "@/lib/services";
import { documentKey, putDocument } from "@/lib/storage/s3";
import { extractRequirements } from "@/lib/ai/extraction";
import { buildFacts, summarizeApplication, type ApplicationSummary } from "@/lib/ai/summary";
import type { ApplicationStatus, Deadline, TaskStatus } from "@/lib/types";

const ORG = process.env.PERMITPATH_ORG_ID ?? "meridian";
const rid = (p: string) => `${p}-${crypto.randomUUID().slice(0, 8)}`;
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const ISO = /^\d{4}-\d{2}-\d{2}$/;

function refresh(appId?: string) {
  revalidatePath("/app", "layout");
  if (appId) revalidatePath(`/app/applications/${appId}`);
}

export async function linkDocument(f: FormData) {
  const repo = await getRepo();
  const req = str(f, "requirementId");
  await repo.linkDocument(str(f, "documentId"), req || null, CURRENT_USER_ID);
  refresh(str(f, "applicationId"));
}

export async function setItemStatus(f: FormData) {
  const repo = await getRepo();
  const decision = str(f, "decision");
  if (!["met", "not_met", "not_applicable", "clear"].includes(decision)) throw new Error("bad decision");
  await repo.setItemStatus(str(f, "applicationId"), str(f, "itemId"), decision === "clear" ? null : (decision as "met"), str(f, "note") || undefined, CURRENT_USER_ID);
  refresh(str(f, "applicationId"));
}

const STATUSES: ApplicationStatus[] = ["draft", "collecting", "internal_review", "submitted", "information_requested", "approved", "denied", "withdrawn"];
export async function setApplicationStatus(f: FormData) {
  const status = str(f, "status") as ApplicationStatus;
  if (!STATUSES.includes(status)) throw new Error("bad status");
  const repo = await getRepo();
  await repo.setApplicationStatus(str(f, "applicationId"), status, CURRENT_USER_ID);
  refresh(str(f, "applicationId"));
}

export async function addDeadline(f: FormData) {
  const date = str(f, "date");
  const origin = str(f, "origin") as Deadline["origin"];
  if (!ISO.test(date) || !["authority_notice", "user_entered", "internal_target"].includes(origin)) throw new Error("invalid deadline");
  const repo = await getRepo();
  await repo.addDeadline(str(f, "applicationId"), { id: rid("dl"), label: str(f, "label") || "Deadline", date, origin, note: str(f, "note") || undefined }, CURRENT_USER_ID);
  refresh(str(f, "applicationId"));
}

export async function createTask(f: FormData) {
  const repo = await getRepo();
  const due = str(f, "dueDate");
  await repo.createTask(
    {
      id: rid("t"),
      applicationId: str(f, "applicationId") || undefined,
      requirementId: str(f, "requirementId") || undefined,
      title: str(f, "title"),
      assigneeId: str(f, "assigneeId"),
      dueDate: ISO.test(due) ? due : undefined,
      status: "open",
      createdBy: CURRENT_USER_ID,
      createdAt: new Date().toISOString(),
    },
    CURRENT_USER_ID,
  );
  refresh(str(f, "applicationId") || undefined);
}

export async function updateTask(f: FormData) {
  const repo = await getRepo();
  const status = str(f, "status") as TaskStatus;
  const assigneeId = str(f, "assigneeId");
  await repo.updateTask(str(f, "taskId"), { ...(status ? { status } : {}), ...(assigneeId ? { assigneeId } : {}) }, CURRENT_USER_ID);
  refresh();
}

const MAX_UPLOAD = 50 * 1024 * 1024;
export async function uploadDocument(f: FormData) {
  const file = f.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a file to upload.");
  if (file.size > MAX_UPLOAD) throw new Error("File is larger than 50 MB.");
  const appId = str(f, "applicationId");
  const id = rid("doc");
  const key = documentKey(ORG, appId, id, file.name);
  const bytes = new Uint8Array(await file.arrayBuffer());
  await putDocument(key, bytes, file.type || "application/octet-stream");
  const requirementId = str(f, "requirementId") || undefined;
  const expiresOn = str(f, "expiresOn");
  const repo = await getRepo();
  await repo.addDocument(
    {
      id, applicationId: appId, fileName: file.name, docType: str(f, "docType") || "other", sizeBytes: file.size,
      mimeType: file.type || "application/octet-stream", s3Key: key, uploadedAt: new Date().toISOString(), uploadedBy: CURRENT_USER_ID,
      requirementId, linkConfirmed: Boolean(requirementId), expiresOn: ISO.test(expiresOn) ? expiresOn : undefined,
      validation: { state: "pending", checks: [] },
    },
    CURRENT_USER_ID,
  );
  refresh(appId);
}

export async function generateSummary(applicationId: string): Promise<ApplicationSummary> {
  const repo = await getRepo();
  const ws = await loadWorkspace(repo);
  const app = ws.maps.applications.get(applicationId);
  const report = ws.reports.get(applicationId);
  if (!app || !report) throw new Error("application not found");
  const facts = buildFacts(app, report, {
    permitName: ws.maps.permitTypes.get(app.permitTypeId)!.name,
    businessName: ws.maps.businesses.get(app.businessId)!.name,
    tasks: ws.tasks,
    userName: ws.userName,
    today: ws.today,
  });
  const summary = await summarizeApplication(facts);
  await repo.appendAudit({ actorId: CURRENT_USER_ID, action: "summary.generated", entityType: "application", entityId: applicationId, detail: `AI summary generated via ${summary.method}.` });
  return summary;
}

export async function runExtraction(f: FormData) {
  const repo = await getRepo();
  const sources = await repo.listSources();
  const source = sources.find((s) => s.id === str(f, "sourceId"));
  if (!source) throw new Error("source not found");
  const result = await extractRequirements(source);
  const permitType = (await repo.listPermitTypes()).find((p) => p.sourceIds.includes(source.id) || p.sourceIds.includes(source.supersedesId ?? ""));
  const id = rid("ex");
  await repo.saveExtractionRun(
    { id, sourceId: source.id, permitTypeId: permitType?.id, createdAt: new Date().toISOString(), createdBy: CURRENT_USER_ID, method: result.method, status: "pending_review", items: result.items },
    CURRENT_USER_ID,
  );
  revalidatePath("/app/extraction");
  redirect(`/app/extraction?run=${id}`);
}

export async function reviewExtraction(f: FormData) {
  const repo = await getRepo();
  const decision = str(f, "decision") === "accepted" ? "accepted" : "rejected";
  const ids = f.getAll("itemId").map(String);
  if (decision === "accepted") {
    const run = (await repo.listExtractionRuns()).find((r) => r.id === str(f, "runId"));
    const blocked = run?.items.filter((i) => ids.includes(i.id) && i.provenance.kind === "ai_suggested" && i.provenance.groundingCheck !== "quote_found");
    if (blocked?.length) throw new Error("Items whose quote was not found in the source cannot be accepted.");
  }
  await repo.reviewExtractionRun(str(f, "runId"), decision, ids, CURRENT_USER_ID);
  revalidatePath("/app/extraction");
}
