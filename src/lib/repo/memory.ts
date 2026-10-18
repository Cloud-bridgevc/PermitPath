import * as seed from "../demo/seed.ts";
import type { AuditEvent, DemoRequest } from "../types.ts";
import type { ItemDecision, Repository } from "./repository.ts";

type Store = {
  users: typeof seed.users;
  jurisdictions: typeof seed.jurisdictions;
  businesses: typeof seed.businesses;
  locations: typeof seed.locations;
  sources: typeof seed.sources;
  permitTypes: typeof seed.permitTypes;
  checklists: typeof seed.checklists;
  applications: typeof seed.applications;
  documents: typeof seed.documents;
  permits: typeof seed.permits;
  tasks: typeof seed.tasks;
  auditEvents: AuditEvent[];
  extractionRuns: typeof seed.extractionRuns;
  demoRequests: DemoRequest[];
  reminders: Set<string>;
};

function fresh(): Store {
  const c = structuredClone;
  return {
    users: c(seed.users),
    jurisdictions: c(seed.jurisdictions),
    businesses: c(seed.businesses),
    locations: c(seed.locations),
    sources: c(seed.sources),
    permitTypes: c(seed.permitTypes),
    checklists: c(seed.checklists),
    applications: c(seed.applications),
    documents: c(seed.documents),
    permits: c(seed.permits),
    tasks: c(seed.tasks),
    auditEvents: c(seed.auditEvents),
    extractionRuns: c(seed.extractionRuns),
    demoRequests: [],
    reminders: new Set(),
  };
}

let counter = 0;
const id = (p: string) => `${p}-${Date.now().toString(36)}${(counter++).toString(36)}`;

/** In-memory store for the fictional demo. Survives hot reloads via globalThis; resets on restart. */
export class MemoryRepository implements Repository {
  private s: Store;
  constructor(store?: Store) {
    this.s = store ?? fresh();
  }

  async listUsers() { return this.s.users; }
  async listJurisdictions() { return this.s.jurisdictions; }
  async listBusinesses() { return this.s.businesses; }
  async listLocations() { return this.s.locations; }
  async listSources() { return this.s.sources; }
  async listPermitTypes() { return this.s.permitTypes; }
  async listChecklists() { return this.s.checklists; }
  async listApplications() { return this.s.applications; }
  async getApplication(appId: string) { return this.s.applications.find((a) => a.id === appId); }
  async listDocuments(applicationId?: string) {
    return applicationId ? this.s.documents.filter((d) => d.applicationId === applicationId) : this.s.documents;
  }
  async listPermits() { return this.s.permits; }
  async listTasks() { return this.s.tasks; }
  async listAudit(opts: { entityId?: string; limit?: number } = {}) {
    return this.s.auditEvents
      .filter((e) => !opts.entityId || e.entityId === opts.entityId)
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, opts.limit ?? 200);
  }
  async listExtractionRuns() { return this.s.extractionRuns; }
  async listDemoRequests() { return this.s.demoRequests; }

  async appendAudit(e: Omit<AuditEvent, "id" | "at">) {
    this.s.auditEvents.push({ ...e, id: id("ae"), at: new Date().toISOString() });
  }

  async addDocument(doc: Parameters<Repository["addDocument"]>[0], actorId: string) {
    this.s.documents.push(doc);
    await this.appendAudit({ actorId, action: "document.uploaded", entityType: "document", entityId: doc.id, detail: `${doc.fileName} uploaded to ${doc.applicationId}${doc.requirementId ? " and linked" : " (unlinked)"}.` });
  }

  async linkDocument(documentId: string, requirementId: string | null, actorId: string) {
    const d = this.s.documents.find((x) => x.id === documentId);
    if (!d) throw new Error("document not found");
    d.requirementId = requirementId ?? undefined;
    d.linkConfirmed = requirementId !== null;
    await this.appendAudit({ actorId, action: requirementId ? "document.linked" : "document.unlinked", entityType: "document", entityId: documentId, detail: requirementId ? `Linked to requirement ${requirementId} (confirmed by user).` : "Link removed." });
  }

  async setItemStatus(applicationId: string, itemId: string, decision: ItemDecision, note: string | undefined, actorId: string) {
    const a = this.s.applications.find((x) => x.id === applicationId);
    if (!a) throw new Error("application not found");
    if (decision === null) delete a.itemStatus[itemId];
    else a.itemStatus[itemId] = { state: decision, by: actorId, at: new Date().toISOString(), note };
    await this.appendAudit({ actorId, action: "requirement.status", entityType: "application", entityId: applicationId, detail: `${itemId} → ${decision ?? "cleared"}${note ? ` (${note})` : ""}` });
  }

  async setApplicationStatus(applicationId: string, status: Parameters<Repository["setApplicationStatus"]>[1], actorId: string) {
    const a = this.s.applications.find((x) => x.id === applicationId);
    if (!a) throw new Error("application not found");
    const prev = a.status;
    a.status = status;
    if (status === "submitted" && !a.submittedAt) a.submittedAt = new Date().toISOString().slice(0, 10);
    await this.appendAudit({ actorId, action: "application.status", entityType: "application", entityId: applicationId, detail: `${prev} → ${status}` });
  }

  async addDeadline(applicationId: string, deadline: Parameters<Repository["addDeadline"]>[1], actorId: string) {
    const a = this.s.applications.find((x) => x.id === applicationId);
    if (!a) throw new Error("application not found");
    a.deadlines.push(deadline);
    await this.appendAudit({ actorId, action: "deadline.recorded", entityType: "application", entityId: applicationId, detail: `${deadline.label} on ${deadline.date} (${deadline.origin}).` });
  }

  async createTask(task: Parameters<Repository["createTask"]>[0], actorId: string) {
    this.s.tasks.push(task);
    await this.appendAudit({ actorId, action: "task.created", entityType: "task", entityId: task.id, detail: `${task.title} → ${task.assigneeId}` });
  }

  async updateTask(taskId: string, patch: Parameters<Repository["updateTask"]>[1], actorId: string) {
    const t = this.s.tasks.find((x) => x.id === taskId);
    if (!t) throw new Error("task not found");
    Object.assign(t, patch);
    await this.appendAudit({ actorId, action: "task.updated", entityType: "task", entityId: taskId, detail: Object.entries(patch).map(([k, v]) => `${k}=${v}`).join(", ") });
  }

  async saveExtractionRun(run: Parameters<Repository["saveExtractionRun"]>[0], actorId: string) {
    this.s.extractionRuns.unshift(run);
    const ungrounded = run.items.filter((i) => i.provenance.kind === "ai_suggested" && i.provenance.groundingCheck !== "quote_found").length;
    await this.appendAudit({ actorId, action: "extraction.completed", entityType: "extraction", entityId: run.id, detail: `${run.items.length} candidate requirements via ${run.method}; ${ungrounded} failed grounding check.` });
  }

  async reviewExtractionRun(runId: string, decision: "accepted" | "rejected", acceptedItemIds: string[], actorId: string) {
    const r = this.s.extractionRuns.find((x) => x.id === runId);
    if (!r) throw new Error("extraction run not found");
    r.status = decision;
    await this.appendAudit({ actorId, action: `extraction.${decision}`, entityType: "extraction", entityId: runId, detail: decision === "accepted" ? `Accepted ${acceptedItemIds.length} item(s) into a draft checklist for verification: ${acceptedItemIds.join(", ")}` : "Rejected all candidates." });
  }

  async addDemoRequest(req: DemoRequest) {
    this.s.demoRequests.unshift(req);
    await this.appendAudit({ actorId: "system:website", action: "demo.requested", entityType: "demo_request", entityId: req.id, detail: `${req.company} (${req.segment}) — HubSpot: ${req.hubspot.detail}` });
  }

  async recordReminder(permitId: string, threshold: number) {
    const key = `${permitId}:${threshold}`;
    if (this.s.reminders.has(key)) return false;
    this.s.reminders.add(key);
    return true;
  }
}
