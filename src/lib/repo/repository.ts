import type {
  Application,
  ApplicationStatus,
  AuditEvent,
  Business,
  Checklist,
  Deadline,
  DemoRequest,
  DocumentRecord,
  ExtractionRun,
  Jurisdiction,
  Location,
  PermitRecord,
  PermitType,
  RegulatorySource,
  Task,
  User,
} from "../types.ts";

export type ItemDecision = "met" | "not_met" | "not_applicable" | null;

/**
 * Storage contract. `MemoryRepository` serves the fictional demo dataset;
 * `PostgresRepository` is used whenever DATABASE_URL is set (schema: db/schema.sql).
 * Every write takes an actor id and appends an audit event in the same transaction.
 */
export interface Repository {
  listUsers(): Promise<User[]>;
  listJurisdictions(): Promise<Jurisdiction[]>;
  listBusinesses(): Promise<Business[]>;
  listLocations(): Promise<Location[]>;
  listSources(): Promise<RegulatorySource[]>;
  listPermitTypes(): Promise<PermitType[]>;
  listChecklists(): Promise<Checklist[]>;
  listApplications(): Promise<Application[]>;
  getApplication(id: string): Promise<Application | undefined>;
  listDocuments(applicationId?: string): Promise<DocumentRecord[]>;
  listPermits(): Promise<PermitRecord[]>;
  listTasks(): Promise<Task[]>;
  listAudit(opts?: { entityId?: string; limit?: number }): Promise<AuditEvent[]>;
  listExtractionRuns(): Promise<ExtractionRun[]>;
  listDemoRequests(): Promise<DemoRequest[]>;

  addDocument(doc: DocumentRecord, actorId: string): Promise<void>;
  linkDocument(documentId: string, requirementId: string | null, actorId: string): Promise<void>;
  setItemStatus(applicationId: string, itemId: string, decision: ItemDecision, note: string | undefined, actorId: string): Promise<void>;
  setApplicationStatus(applicationId: string, status: ApplicationStatus, actorId: string): Promise<void>;
  addDeadline(applicationId: string, deadline: Deadline, actorId: string): Promise<void>;
  createTask(task: Task, actorId: string): Promise<void>;
  updateTask(taskId: string, patch: Partial<Pick<Task, "status" | "assigneeId" | "dueDate">>, actorId: string): Promise<void>;
  saveExtractionRun(run: ExtractionRun, actorId: string): Promise<void>;
  reviewExtractionRun(runId: string, decision: "accepted" | "rejected", acceptedItemIds: string[], actorId: string): Promise<void>;
  addDemoRequest(req: DemoRequest): Promise<void>;
  /** Returns false if this (permit, threshold) reminder was already recorded — keeps the Lambda idempotent. */
  recordReminder(permitId: string, threshold: number): Promise<boolean>;
  appendAudit(event: Omit<AuditEvent, "id" | "at">): Promise<void>;
}
