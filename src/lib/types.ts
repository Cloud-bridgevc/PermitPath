// Core domain model for PermitPath.
//
// Two kinds of information flow through the system and must never be confused:
//   1. VERIFIED regulatory information — traceable to an approved official source,
//      with a jurisdiction, effective date and last-verified date.
//   2. AI SUGGESTIONS — produced by a model or heuristic, never authoritative until
//      a named reviewer verifies them against the source.
// `Provenance` is attached to every requirement so the UI can always tell them apart.

export type ISODate = string; // YYYY-MM-DD
export type ISODateTime = string;

export type Role = "admin" | "consultant" | "client";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string;
}

export type Industry = "construction" | "retail" | "hospitality" | "consulting" | "enterprise";

export interface Business {
  id: string;
  name: string;
  industry: Industry;
  primaryContact: string;
  contactEmail: string;
  notes?: string;
}

export interface Jurisdiction {
  id: string;
  name: string;
  level: "state" | "county" | "city";
  parentId?: string;
  /** Demo jurisdictions are fictional and must be labelled as such everywhere. */
  fictional: boolean;
}

export interface Location {
  id: string;
  businessId: string;
  name: string;
  address: string;
  jurisdictionIds: string[]; // every jurisdiction with authority over this site
}

export type SourceStatus = "approved" | "pending_review" | "retired";

export interface SourceSection {
  id: string; // stable anchor, e.g. "s3.2"
  heading: string;
  text: string;
}

/** An official regulatory source in the approved knowledge base. */
export interface RegulatorySource {
  id: string;
  title: string;
  authority: string; // issuing body
  jurisdictionId: string;
  url: string;
  documentType: "guidance" | "application_form" | "ordinance" | "checklist" | "notice";
  /** Date the source states it took effect. */
  effectiveDate: ISODate;
  /** Last date a named person confirmed the source is current with the authority. */
  lastVerifiedAt: ISODate;
  verifiedBy: string; // user id
  status: SourceStatus;
  supersedesId?: string;
  s3Key?: string;
  sha256?: string;
  sections: SourceSection[];
  fictional: boolean;
}

export type RequirementKind = "document" | "condition" | "step";

export type Provenance =
  | {
      kind: "verified";
      sourceId: string;
      sectionId: string;
      quote: string; // verbatim text from the source section
      verifiedBy: string;
      verifiedAt: ISODate;
    }
  | {
      kind: "ai_suggested";
      sourceId?: string;
      sectionId?: string;
      quote?: string;
      method: "bedrock" | "heuristic";
      groundingCheck: "quote_found" | "quote_not_found" | "no_quote";
      createdAt: ISODateTime;
    };

export interface RequirementItem {
  id: string;
  code: string; // e.g. "FS-03"
  title: string;
  description: string;
  kind: RequirementKind;
  /** Document types that satisfy the item (only for kind === "document"). */
  acceptedDocTypes: string[];
  mandatory: boolean;
  /** Some items need the applicant to confirm directly with the authority. */
  confirmWithAuthority: boolean;
  provenance: Provenance;
}

export interface PermitType {
  id: string;
  name: string;
  jurisdictionId: string;
  authority: string;
  description: string;
  sourceIds: string[];
  fictional: boolean;
}

export type ChecklistStatus = "verified" | "draft" | "superseded";

export interface Checklist {
  id: string;
  name: string;
  permitTypeId: string;
  jurisdictionId: string;
  version: number;
  status: ChecklistStatus;
  lastVerifiedAt: ISODate;
  verifiedBy: string;
  items: RequirementItem[];
}

export type ApplicationStatus =
  | "draft"
  | "collecting"
  | "internal_review"
  | "submitted"
  | "information_requested"
  | "approved"
  | "denied"
  | "withdrawn";

export interface Deadline {
  id: string;
  label: string;
  date: ISODate;
  /** Where the date came from — PermitPath never computes regulatory timelines itself. */
  origin: "authority_notice" | "user_entered" | "internal_target";
  note?: string;
}

export interface Application {
  id: string;
  reference: string; // internal reference
  authorityReference?: string; // number issued by the authority, if any
  businessId: string;
  locationId: string;
  permitTypeId: string;
  checklistId: string;
  status: ApplicationStatus;
  leadConsultantId: string;
  createdAt: ISODateTime;
  submittedAt?: ISODate;
  deadlines: Deadline[];
  /** Per-item manual overrides for non-document items (conditions, steps). */
  itemStatus: Record<string, { state: "met" | "not_met" | "not_applicable"; by: string; at: ISODateTime; note?: string }>;
}

export type ValidationState = "pending" | "passed" | "issues";

export interface ValidationCheck {
  id: string;
  label: string;
  result: "pass" | "fail" | "warn";
  detail?: string;
}

export interface DocumentRecord {
  id: string;
  applicationId: string;
  fileName: string;
  docType: string;
  sizeBytes: number;
  mimeType: string;
  s3Key: string;
  uploadedAt: ISODateTime;
  uploadedBy: string;
  /** Which checklist item the user (or a confirmed suggestion) linked this file to. */
  requirementId?: string;
  linkConfirmed: boolean;
  documentDate?: ISODate;
  expiresOn?: ISODate;
  validation: { state: ValidationState; checks: ValidationCheck[] };
}

export interface PermitRecord {
  id: string;
  permitTypeId: string;
  locationId: string;
  businessId: string;
  applicationId?: string;
  permitNumber: string;
  issuedOn: ISODate;
  /** Recorded from the issued permit — never estimated. */
  expiresOn: ISODate;
  /** Days before expiration to remind. Configured per permit. */
  reminderDays: number[];
  ownerId: string;
  renewalApplicationId?: string;
}

export type TaskStatus = "open" | "in_progress" | "blocked" | "done";

export interface Task {
  id: string;
  applicationId?: string;
  permitId?: string;
  requirementId?: string;
  title: string;
  assigneeId: string;
  dueDate?: ISODate;
  status: TaskStatus;
  createdBy: string; // user id or "system:renewal-monitor"
  createdAt: ISODateTime;
}

export interface AuditEvent {
  id: string;
  at: ISODateTime;
  actorId: string; // user id or "system:*"
  action: string;
  entityType: string;
  entityId: string;
  detail: string;
}

export interface ExtractionRun {
  id: string;
  sourceId: string;
  permitTypeId?: string;
  createdAt: ISODateTime;
  createdBy: string;
  method: "bedrock" | "heuristic";
  status: "pending_review" | "accepted" | "rejected";
  items: RequirementItem[];
}

export interface DemoRequest {
  id: string;
  at: ISODateTime;
  name: string;
  email: string;
  company: string;
  segment: Industry;
  locations: string;
  message?: string;
  hubspot: { synced: boolean; detail: string };
}
