import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pricing" };

const tiers = [
  {
    name: "Team",
    price: "$390",
    unit: "per month, billed annually",
    for: "Single businesses and small consultancies",
    features: ["Up to 10 locations", "5 internal users, unlimited client uploaders", "Verified checklists and completeness checks", "Renewal calendar and reminders", "Regulatory search over your approved sources", "Email support"],
    cta: "Request a demo",
  },
  {
    name: "Professional",
    price: "$1,150",
    unit: "per month, billed annually",
    for: "Permit consultancies and multi-site operators",
    featured: true,
    features: ["Up to 75 locations", "25 internal users", "AI requirement extraction with reviewer workflow", "Consultant task assignment and workload views", "AI application summaries", "HubSpot integration", "Priority support"],
    cta: "Request a demo",
  },
  {
    name: "Enterprise",
    price: "Custom",
    unit: "annual agreement",
    for: "Regulated enterprises and large portfolios",
    features: ["Unlimited locations and users", "SSO / SAML and SCIM", "Dedicated AWS deployment in your region", "Custom source approval policies", "Audit exports and data residency", "Named customer success manager"],
    cta: "Talk to sales",
  },
];

export default function Pricing() {
  return (
    <>
      <section className="section" style={{ paddingBottom: 40 }}>
        <div className="container" style={{ textAlign: "center" }}>
          <div className="eyebrow">Pricing</div>
          <h1 style={{ fontSize: "2.6rem", letterSpacing: "-0.03em" }}>Priced by the portfolio you manage.</h1>
          <p className="sub" style={{ margin: "0 auto" }}>Every plan includes the source-of-truth controls: approved sources, verification dates, provenance labels and the audit log.</p>
        </div>
      </section>
      <section style={{ paddingBottom: 80 }}>
        <div className="container grid-3">
          {tiers.map((t) => (
            <div key={t.name} className={"price-card" + (t.featured ? " featured" : "")}>
              <div className="row between">
                <h3 style={{ margin: 0 }}>{t.name}</h3>
                {t.featured && <span className="badge b-teal">Most popular</span>}
              </div>
              <p className="muted small" style={{ marginTop: 6 }}>{t.for}</p>
              <div className="price">{t.price}</div>
              <div className="muted xs">{t.unit}</div>
              <ul className="checklist-ul">{t.features.map((f) => <li key={f}>{f}</li>)}</ul>
              <Link href="/request-demo" className={"btn " + (t.featured ? "btn-primary" : "btn-outline")} style={{ marginTop: "auto" }}>{t.cta}</Link>
            </div>
          ))}
        </div>
        <div className="container" style={{ marginTop: 28 }}>
          <p className="xs muted" style={{ textAlign: "center" }}>
            Prices are for the PermitPath software only and exclude any fees charged by permitting authorities, which PermitPath does not calculate or display. Amazon Bedrock
            usage for AI features is included up to plan limits.
          </p>
        </div>
      </section>
    </>
  );
}
