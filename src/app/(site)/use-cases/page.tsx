import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Industry use cases" };

const cases = [
  {
    id: "consultants",
    eyebrow: "Permit consultants",
    title: "Run every client’s applications from one workspace.",
    body: "Keep a shared library of approved sources and verified checklists, assign tasks to consultants and clients, and send clients a single link to upload what’s missing.",
    points: [
      "Reusable, versioned checklists per jurisdiction and permit type",
      "Client upload portal with requirement-linked document requests",
      "Task assignment across consultants, with workload by assignee",
      "AI status summaries for client updates, generated from your records",
    ],
  },
  {
    id: "construction",
    eyebrow: "Construction",
    title: "Keep tenant improvement and building submittals moving.",
    body: "Track drawing sets, licenses, owner authorizations and conditional items like structural calculations across every job site.",
    points: [
      "Conditional requirements recorded as applicable or not, with who decided and why",
      "Contractor license expiration tracked against submittals",
      "Information requests logged with the date stated in the authority’s notice",
      "Site-by-site register of open applications",
    ],
  },
  {
    id: "retail",
    eyebrow: "Retail",
    title: "Standardize permits across a growing store footprint.",
    body: "See each location’s business licenses, sign permits and renewals in one register, with reminders set from the expiration dates on issued permits.",
    points: [
      "Location profiles that map each store to every jurisdiction that governs it",
      "Renewal calendar across all locations",
      "Configurable reminder thresholds per permit",
      "Roll-up view of outstanding items for operations leaders",
    ],
  },
  {
    id: "hospitality",
    eyebrow: "Hospitality",
    title: "Open on schedule with food, beverage and signage approvals in order.",
    body: "Coordinate plan review documents, beverage license disclosures and pre-opening steps, with every requirement linked to the guidance behind it.",
    points: [
      "Document validation flags expired certificates before you submit",
      "Steps such as inspections and public notices tracked alongside documents",
      "Owner and manager tasks assigned from the same checklist",
      "Grounded Q&A over the guidance your team approved",
    ],
  },
  {
    id: "enterprise",
    eyebrow: "Enterprise",
    title: "Governance and audit for regulated, multi-site operations.",
    body: "Control which sources are approved, who verifies checklists, and how AI is used — with a complete audit trail and AWS-native deployment.",
    points: [
      "Reviewer workflow for sources and checklists, with re-verification reminders",
      "Append-only audit log for every requirement, document and status change",
      "SSO, role-based access and tenant isolation",
      "Deployed in your AWS region with S3, Bedrock, PostgreSQL and Lambda",
    ],
  },
];

export default function UseCases() {
  return (
    <>
      <section className="hero" style={{ padding: "64px 0 70px" }}>
        <div className="container">
          <div className="eyebrow">Use cases</div>
          <h1>Built for the teams who carry permit risk.</h1>
          <p className="lede">Different industries face different permits. The workflow is the same: know the requirement, show the source, collect the evidence, and never miss a renewal.</p>
        </div>
      </section>
      {cases.map((c, i) => (
        <section key={c.id} id={c.id} className={"section" + (i % 2 ? " section-alt" : "")} style={{ padding: "64px 0" }}>
          <div className="container grid-2" style={{ gap: 56, alignItems: "start" }}>
            <div>
              <div className="eyebrow">{c.eyebrow}</div>
              <h2 className="display">{c.title}</h2>
              <p className="sub">{c.body}</p>
            </div>
            <ul className="checklist-ul" style={{ marginTop: 8 }}>
              {c.points.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </div>
        </section>
      ))}
      <section className="section" style={{ textAlign: "center" }}>
        <div className="container">
          <h2 className="display" style={{ margin: "0 auto 20px" }}>See it with your industry’s permits.</h2>
          <Link href="/request-demo" className="btn btn-primary btn-lg">Request a demo</Link>
        </div>
      </section>
    </>
  );
}
