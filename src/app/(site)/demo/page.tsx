import type { Metadata } from "next";
import * as seed from "@/lib/demo/seed";
import { ChecklistDemo, type Scenario } from "./checklist-demo";

export const metadata: Metadata = { title: "Interactive checklist demo" };

function scenario(appId: string, files: Scenario["files"]): Scenario {
  const app = seed.applications.find((a) => a.id === appId)!;
  const checklist = seed.checklists.find((c) => c.id === app.checklistId)!;
  const permitType = seed.permitTypes.find((p) => p.id === app.permitTypeId)!;
  const sourceIds = new Set(checklist.items.map((i) => (i.provenance.kind === "verified" ? i.provenance.sourceId : "")));
  return {
    id: appId,
    business: seed.businesses.find((b) => b.id === app.businessId)!.name,
    permitName: permitType.name,
    authority: permitType.authority,
    jurisdiction: seed.jurisdictions.find((j) => j.id === permitType.jurisdictionId)!.name,
    checklist,
    sources: seed.sources.filter((s) => sourceIds.has(s.id)),
    files,
    conditionalDefaults: Object.fromEntries(Object.entries(app.itemStatus).filter(([, v]) => v.state === "not_applicable").map(([k]) => [k, false])),
  };
}

const d = (n: number) => seed.dayOffset(n);

const scenarios: Scenario[] = [
  scenario("app-1001", [
    { id: "f1", fileName: "Juniper_PlanReviewApp_signed.pdf", docType: "plan_review_application", requirementId: "ri-fs-01", on: true },
    { id: "f2", fileName: "Riverside_FloorPlan_rev3.pdf", docType: "floor_plan", requirementId: "ri-fs-02", on: true },
    { id: "f3", fileName: "Kitchen_equipment_quote.xlsx", docType: "equipment_quote", on: true },
    { id: "f4", fileName: "Equipment_Schedule_MakeModel.pdf", docType: "equipment_schedule", requirementId: "ri-fs-03", on: false },
    { id: "f5", fileName: "Menu_Draft_Sept.pdf", docType: "menu", requirementId: "ri-fs-04", on: true },
    { id: "f6", fileName: "FPM_Certificate_DLeung.pdf", docType: "food_manager_certificate", requirementId: "ri-fs-05", expiresOn: d(-12), on: true },
    { id: "f7", fileName: "FPM_Certificate_MBell_2026.pdf", docType: "food_manager_certificate", requirementId: "ri-fs-05", expiresOn: d(1400), on: false },
  ]),
  scenario("app-1003", [
    { id: "g1", fileName: "QuarryRow_ConstructionSet_A.pdf", docType: "construction_drawings", requirementId: "ri-ti-01", on: true },
    { id: "g2", fileName: "QuarryRow_SitePlan.pdf", docType: "site_plan", requirementId: "ri-ti-02", on: true },
    { id: "g3", fileName: "QuarryRow_CodeAnalysis.pdf", docType: "code_analysis", requirementId: "ri-ti-03", on: true },
    { id: "g4", fileName: "Brightline_StateLicense.pdf", docType: "contractor_license", requirementId: "ri-ti-04", expiresOn: d(212), on: true },
    { id: "g5", fileName: "Owner_Authorization_QuarryRow.pdf", docType: "owner_authorization", requirementId: "ri-ti-05", on: true },
    { id: "g6", fileName: "Lighting_Energy_Compliance.pdf", docType: "energy_compliance", requirementId: "ri-ti-06", on: false },
  ]),
  scenario("app-1002", [
    { id: "h1", fileName: "Riverside_Premises_Diagram.pdf", docType: "premises_diagram", requirementId: "ri-bv-01", on: true },
    { id: "h2", fileName: "Riverside_Lease_Executed.pdf", docType: "lease", requirementId: "ri-bv-02", on: true },
    { id: "h3", fileName: "PHD_MarcusBell.pdf", docType: "personal_history", requirementId: "ri-bv-03", on: true },
    { id: "h4", fileName: "Zoning_Verification_88FerryLane.pdf", docType: "zoning_verification", requirementId: "ri-bv-04", on: false },
  ]),
];

export default function DemoPage() {
  return (
    <>
      <section className="section" style={{ paddingBottom: 24 }}>
        <div className="container">
          <div className="eyebrow">Interactive demo</div>
          <h1 style={{ fontSize: "2.3rem", letterSpacing: "-0.03em" }}>Watch missing documents surface — with the requirement behind each one.</h1>
          <p className="sub">
            Pick a scenario, toggle which files have been collected, and see the completeness check update. Click any item to see the exact source text it comes from.
          </p>
          <div className="callout callout-info" style={{ maxWidth: 820 }}>
            <span>ⓘ</span>
            <div>All businesses, jurisdictions, authorities and sources in this demo are <b>fictional</b>. They illustrate how PermitPath works and do not describe any real permit requirement.</div>
          </div>
        </div>
      </section>
      <section style={{ paddingBottom: 80 }}>
        <div className="container">
          <ChecklistDemo scenarios={scenarios} />
        </div>
      </section>
    </>
  );
}
