// PostgreSQL repository (schema: db/schema.sql). Used when DATABASE_URL is set.
import type { Pool, PoolClient } from "pg";
import type {
  Application,
  AuditEvent,
  Checklist,
  DemoRequest,
  DocumentRecord,
  ExtractionRun,
  RegulatorySource,
  RequirementItem,
} from "../types.ts";
import type { ItemDecision, Repository } from "./repository.ts";

const ORG = process.env.PERMITPATH_ORG_ID ?? "org-meridian";
const iso = (d: Date | string | null | undefined) => (d == null ? undefined : typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10));
const isoTs = (d: Date | string) => (typeof d === "string" ? d : d.toISOString());

export class PostgresRepository implements Repository {
  private pool: Pool;
  constructor(pool: Pool) {
    this.pool = pool;
  }

  private async tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      const r = await fn(c);
      await c.query("COMMIT");
      return r;
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }

  private async audit(c: PoolClient | Pool, e: Omit<AuditEvent, "id" | "at">) {
    await c.query(
      "INSERT INTO audit_events (org_id, actor_id, action, entity_type, entity_id, detail) VALUES ($1,$2,$3,$4,$5,$6)",
      [ORG, e.actorId, e.action, e.entityType, e.entityId, e.detail],
    );
  }

  async appendAudit(e: Omit<AuditEvent, "id" | "at">) {
    await this.audit(this.pool, e);
  }

  async listUsers() {
    const { rows } = await this.pool.query("SELECT id, name, email, role, title FROM users WHERE org_id = $1 ORDER BY name", [ORG]);
    return rows;
  }

  async listJurisdictions() {
    const { rows } = await this.pool.query("SELECT id, name, level, parent_id, fictional FROM jurisdictions ORDER BY level, name");
    return rows.map((r) => ({ id: r.id, name: r.name, level: r.level, parentId: r.parent_id ?? undefined, fictional: r.fictional }));
  }

  async listBusinesses() {
    const { rows } = await this.pool.query("SELECT * FROM businesses WHERE org_id = $1 ORDER BY name", [ORG]);
    return rows.map((r) => ({ id: r.id, name: r.name, industry: r.industry, primaryContact: r.primary_contact, contactEmail: r.contact_email, notes: r.notes ?? undefined }));
  }

  async listLocations() {
    const { rows } = await this.pool.query("SELECT * FROM locations WHERE org_id = $1 ORDER BY name", [ORG]);
    return rows.map((r) => ({ id: r.id, businessId: r.business_id, name: r.name, address: r.address, jurisdictionIds: r.jurisdiction_ids }));
  }

  async listSources(): Promise<RegulatorySource[]> {
    const { rows } = await this.pool.query(
      `SELECT s.*, COALESCE(json_agg(json_build_object('id', x.id, 'heading', x.heading, 'text', x.body) ORDER BY x.ordinal) FILTER (WHERE x.id IS NOT NULL), '[]') AS sections
         FROM regulatory_sources s LEFT JOIN source_sections x ON x.source_id = s.id
        WHERE s.org_id IS NULL OR s.org_id = $1
        GROUP BY s.id ORDER BY s.title`,
      [ORG],
    );
    return rows.map((r) => ({
      id: r.id, title: r.title, authority: r.authority, jurisdictionId: r.jurisdiction_id, url: r.url, documentType: r.document_type,
      effectiveDate: iso(r.effective_date)!, lastVerifiedAt: iso(r.last_verified_at)!, verifiedBy: r.verified_by, status: r.status,
      supersedesId: r.supersedes_id ?? undefined, s3Key: r.s3_key ?? undefined, sha256: r.sha256 ?? undefined, sections: r.sections, fictional: r.fictional,
    }));
  }

  async listPermitTypes() {
    const { rows } = await this.pool.query("SELECT * FROM permit_types ORDER BY name");
    return rows.map((r) => ({ id: r.id, name: r.name, jurisdictionId: r.jurisdiction_id, authority: r.authority, description: r.description, sourceIds: r.source_ids, fictional: r.fictional }));
  }

  async listChecklists(): Promise<Checklist[]> {
    const { rows: cls } = await this.pool.query("SELECT * FROM checklists ORDER BY name, version DESC");
    const { rows: items } = await this.pool.query("SELECT * FROM requirement_items ORDER BY checklist_id, ordinal");
    return cls.map((c) => ({
      id: c.id, name: c.name, permitTypeId: c.permit_type_id, jurisdictionId: c.jurisdiction_id, version: c.version, status: c.status,
      lastVerifiedAt: iso(c.last_verified_at)!, verifiedBy: c.verified_by,
      items: items.filter((i) => i.checklist_id === c.id).map(
        (i): RequirementItem => ({
          id: i.id, code: i.code, title: i.title, description: i.description, kind: i.kind, acceptedDocTypes: i.accepted_doc_types,
          mandatory: i.mandatory, confirmWithAuthority: i.confirm_with_authority, provenance: i.provenance,
        }),
      ),
    }));
  }

  private async hydrateApplications(where: string, params: unknown[]): Promise<Application[]> {
    const { rows } = await this.pool.query(
      `SELECT a.*,
         COALESCE((SELECT json_agg(json_build_object('id', d.id, 'label', d.label, 'date', to_char(d.date,'YYYY-MM-DD'), 'origin', d.origin, 'note', d.note) ORDER BY d.date) FROM deadlines d WHERE d.application_id = a.id), '[]') AS deadlines,
         COALESCE((SELECT json_object_agg(s.item_id, json_build_object('state', s.state, 'by', s.decided_by, 'at', s.decided_at, 'note', s.note)) FROM application_item_status s WHERE s.application_id = a.id), '{}') AS item_status
       FROM applications a WHERE a.org_id = $1 ${where} ORDER BY a.reference`,
      [ORG, ...params],
    );
    return rows.map((r) => ({
      id: r.id, reference: r.reference, authorityReference: r.authority_reference ?? undefined, businessId: r.business_id, locationId: r.location_id,
      permitTypeId: r.permit_type_id, checklistId: r.checklist_id, status: r.status, leadConsultantId: r.lead_consultant_id,
      createdAt: isoTs(r.created_at), submittedAt: iso(r.submitted_at), deadlines: r.deadlines, itemStatus: r.item_status,
    }));
  }

  listApplications() {
    return this.hydrateApplications("", []);
  }

  async getApplication(id: string) {
    return (await this.hydrateApplications("AND a.id = $2", [id]))[0];
  }

  async listDocuments(applicationId?: string): Promise<DocumentRecord[]> {
    const { rows } = await this.pool.query(
      `SELECT d.* FROM documents d JOIN applications a ON a.id = d.application_id
        WHERE a.org_id = $1 AND ($2::text IS NULL OR d.application_id = $2) ORDER BY d.uploaded_at`,
      [ORG, applicationId ?? null],
    );
    return rows.map((r) => ({
      id: r.id, applicationId: r.application_id, fileName: r.file_name, docType: r.doc_type, sizeBytes: Number(r.size_bytes), mimeType: r.mime_type,
      s3Key: r.s3_key, uploadedAt: isoTs(r.uploaded_at), uploadedBy: r.uploaded_by, requirementId: r.requirement_id ?? undefined,
      linkConfirmed: r.link_confirmed, documentDate: iso(r.document_date), expiresOn: iso(r.expires_on),
      validation: { state: "pending", checks: [] }, // computed at read time by the service layer
    }));
  }

  async listPermits() {
    const { rows } = await this.pool.query("SELECT * FROM permits WHERE org_id = $1 ORDER BY expires_on", [ORG]);
    return rows.map((r) => ({
      id: r.id, permitTypeId: r.permit_type_id, locationId: r.location_id, businessId: r.business_id, applicationId: r.application_id ?? undefined,
      permitNumber: r.permit_number, issuedOn: iso(r.issued_on)!, expiresOn: iso(r.expires_on)!, reminderDays: r.reminder_days, ownerId: r.owner_id,
      renewalApplicationId: r.renewal_application_id ?? undefined,
    }));
  }

  async listTasks() {
    const { rows } = await this.pool.query("SELECT * FROM tasks WHERE org_id = $1 ORDER BY due_date NULLS LAST", [ORG]);
    return rows.map((r) => ({
      id: r.id, applicationId: r.application_id ?? undefined, permitId: r.permit_id ?? undefined, requirementId: r.requirement_id ?? undefined,
      title: r.title, assigneeId: r.assignee_id, dueDate: iso(r.due_date), status: r.status, createdBy: r.created_by, createdAt: isoTs(r.created_at),
    }));
  }

  async listAudit(opts: { entityId?: string; limit?: number } = {}) {
    const { rows } = await this.pool.query(
      "SELECT * FROM audit_events WHERE org_id = $1 AND ($2::text IS NULL OR entity_id = $2) ORDER BY at DESC LIMIT $3",
      [ORG, opts.entityId ?? null, opts.limit ?? 200],
    );
    return rows.map((r) => ({ id: r.id, at: isoTs(r.at), actorId: r.actor_id, action: r.action, entityType: r.entity_type, entityId: r.entity_id, detail: r.detail }));
  }

  async listExtractionRuns(): Promise<ExtractionRun[]> {
    const { rows } = await this.pool.query("SELECT * FROM extraction_runs ORDER BY created_at DESC");
    return rows.map((r) => ({ id: r.id, sourceId: r.source_id, permitTypeId: r.permit_type_id ?? undefined, createdAt: isoTs(r.created_at), createdBy: r.created_by, method: r.method, status: r.status, items: r.items }));
  }

  async listDemoRequests(): Promise<DemoRequest[]> {
    const { rows } = await this.pool.query("SELECT * FROM demo_requests ORDER BY at DESC LIMIT 100");
    return rows.map((r) => ({ ...r, at: isoTs(r.at) }));
  }

  async addDocument(doc: DocumentRecord, actorId: string) {
    await this.tx(async (c) => {
      await c.query(
        `INSERT INTO documents (id, application_id, file_name, doc_type, size_bytes, mime_type, s3_key, uploaded_by, requirement_id, link_confirmed, document_date, expires_on)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [doc.id, doc.applicationId, doc.fileName, doc.docType, doc.sizeBytes, doc.mimeType, doc.s3Key, doc.uploadedBy, doc.requirementId ?? null, doc.linkConfirmed, doc.documentDate ?? null, doc.expiresOn ?? null],
      );
      await this.audit(c, { actorId, action: "document.uploaded", entityType: "document", entityId: doc.id, detail: `${doc.fileName} uploaded to ${doc.applicationId}.` });
    });
  }

  async linkDocument(documentId: string, requirementId: string | null, actorId: string) {
    await this.tx(async (c) => {
      await c.query("UPDATE documents SET requirement_id = $2, link_confirmed = $3 WHERE id = $1", [documentId, requirementId, requirementId !== null]);
      await this.audit(c, { actorId, action: requirementId ? "document.linked" : "document.unlinked", entityType: "document", entityId: documentId, detail: requirementId ? `Linked to ${requirementId} (confirmed by user).` : "Link removed." });
    });
  }

  async setItemStatus(applicationId: string, itemId: string, decision: ItemDecision, note: string | undefined, actorId: string) {
    await this.tx(async (c) => {
      if (decision === null) await c.query("DELETE FROM application_item_status WHERE application_id = $1 AND item_id = $2", [applicationId, itemId]);
      else
        await c.query(
          `INSERT INTO application_item_status (application_id, item_id, state, decided_by, note) VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (application_id, item_id) DO UPDATE SET state = EXCLUDED.state, decided_by = EXCLUDED.decided_by, decided_at = now(), note = EXCLUDED.note`,
          [applicationId, itemId, decision, actorId, note ?? null],
        );
      await this.audit(c, { actorId, action: "requirement.status", entityType: "application", entityId: applicationId, detail: `${itemId} → ${decision ?? "cleared"}` });
    });
  }

  async setApplicationStatus(applicationId: string, status: Application["status"], actorId: string) {
    await this.tx(async (c) => {
      await c.query(
        "UPDATE applications SET status = $2, submitted_at = CASE WHEN $2 = 'submitted' THEN COALESCE(submitted_at, CURRENT_DATE) ELSE submitted_at END WHERE id = $1 AND org_id = $3",
        [applicationId, status, ORG],
      );
      await this.audit(c, { actorId, action: "application.status", entityType: "application", entityId: applicationId, detail: `→ ${status}` });
    });
  }

  async addDeadline(applicationId: string, d: Application["deadlines"][number], actorId: string) {
    await this.tx(async (c) => {
      await c.query("INSERT INTO deadlines (id, application_id, label, date, origin, note) VALUES ($1,$2,$3,$4,$5,$6)", [d.id, applicationId, d.label, d.date, d.origin, d.note ?? null]);
      await this.audit(c, { actorId, action: "deadline.recorded", entityType: "application", entityId: applicationId, detail: `${d.label} on ${d.date} (${d.origin}).` });
    });
  }

  async createTask(t: Parameters<Repository["createTask"]>[0], actorId: string) {
    await this.tx(async (c) => {
      await c.query(
        "INSERT INTO tasks (id, org_id, application_id, permit_id, requirement_id, title, assignee_id, due_date, status, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
        [t.id, ORG, t.applicationId ?? null, t.permitId ?? null, t.requirementId ?? null, t.title, t.assigneeId, t.dueDate ?? null, t.status, t.createdBy],
      );
      await this.audit(c, { actorId, action: "task.created", entityType: "task", entityId: t.id, detail: `${t.title} → ${t.assigneeId}` });
    });
  }

  async updateTask(taskId: string, patch: Parameters<Repository["updateTask"]>[1], actorId: string) {
    await this.tx(async (c) => {
      await c.query(
        "UPDATE tasks SET status = COALESCE($2, status), assignee_id = COALESCE($3, assignee_id), due_date = COALESCE($4::date, due_date) WHERE id = $1 AND org_id = $5",
        [taskId, patch.status ?? null, patch.assigneeId ?? null, patch.dueDate ?? null, ORG],
      );
      await this.audit(c, { actorId, action: "task.updated", entityType: "task", entityId: taskId, detail: JSON.stringify(patch) });
    });
  }

  async saveExtractionRun(run: ExtractionRun, actorId: string) {
    await this.tx(async (c) => {
      await c.query(
        "INSERT INTO extraction_runs (id, source_id, permit_type_id, created_by, method, model_id, status, items) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
        [run.id, run.sourceId, run.permitTypeId ?? null, run.createdBy, run.method, process.env.BEDROCK_MODEL_ID ?? null, run.status, JSON.stringify(run.items)],
      );
      await this.audit(c, { actorId, action: "extraction.completed", entityType: "extraction", entityId: run.id, detail: `${run.items.length} candidates via ${run.method}.` });
    });
  }

  async reviewExtractionRun(runId: string, decision: "accepted" | "rejected", acceptedItemIds: string[], actorId: string) {
    await this.tx(async (c) => {
      await c.query("UPDATE extraction_runs SET status = $2 WHERE id = $1", [runId, decision]);
      await this.audit(c, { actorId, action: `extraction.${decision}`, entityType: "extraction", entityId: runId, detail: acceptedItemIds.join(", ") || "none" });
    });
  }

  async addDemoRequest(r: DemoRequest) {
    await this.pool.query(
      "INSERT INTO demo_requests (id, name, email, company, segment, locations, message, hubspot) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [r.id, r.name, r.email, r.company, r.segment, r.locations, r.message ?? null, JSON.stringify(r.hubspot)],
    );
  }

  async recordReminder(permitId: string, threshold: number) {
    const { rowCount } = await this.pool.query(
      "INSERT INTO reminder_log (permit_id, threshold) VALUES ($1,$2) ON CONFLICT DO NOTHING",
      [permitId, threshold],
    );
    return (rowCount ?? 0) > 0;
  }
}
