// DEMONSTRATION DATA — ENTIRELY FICTIONAL.
//
// Every jurisdiction, authority, business, person, permit type and "official source"
// below is invented for product demonstration. None of it describes a real permit,
// fee, legal requirement or approval timeline. Source URLs use the reserved `.example`
// top-level domain so they can never resolve to a real authority.
//
// Dates are generated relative to "today" so renewals and deadlines stay meaningful.

import type {
  Application,
  AuditEvent,
  Business,
  Checklist,
  DocumentRecord,
  ExtractionRun,
  Jurisdiction,
  Location,
  PermitRecord,
  PermitType,
  RegulatorySource,
  RequirementItem,
  Task,
  User,
} from "../types.ts";

const DAY = 86_400_000;
export function dayOffset(days: number, base = new Date()): string {
  return new Date(base.getTime() + days * DAY).toISOString().slice(0, 10);
}
function ts(days: number, hour = 10): string {
  const d = new Date(Date.now() + days * DAY);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

export const users: User[] = [
  { id: "u-amara", name: "Amara Okafor", email: "amara@meridian-advisors.example", role: "consultant", title: "Lead Permit Consultant" },
  { id: "u-devin", name: "Devin Park", email: "devin@meridian-advisors.example", role: "consultant", title: "Permit Consultant" },
  { id: "u-rosa", name: "Rosa Lindqvist", email: "rosa@meridian-advisors.example", role: "admin", title: "Regulatory Content Reviewer" },
  { id: "u-marcus", name: "Marcus Bell", email: "marcus@juniperandsalt.example", role: "client", title: "Owner, Juniper & Salt" },
];

export const jurisdictions: Jurisdiction[] = [
  { id: "j-northmere", name: "State of Northmere", level: "state", fictional: true },
  { id: "j-harrow", name: "Harrow County", level: "county", parentId: "j-northmere", fictional: true },
  { id: "j-alderbrook", name: "City of Alderbrook", level: "city", parentId: "j-harrow", fictional: true },
  { id: "j-portlinden", name: "City of Port Linden", level: "city", parentId: "j-harrow", fictional: true },
];

export const businesses: Business[] = [
  { id: "b-juniper", name: "Juniper & Salt Kitchen", industry: "hospitality", primaryContact: "Marcus Bell", contactEmail: "marcus@juniperandsalt.example", notes: "New full-service restaurant opening in a former retail unit." },
  { id: "b-brightline", name: "Brightline Builders Co.", industry: "construction", primaryContact: "Tessa Moreno", contactEmail: "tessa@brightline.example", notes: "General contractor; manages tenant improvement permits for clients." },
  { id: "b-cobalt", name: "Cobalt Goods Co.", industry: "retail", primaryContact: "Imran Shah", contactEmail: "imran@cobaltgoods.example", notes: "Multi-location home goods retailer." },
  { id: "b-halcyon", name: "Halcyon Hotel Group", industry: "enterprise", primaryContact: "Priya Raman", contactEmail: "priya@halcyonhotels.example", notes: "Hotel operator with on-site restaurant." },
];

export const locations: Location[] = [
  { id: "l-juniper-riverside", businessId: "b-juniper", name: "Riverside", address: "88 Ferry Lane, Alderbrook", jurisdictionIds: ["j-northmere", "j-harrow", "j-alderbrook"] },
  { id: "l-brightline-quarry", businessId: "b-brightline", name: "412 Quarry Row (client site)", address: "412 Quarry Row, Suite 200, Alderbrook", jurisdictionIds: ["j-northmere", "j-harrow", "j-alderbrook"] },
  { id: "l-cobalt-alderbrook", businessId: "b-cobalt", name: "Alderbrook Market Street", address: "1500 Market Street, Alderbrook", jurisdictionIds: ["j-northmere", "j-harrow", "j-alderbrook"] },
  { id: "l-cobalt-portlinden", businessId: "b-cobalt", name: "Port Linden Harborwalk", address: "22 Harborwalk, Port Linden", jurisdictionIds: ["j-northmere", "j-harrow", "j-portlinden"] },
  { id: "l-halcyon-portlinden", businessId: "b-halcyon", name: "Halcyon Port Linden", address: "9 Lighthouse Road, Port Linden", jurisdictionIds: ["j-northmere", "j-harrow", "j-portlinden"] },
];

// ---------------------------------------------------------------------------
// Approved knowledge base (fictional official sources)
// ---------------------------------------------------------------------------

export const sources: RegulatorySource[] = [
  {
    id: "src-hc-food-2025",
    title: "Food Service Establishment Plan Review Guide",
    authority: "Harrow County Environmental Health Division",
    jurisdictionId: "j-harrow",
    url: "https://health.harrow-county.example/food/plan-review-guide-2025.pdf",
    documentType: "guidance",
    effectiveDate: "2025-03-01",
    lastVerifiedAt: dayOffset(-26),
    verifiedBy: "u-rosa",
    status: "approved",
    s3Key: "sources/j-harrow/src-hc-food-2025.pdf",
    fictional: true,
    sections: [
      { id: "s1", heading: "1. Purpose", text: "This guide describes the materials an applicant must submit for plan review of a new or remodeled food service establishment in Harrow County. Applicants should contact the Division to confirm current requirements before submitting." },
      { id: "s2", heading: "2. Required submittal documents", text: "The applicant must submit the following with the plan review application: (a) a completed Plan Review Application form signed by the owner or authorized agent; (b) a scaled floor plan showing the location of all food preparation, storage, warewashing and restroom areas; (c) an equipment schedule listing the make and model of each piece of food equipment; (d) a proposed menu, including any items served raw or undercooked; (e) a copy of a current food protection manager certificate for at least one person in charge." },
      { id: "s3", heading: "3. Conditional documents", text: "If food will be prepared at another location, the applicant must submit a signed commissary agreement. If the establishment is served by a private water supply, the applicant must submit a water test report from an accredited laboratory." },
      { id: "s4", heading: "4. Pre-opening inspection", text: "A pre-opening inspection must be completed and approved by the Division before the establishment operates. The applicant is responsible for scheduling the inspection after construction is complete." },
    ],
  },
  {
    id: "src-hc-food-2026",
    title: "Food Service Establishment Plan Review Guide (Revised)",
    authority: "Harrow County Environmental Health Division",
    jurisdictionId: "j-harrow",
    url: "https://health.harrow-county.example/food/plan-review-guide-2026.pdf",
    documentType: "guidance",
    effectiveDate: dayOffset(44),
    lastVerifiedAt: dayOffset(-3),
    verifiedBy: "u-rosa",
    status: "pending_review",
    supersedesId: "src-hc-food-2025",
    s3Key: "sources/j-harrow/src-hc-food-2026.pdf",
    fictional: true,
    sections: [
      { id: "s1", heading: "1. Purpose", text: "This guide describes the materials an applicant must submit for plan review of a new or remodeled food service establishment in Harrow County. Applicants should contact the Division to confirm current requirements before submitting." },
      { id: "s2", heading: "2. Required submittal documents", text: "The applicant must submit the following with the plan review application: (a) a completed Plan Review Application form signed by the owner or authorized agent; (b) a scaled floor plan showing the location of all food preparation, storage, warewashing and restroom areas; (c) an equipment schedule listing the make and model of each piece of food equipment; (d) a proposed menu, including any items served raw or undercooked; (e) a copy of a current food protection manager certificate for at least one person in charge; (f) a grease interceptor sizing worksheet, where the establishment discharges to the public sewer." },
      { id: "s3", heading: "3. Conditional documents", text: "If food will be prepared at another location, the applicant must submit a signed commissary agreement. If the establishment is served by a private water supply, the applicant must submit a water test report from an accredited laboratory." },
      { id: "s4", heading: "4. Pre-opening inspection", text: "A pre-opening inspection must be completed and approved by the Division before the establishment operates. The applicant is responsible for scheduling the inspection after construction is complete." },
    ],
  },
  {
    id: "src-ab-ti-2024",
    title: "Commercial Tenant Improvement Submittal Checklist",
    authority: "City of Alderbrook Building Division",
    jurisdictionId: "j-alderbrook",
    url: "https://permits.alderbrook.example/building/ti-submittal-checklist.pdf",
    documentType: "checklist",
    effectiveDate: "2024-07-15",
    lastVerifiedAt: dayOffset(-49),
    verifiedBy: "u-rosa",
    status: "approved",
    s3Key: "sources/j-alderbrook/src-ab-ti-2024.pdf",
    fictional: true,
    sections: [
      { id: "s1", heading: "Applicability", text: "This checklist applies to interior alterations of existing commercial spaces within the City of Alderbrook. It does not apply to new buildings or additions." },
      { id: "s2", heading: "Plans and drawings", text: "Submit two sets of construction drawings prepared and signed by a design professional licensed in the State of Northmere. Drawings must include a site plan identifying the tenant space, a floor plan of existing and proposed conditions, and a code analysis sheet." },
      { id: "s3", heading: "Supporting documents", text: "Each submittal must include a copy of the contractor's current state license, a letter of authorization from the property owner if the applicant is not the owner, and completed energy compliance forms for any lighting or mechanical alterations." },
      { id: "s4", heading: "Structural work", text: "Where the alteration affects structural elements, structural calculations stamped by a licensed engineer are required." },
    ],
  },
  {
    id: "src-ab-sign-2025",
    title: "Permanent Sign Permit Application Requirements",
    authority: "City of Alderbrook Planning Department",
    jurisdictionId: "j-alderbrook",
    url: "https://permits.alderbrook.example/planning/sign-permit-requirements.pdf",
    documentType: "application_form",
    effectiveDate: "2025-01-06",
    lastVerifiedAt: dayOffset(-99),
    verifiedBy: "u-rosa",
    status: "approved",
    s3Key: "sources/j-alderbrook/src-ab-sign-2025.pdf",
    fictional: true,
    sections: [
      { id: "s1", heading: "Submittal requirements", text: "A permanent sign permit application must include a scaled elevation drawing of each sign showing dimensions, materials and colors, and a site plan or building elevation showing the proposed sign location." },
      { id: "s2", heading: "Property owner consent", text: "Written consent from the property owner is required for all signs on leased premises." },
      { id: "s3", heading: "Illuminated signs", text: "Illuminated signs require proof that the sign is listed by a nationally recognized testing laboratory, and a separate electrical permit may be required. Applicants should confirm electrical permit requirements with the Building Division." },
    ],
  },
  {
    id: "src-nm-bev-2023",
    title: "On-Premises Beverage License Application Instructions",
    authority: "Northmere Beverage Control Board",
    jurisdictionId: "j-northmere",
    url: "https://bcb.northmere.example/licensing/on-premises-instructions.pdf",
    documentType: "guidance",
    effectiveDate: "2023-11-01",
    lastVerifiedAt: dayOffset(-43),
    verifiedBy: "u-rosa",
    status: "approved",
    s3Key: "sources/j-northmere/src-nm-bev-2023.pdf",
    fictional: true,
    sections: [
      { id: "s1", heading: "Application materials", text: "Applicants must provide a diagram of the licensed premises identifying all areas where beverages will be stored, served or consumed, and a copy of the executed lease or deed for the premises." },
      { id: "s2", heading: "Personal history disclosures", text: "Each owner, officer and manager must complete a personal history disclosure form." },
      { id: "s3", heading: "Local zoning verification", text: "The application must include a zoning verification letter issued by the local jurisdiction confirming that the proposed use is permitted at the premises." },
      { id: "s4", heading: "Public notice", text: "The applicant must post the public notice provided by the Board at the premises in the manner described in the notice. Applicants should follow the posting instructions in the notice issued for their application." },
    ],
  },
  {
    id: "src-pl-bizlic-2025",
    title: "Business Operating License — Application and Renewal",
    authority: "City of Port Linden Revenue Office",
    jurisdictionId: "j-portlinden",
    url: "https://revenue.portlinden.example/business-license/overview.html",
    documentType: "guidance",
    effectiveDate: "2025-06-01",
    lastVerifiedAt: dayOffset(-16),
    verifiedBy: "u-rosa",
    status: "approved",
    fictional: true,
    sections: [
      { id: "s1", heading: "New applications", text: "A new business operating license application must include the business's state registration number, a description of business activities, and proof of the right to occupy the business location." },
      { id: "s2", heading: "Renewals", text: "Licenses must be renewed before the expiration date printed on the license. The renewal form must be submitted with any updated ownership or location information." },
      { id: "s3", heading: "Changes", text: "Licensees must notify the Revenue Office of changes in ownership or business location." },
    ],
  },
];

export const permitTypes: PermitType[] = [
  { id: "pt-food", name: "Food Service Establishment Plan Review", jurisdictionId: "j-harrow", authority: "Harrow County Environmental Health Division", description: "Plan review for new or remodeled food service establishments.", sourceIds: ["src-hc-food-2025"], fictional: true },
  { id: "pt-ti", name: "Commercial Tenant Improvement Building Permit", jurisdictionId: "j-alderbrook", authority: "City of Alderbrook Building Division", description: "Interior alterations of existing commercial spaces.", sourceIds: ["src-ab-ti-2024"], fictional: true },
  { id: "pt-sign", name: "Permanent Sign Permit", jurisdictionId: "j-alderbrook", authority: "City of Alderbrook Planning Department", description: "Permanent on-premises signage.", sourceIds: ["src-ab-sign-2025"], fictional: true },
  { id: "pt-bev", name: "On-Premises Beverage License", jurisdictionId: "j-northmere", authority: "Northmere Beverage Control Board", description: "License to serve beverages for on-premises consumption.", sourceIds: ["src-nm-bev-2023"], fictional: true },
  { id: "pt-bizlic", name: "Business Operating License", jurisdictionId: "j-portlinden", authority: "City of Port Linden Revenue Office", description: "City business operating license, new and renewal.", sourceIds: ["src-pl-bizlic-2025"], fictional: true },
];

// ---------------------------------------------------------------------------
// Verified checklists — every item carries a verbatim quote from its source.
// tests/seed.test.ts asserts each quote appears in the cited section.
// ---------------------------------------------------------------------------

function item(
  id: string,
  code: string,
  title: string,
  description: string,
  kind: RequirementItem["kind"],
  acceptedDocTypes: string[],
  mandatory: boolean,
  sourceId: string,
  sectionId: string,
  quote: string,
  verifiedAt: string,
  confirmWithAuthority = false,
): RequirementItem {
  return {
    id, code, title, description, kind, acceptedDocTypes, mandatory, confirmWithAuthority,
    provenance: { kind: "verified", sourceId, sectionId, quote, verifiedBy: "u-rosa", verifiedAt },
  };
}

const vFood = dayOffset(-26);
const vTi = dayOffset(-49);
const vSign = dayOffset(-99);
const vBev = dayOffset(-43);
const vBiz = dayOffset(-16);

export const checklists: Checklist[] = [
  {
    id: "cl-food-v3", name: "Food Service Plan Review — submittal", permitTypeId: "pt-food", jurisdictionId: "j-harrow", version: 3, status: "verified", lastVerifiedAt: vFood, verifiedBy: "u-rosa",
    items: [
      item("ri-fs-01", "FS-01", "Plan Review Application form", "Completed and signed by the owner or authorized agent.", "document", ["plan_review_application"], true, "src-hc-food-2025", "s2", "a completed Plan Review Application form signed by the owner or authorized agent", vFood),
      item("ri-fs-02", "FS-02", "Scaled floor plan", "Shows food preparation, storage, warewashing and restroom areas.", "document", ["floor_plan"], true, "src-hc-food-2025", "s2", "a scaled floor plan showing the location of all food preparation, storage, warewashing and restroom areas", vFood),
      item("ri-fs-03", "FS-03", "Equipment schedule", "Make and model of each piece of food equipment.", "document", ["equipment_schedule"], true, "src-hc-food-2025", "s2", "an equipment schedule listing the make and model of each piece of food equipment", vFood),
      item("ri-fs-04", "FS-04", "Proposed menu", "Including any items served raw or undercooked.", "document", ["menu"], true, "src-hc-food-2025", "s2", "a proposed menu, including any items served raw or undercooked", vFood),
      item("ri-fs-05", "FS-05", "Food protection manager certificate", "A current certificate for at least one person in charge.", "document", ["food_manager_certificate"], true, "src-hc-food-2025", "s2", "a copy of a current food protection manager certificate for at least one person in charge", vFood),
      item("ri-fs-06", "FS-06", "Commissary agreement", "Only if food will be prepared at another location.", "document", ["commissary_agreement"], false, "src-hc-food-2025", "s3", "If food will be prepared at another location, the applicant must submit a signed commissary agreement.", vFood),
      item("ri-fs-07", "FS-07", "Water test report", "Only if served by a private water supply.", "document", ["water_test_report"], false, "src-hc-food-2025", "s3", "If the establishment is served by a private water supply, the applicant must submit a water test report from an accredited laboratory.", vFood),
      item("ri-fs-08", "FS-08", "Pre-opening inspection", "Must be completed and approved before operating. Schedule after construction is complete.", "step", [], true, "src-hc-food-2025", "s4", "A pre-opening inspection must be completed and approved by the Division before the establishment operates.", vFood, true),
    ],
  },
  {
    id: "cl-ti-v2", name: "Tenant Improvement — submittal", permitTypeId: "pt-ti", jurisdictionId: "j-alderbrook", version: 2, status: "verified", lastVerifiedAt: vTi, verifiedBy: "u-rosa",
    items: [
      item("ri-ti-01", "TI-01", "Construction drawings (two sets)", "Prepared and signed by a design professional licensed in Northmere.", "document", ["construction_drawings"], true, "src-ab-ti-2024", "s2", "Submit two sets of construction drawings prepared and signed by a design professional licensed in the State of Northmere.", vTi),
      item("ri-ti-02", "TI-02", "Site plan", "Identifies the tenant space.", "document", ["site_plan"], true, "src-ab-ti-2024", "s2", "a site plan identifying the tenant space", vTi),
      item("ri-ti-03", "TI-03", "Code analysis sheet", "Included with the drawing set.", "document", ["code_analysis"], true, "src-ab-ti-2024", "s2", "a code analysis sheet", vTi),
      item("ri-ti-04", "TI-04", "Contractor's state license", "Copy of the contractor's current state license.", "document", ["contractor_license"], true, "src-ab-ti-2024", "s3", "a copy of the contractor's current state license", vTi),
      item("ri-ti-05", "TI-05", "Owner authorization letter", "Required if the applicant is not the property owner.", "document", ["owner_authorization"], false, "src-ab-ti-2024", "s3", "a letter of authorization from the property owner if the applicant is not the owner", vTi),
      item("ri-ti-06", "TI-06", "Energy compliance forms", "For any lighting or mechanical alterations.", "document", ["energy_compliance"], false, "src-ab-ti-2024", "s3", "completed energy compliance forms for any lighting or mechanical alterations", vTi),
      item("ri-ti-07", "TI-07", "Structural calculations", "Stamped by a licensed engineer, where structural elements are affected.", "document", ["structural_calcs"], false, "src-ab-ti-2024", "s4", "Where the alteration affects structural elements, structural calculations stamped by a licensed engineer are required.", vTi),
    ],
  },
  {
    id: "cl-sign-v1", name: "Permanent Sign — submittal", permitTypeId: "pt-sign", jurisdictionId: "j-alderbrook", version: 1, status: "verified", lastVerifiedAt: vSign, verifiedBy: "u-rosa",
    items: [
      item("ri-sg-01", "SG-01", "Scaled sign elevation drawing", "Dimensions, materials and colors of each sign.", "document", ["sign_elevation"], true, "src-ab-sign-2025", "s1", "a scaled elevation drawing of each sign showing dimensions, materials and colors", vSign),
      item("ri-sg-02", "SG-02", "Sign location plan", "Site plan or building elevation showing the proposed location.", "document", ["site_plan", "building_elevation"], true, "src-ab-sign-2025", "s1", "a site plan or building elevation showing the proposed sign location", vSign),
      item("ri-sg-03", "SG-03", "Property owner consent", "Written consent for signs on leased premises.", "document", ["owner_consent"], false, "src-ab-sign-2025", "s2", "Written consent from the property owner is required for all signs on leased premises.", vSign),
      item("ri-sg-04", "SG-04", "Testing laboratory listing", "Only for illuminated signs. Electrical permit needs must be confirmed with the Building Division.", "document", ["electrical_listing"], false, "src-ab-sign-2025", "s3", "Illuminated signs require proof that the sign is listed by a nationally recognized testing laboratory", vSign, true),
    ],
  },
  {
    id: "cl-bev-v1", name: "On-Premises Beverage License — application", permitTypeId: "pt-bev", jurisdictionId: "j-northmere", version: 1, status: "verified", lastVerifiedAt: vBev, verifiedBy: "u-rosa",
    items: [
      item("ri-bv-01", "BV-01", "Licensed premises diagram", "All areas where beverages are stored, served or consumed.", "document", ["premises_diagram"], true, "src-nm-bev-2023", "s1", "a diagram of the licensed premises identifying all areas where beverages will be stored, served or consumed", vBev),
      item("ri-bv-02", "BV-02", "Executed lease or deed", "For the premises.", "document", ["lease", "deed"], true, "src-nm-bev-2023", "s1", "a copy of the executed lease or deed for the premises", vBev),
      item("ri-bv-03", "BV-03", "Personal history disclosures", "One per owner, officer and manager.", "document", ["personal_history"], true, "src-nm-bev-2023", "s2", "Each owner, officer and manager must complete a personal history disclosure form.", vBev),
      item("ri-bv-04", "BV-04", "Zoning verification letter", "Issued by the local jurisdiction.", "document", ["zoning_verification"], true, "src-nm-bev-2023", "s3", "a zoning verification letter issued by the local jurisdiction confirming that the proposed use is permitted at the premises", vBev),
      item("ri-bv-05", "BV-05", "Post public notice", "Follow the posting instructions in the notice issued by the Board.", "step", [], true, "src-nm-bev-2023", "s4", "The applicant must post the public notice provided by the Board at the premises in the manner described in the notice.", vBev, true),
    ],
  },
  {
    id: "cl-bizlic-renewal-v1", name: "Business Operating License — renewal", permitTypeId: "pt-bizlic", jurisdictionId: "j-portlinden", version: 1, status: "verified", lastVerifiedAt: vBiz, verifiedBy: "u-rosa",
    items: [
      item("ri-bl-01", "BL-01", "Renewal form", "Submitted before the expiration date printed on the license.", "document", ["renewal_form"], true, "src-pl-bizlic-2025", "s2", "Licenses must be renewed before the expiration date printed on the license.", vBiz),
      item("ri-bl-02", "BL-02", "Updated ownership or location information", "Only if ownership or location changed.", "document", ["ownership_update"], false, "src-pl-bizlic-2025", "s2", "The renewal form must be submitted with any updated ownership or location information.", vBiz),
    ],
  },
];

// ---------------------------------------------------------------------------
// Applications, documents, permits, tasks
// ---------------------------------------------------------------------------

export const applications: Application[] = [
  {
    id: "app-1001", reference: "PP-1001", businessId: "b-juniper", locationId: "l-juniper-riverside", permitTypeId: "pt-food", checklistId: "cl-food-v3",
    status: "collecting", leadConsultantId: "u-amara", createdAt: ts(-34),
    deadlines: [{ id: "dl-1", label: "Target submission (internal)", date: dayOffset(9), origin: "internal_target", note: "Set by consultant to align with the client's construction schedule." }],
    itemStatus: {
      "ri-fs-06": { state: "not_applicable", by: "u-amara", at: ts(-20), note: "Client confirmed all food prepared on site." },
      "ri-fs-07": { state: "not_applicable", by: "u-amara", at: ts(-20), note: "Site connects to municipal water per lease exhibit B." },
      "ri-fs-08": { state: "not_met", by: "u-amara", at: ts(-20) },
    },
  },
  {
    id: "app-1002", reference: "PP-1002", authorityReference: "NBCB-DEMO-55021", businessId: "b-juniper", locationId: "l-juniper-riverside", permitTypeId: "pt-bev", checklistId: "cl-bev-v1",
    status: "information_requested", leadConsultantId: "u-amara", createdAt: ts(-61), submittedAt: dayOffset(-21),
    deadlines: [{ id: "dl-2", label: "Information request response", date: dayOffset(6), origin: "authority_notice", note: "Date as stated in the Board's notice dated " + dayOffset(-8) + " (fictional notice)." }],
    itemStatus: { "ri-bv-05": { state: "not_met", by: "u-amara", at: ts(-8) } },
  },
  {
    id: "app-1003", reference: "PP-1003", businessId: "b-brightline", locationId: "l-brightline-quarry", permitTypeId: "pt-ti", checklistId: "cl-ti-v2",
    status: "internal_review", leadConsultantId: "u-devin", createdAt: ts(-19),
    deadlines: [{ id: "dl-3", label: "Client-requested submission date", date: dayOffset(4), origin: "user_entered" }],
    itemStatus: { "ri-ti-07": { state: "not_applicable", by: "u-devin", at: ts(-12), note: "Engineer letter on file: no structural elements affected." } },
  },
  {
    id: "app-1004", reference: "PP-1004", businessId: "b-cobalt", locationId: "l-cobalt-alderbrook", permitTypeId: "pt-sign", checklistId: "cl-sign-v1",
    status: "draft", leadConsultantId: "u-devin", createdAt: ts(-5),
    deadlines: [],
    itemStatus: {},
  },
  {
    id: "app-1005", reference: "PP-1005", authorityReference: "PLRO-DEMO-2207", businessId: "b-cobalt", locationId: "l-cobalt-portlinden", permitTypeId: "pt-bizlic", checklistId: "cl-bizlic-renewal-v1",
    status: "submitted", leadConsultantId: "u-amara", createdAt: ts(-12), submittedAt: dayOffset(-3),
    deadlines: [],
    itemStatus: { "ri-bl-02": { state: "not_applicable", by: "u-amara", at: ts(-10), note: "No ownership or location changes." } },
  },
];

function doc(
  id: string, applicationId: string, fileName: string, docType: string, requirementId: string | undefined,
  uploadedDaysAgo: number, extra: Partial<DocumentRecord> = {},
): DocumentRecord {
  return {
    id, applicationId, fileName, docType,
    sizeBytes: 180_000 + (fileName.length * 9_137) % 2_400_000,
    mimeType: fileName.endsWith(".xlsx") ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf",
    s3Key: `tenants/meridian/applications/${applicationId}/${id}/${fileName}`,
    uploadedAt: ts(-uploadedDaysAgo), uploadedBy: "u-amara",
    requirementId, linkConfirmed: requirementId !== undefined,
    validation: { state: "passed", checks: [] },
    ...extra,
  };
}

export const documents: DocumentRecord[] = [
  doc("doc-01", "app-1001", "Juniper_PlanReviewApp_signed.pdf", "plan_review_application", "ri-fs-01", 18),
  doc("doc-02", "app-1001", "Riverside_FloorPlan_rev3.pdf", "floor_plan", "ri-fs-02", 15),
  doc("doc-03", "app-1001", "Menu_Draft_Sept.pdf", "menu", "ri-fs-04", 11),
  doc("doc-04", "app-1001", "FPM_Certificate_DLeung.pdf", "food_manager_certificate", "ri-fs-05", 9, { expiresOn: dayOffset(-12), documentDate: dayOffset(-1838) }),
  doc("doc-05", "app-1001", "Kitchen_equipment_quote.xlsx", "equipment_quote", undefined, 4, { uploadedBy: "u-marcus" }),
  doc("doc-06", "app-1002", "Riverside_Premises_Diagram.pdf", "premises_diagram", "ri-bv-01", 40),
  doc("doc-07", "app-1002", "Riverside_Lease_Executed.pdf", "lease", "ri-bv-02", 40),
  doc("doc-08", "app-1002", "PHD_MarcusBell.pdf", "personal_history", "ri-bv-03", 38),
  doc("doc-09", "app-1003", "QuarryRow_ConstructionSet_A.pdf", "construction_drawings", "ri-ti-01", 14, { uploadedBy: "u-devin" }),
  doc("doc-10", "app-1003", "QuarryRow_SitePlan.pdf", "site_plan", "ri-ti-02", 14, { uploadedBy: "u-devin" }),
  doc("doc-11", "app-1003", "QuarryRow_CodeAnalysis.pdf", "code_analysis", "ri-ti-03", 14, { uploadedBy: "u-devin" }),
  doc("doc-12", "app-1003", "Brightline_StateLicense.pdf", "contractor_license", "ri-ti-04", 13, { uploadedBy: "u-devin", expiresOn: dayOffset(212) }),
  doc("doc-13", "app-1003", "Owner_Authorization_QuarryRow.pdf", "owner_authorization", "ri-ti-05", 10, { uploadedBy: "u-devin" }),
  doc("doc-14", "app-1004", "Cobalt_Sign_Elevation.pdf", "sign_elevation", "ri-sg-01", 3, { uploadedBy: "u-devin" }),
  doc("doc-15", "app-1005", "PortLinden_Renewal_Form.pdf", "renewal_form", "ri-bl-01", 6),
];

export const permits: PermitRecord[] = [
  { id: "pm-01", permitTypeId: "pt-bizlic", locationId: "l-cobalt-portlinden", businessId: "b-cobalt", applicationId: undefined, permitNumber: "PL-BOL-DEMO-1182", issuedOn: dayOffset(-320), expiresOn: dayOffset(45), reminderDays: [90, 60, 30, 14], ownerId: "u-amara", renewalApplicationId: "app-1005" },
  { id: "pm-02", permitTypeId: "pt-bizlic", locationId: "l-halcyon-portlinden", businessId: "b-halcyon", permitNumber: "PL-BOL-DEMO-0974", issuedOn: dayOffset(-245), expiresOn: dayOffset(120), reminderDays: [90, 60, 30], ownerId: "u-devin" },
  { id: "pm-03", permitTypeId: "pt-food", locationId: "l-halcyon-portlinden", businessId: "b-halcyon", permitNumber: "HC-EH-DEMO-3310", issuedOn: dayOffset(-347), expiresOn: dayOffset(18), reminderDays: [60, 30, 14, 7], ownerId: "u-amara" },
  { id: "pm-04", permitTypeId: "pt-sign", locationId: "l-cobalt-portlinden", businessId: "b-cobalt", permitNumber: "AB-SGN-DEMO-0412", issuedOn: dayOffset(-500), expiresOn: dayOffset(230), reminderDays: [60, 30], ownerId: "u-devin" },
  { id: "pm-05", permitTypeId: "pt-bev", locationId: "l-halcyon-portlinden", businessId: "b-halcyon", permitNumber: "NBCB-DEMO-40177", issuedOn: dayOffset(-300), expiresOn: dayOffset(66), reminderDays: [90, 60, 30], ownerId: "u-amara" },
];

export const tasks: Task[] = [
  { id: "t-01", applicationId: "app-1001", requirementId: "ri-fs-03", title: "Obtain equipment schedule (make and model) from kitchen designer", assigneeId: "u-amara", dueDate: dayOffset(3), status: "in_progress", createdBy: "u-amara", createdAt: ts(-6) },
  { id: "t-02", applicationId: "app-1001", requirementId: "ri-fs-05", title: "Request current food protection manager certificate from client", assigneeId: "u-marcus", dueDate: dayOffset(5), status: "open", createdBy: "u-amara", createdAt: ts(-2) },
  { id: "t-03", applicationId: "app-1002", requirementId: "ri-bv-04", title: "Request zoning verification letter from City of Alderbrook", assigneeId: "u-amara", dueDate: dayOffset(2), status: "blocked", createdBy: "u-amara", createdAt: ts(-8) },
  { id: "t-04", applicationId: "app-1003", requirementId: "ri-ti-06", title: "Confirm whether lighting scope triggers energy compliance forms", assigneeId: "u-devin", dueDate: dayOffset(1), status: "open", createdBy: "u-devin", createdAt: ts(-4) },
  { id: "t-05", applicationId: "app-1004", title: "Confirm with client whether the sign will be illuminated", assigneeId: "u-devin", dueDate: dayOffset(7), status: "open", createdBy: "u-devin", createdAt: ts(-3) },
  { id: "t-06", permitId: "pm-03", title: "Start renewal for HC-EH-DEMO-3310 (Halcyon food permit)", assigneeId: "u-amara", dueDate: dayOffset(4), status: "open", createdBy: "system:renewal-monitor", createdAt: ts(-12) },
  { id: "t-07", applicationId: "app-1005", title: "Monitor Port Linden renewal for authority response", assigneeId: "u-amara", status: "open", createdBy: "u-amara", createdAt: ts(-3) },
];

export const extractionRuns: ExtractionRun[] = [
  {
    id: "ex-01", sourceId: "src-hc-food-2026", permitTypeId: "pt-food", createdAt: ts(-3, 14), createdBy: "u-rosa", method: "bedrock", status: "pending_review",
    items: [
      {
        id: "ex-01-i1", code: "FS-NEW", title: "Grease interceptor sizing worksheet", description: "Where the establishment discharges to the public sewer.", kind: "document", acceptedDocTypes: ["grease_interceptor_worksheet"], mandatory: false, confirmWithAuthority: true,
        provenance: { kind: "ai_suggested", sourceId: "src-hc-food-2026", sectionId: "s2", quote: "a grease interceptor sizing worksheet, where the establishment discharges to the public sewer", method: "bedrock", groundingCheck: "quote_found", createdAt: ts(-3, 14) },
      },
      {
        id: "ex-01-i2", code: "FS-NEW-2", title: "Hood and ventilation drawings", description: "Model suggested this item; it is not stated in the source text.", kind: "document", acceptedDocTypes: ["hood_drawings"], mandatory: false, confirmWithAuthority: true,
        provenance: { kind: "ai_suggested", sourceId: "src-hc-food-2026", sectionId: "s2", quote: "hood and ventilation drawings stamped by a mechanical engineer", method: "bedrock", groundingCheck: "quote_not_found", createdAt: ts(-3, 14) },
      },
    ],
  },
];

export const auditEvents: AuditEvent[] = [
  { id: "ae-01", at: ts(-49, 9), actorId: "u-rosa", action: "source.verified", entityType: "source", entityId: "src-ab-ti-2024", detail: "Confirmed current with City of Alderbrook Building Division website." },
  { id: "ae-02", at: ts(-26, 9), actorId: "u-rosa", action: "checklist.verified", entityType: "checklist", entityId: "cl-food-v3", detail: "Version 3 verified against src-hc-food-2025 §2–§4." },
  { id: "ae-03", at: ts(-21, 15), actorId: "u-amara", action: "application.submitted", entityType: "application", entityId: "app-1002", detail: "Submitted to Northmere Beverage Control Board." },
  { id: "ae-04", at: ts(-8, 11), actorId: "u-amara", action: "deadline.recorded", entityType: "application", entityId: "app-1002", detail: "Information request response date entered from Board notice." },
  { id: "ae-05", at: ts(-12, 6), actorId: "system:renewal-monitor", action: "renewal.reminder", entityType: "permit", entityId: "pm-03", detail: "30-day reminder threshold reached; task t-06 created." },
  { id: "ae-06", at: ts(-3, 9), actorId: "u-rosa", action: "source.ingested", entityType: "source", entityId: "src-hc-food-2026", detail: "Revised guide uploaded to S3 and queued for extraction. Status: pending review." },
  { id: "ae-07", at: ts(-3, 14), actorId: "system:extraction-worker", action: "extraction.completed", entityType: "extraction", entityId: "ex-01", detail: "2 candidate requirements; 1 failed grounding check." },
  { id: "ae-08", at: ts(-4, 16), actorId: "u-marcus", action: "document.uploaded", entityType: "document", entityId: "doc-05", detail: "Kitchen_equipment_quote.xlsx uploaded without a requirement link." },
];
