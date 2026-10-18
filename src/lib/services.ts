// Read-side service layer shared by dashboard pages, API routes and Lambdas.
import { assessCompleteness, type CompletenessReport } from "./engine/completeness.ts";
import { renewalStatus, type RenewalStatus } from "./engine/renewals.ts";
import { validateDocument } from "./engine/validation.ts";
import type { Repository } from "./repo/repository.ts";
import type { Application, Checklist, DocumentRecord, RequirementItem } from "./types.ts";

/** Demo identity. Production resolves the signed-in user from Amazon Cognito. */
export const CURRENT_USER_ID = "u-amara";

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function loadWorkspace(repo: Repository) {
  const [users, jurisdictions, businesses, locations, sources, permitTypes, checklists, applications, rawDocs, permits, tasks] = await Promise.all([
    repo.listUsers(),
    repo.listJurisdictions(),
    repo.listBusinesses(),
    repo.listLocations(),
    repo.listSources(),
    repo.listPermitTypes(),
    repo.listChecklists(),
    repo.listApplications(),
    repo.listDocuments(),
    repo.listPermits(),
    repo.listTasks(),
  ]);
  const today = todayISO();
  const itemIndex = new Map<string, RequirementItem>();
  for (const c of checklists) for (const i of c.items) itemIndex.set(i.id, i);

  const documents: DocumentRecord[] = rawDocs.map((d) => ({
    ...d,
    validation: validateDocument(d, d.requirementId ? itemIndex.get(d.requirementId) : undefined, today),
  }));

  const byId = <T extends { id: string }>(xs: T[]) => new Map(xs.map((x) => [x.id, x]));
  const maps = {
    users: byId(users),
    jurisdictions: byId(jurisdictions),
    businesses: byId(businesses),
    locations: byId(locations),
    sources: byId(sources),
    permitTypes: byId(permitTypes),
    checklists: byId(checklists),
    applications: byId(applications),
  };

  const reports = new Map<string, CompletenessReport>();
  for (const a of applications) {
    const cl = maps.checklists.get(a.checklistId);
    if (cl && cl.status === "verified") reports.set(a.id, assessCompleteness(a, cl, documents));
  }

  const renewals: RenewalStatus[] = permits.map((p) => renewalStatus(p, today)).sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  return {
    today,
    users, jurisdictions, businesses, locations, sources, permitTypes, checklists, applications, documents, permits, tasks,
    maps, reports, renewals, itemIndex,
    userName: (id: string) => (id.startsWith("system:") ? id.replace("system:", "System · ") : maps.users.get(id)?.name ?? id),
    jurisdictionName: (id: string) => maps.jurisdictions.get(id)?.name ?? id,
  };
}

export type Workspace = Awaited<ReturnType<typeof loadWorkspace>>;

export function sourceForItem(ws: Workspace, item: RequirementItem) {
  const p = item.provenance;
  const source = p.sourceId ? ws.maps.sources.get(p.sourceId) : undefined;
  const section = source?.sections.find((s) => s.id === p.sectionId);
  return { source, section };
}

export function applicationLabel(ws: Workspace, a: Application) {
  return {
    business: ws.maps.businesses.get(a.businessId)!,
    location: ws.maps.locations.get(a.locationId)!,
    permitType: ws.maps.permitTypes.get(a.permitTypeId)!,
    checklist: ws.maps.checklists.get(a.checklistId) as Checklist,
  };
}

export const STATUS_LABEL: Record<Application["status"], string> = {
  draft: "Draft",
  collecting: "Collecting documents",
  internal_review: "Internal review",
  submitted: "Submitted",
  information_requested: "Information requested",
  approved: "Approved",
  denied: "Denied",
  withdrawn: "Withdrawn",
};
