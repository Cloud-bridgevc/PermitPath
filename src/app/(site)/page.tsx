import Link from "next/link";
import {
  IconArrow, IconBell, IconCheck, IconClipboard, IconFile, IconLayers, IconScan, IconSearch, IconShield, IconSparkle, IconX, IconAlert,
} from "@/components/icons";

const features = [
  { icon: <IconScan />, title: "Requirement extraction", body: "Upload official guidance and get candidate checklist items, each with a verbatim quote and section reference. A reviewer verifies before anything reaches a live checklist." },
  { icon: <IconClipboard />, title: "Completeness assistant", body: "Compare collected documents to a verified, jurisdiction-specific checklist. Every missing item links back to the requirement and the source text behind it." },
  { icon: <IconSearch />, title: "Regulatory document search", body: "Ask questions across your approved knowledge base. Answers cite the source, section, effective date and last-verified date — or say no approved source covers it." },
  { icon: <IconLayers />, title: "Tracking intelligence", body: "Summaries of outstanding requirements, recorded deadlines and open tasks across every application, generated from your own records." },
  { icon: <IconBell />, title: "Renewal monitoring", body: "Reminders driven by the expiration dates on issued permits and the thresholds you configure. No estimated windows, no guessed timelines." },
  { icon: <IconShield />, title: "Source and audit records", body: "Every requirement, link, status change and AI output is attributed and timestamped, so you can show exactly why a checklist says what it says." },
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <div className="eyebrow"><IconShield width={14} height={14} /> Regulatory workflow, grounded in the source</div>
            <h1>Every permit requirement, traced to the official source.</h1>
            <p className="lede">
              PermitPath organizes application requirements, documents, submissions and renewals across all your locations — with AI that shows its sources
              and never invents a rule.
            </p>
            <div className="row" style={{ marginTop: 28, gap: 12 }}>
              <Link href="/request-demo" className="btn btn-primary btn-lg">Request a demo <IconArrow width={16} height={16} /></Link>
              <Link href="/demo" className="btn btn-on-dark btn-lg">Try the checklist demo</Link>
            </div>
            <p className="xs" style={{ color: "#8ea3c0", marginTop: 22 }}>For permit consultants, construction firms, retailers, hospitality operators and multi-site enterprises.</p>
          </div>
          <HeroPanel />
        </div>
      </section>

      <section className="section" id="platform">
        <div className="container">
          <div className="eyebrow">The platform</div>
          <h2 className="display">One system of record for permits, from first requirement to renewal.</h2>
          <p className="sub">Business and location profiles, a permit register, verified checklists, document validation, status tracking, a renewal calendar and consultant task assignment — in one workspace.</p>
          <div className="grid-3" style={{ marginTop: 36 }}>
            {features.map((f) => (
              <div className="feature" key={f.title}>
                <div className="icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container grid-2" style={{ alignItems: "center", gap: 56 }}>
          <div>
            <div className="eyebrow">Accuracy by design</div>
            <h2 className="display">Verified information and AI suggestions never look the same.</h2>
            <p className="sub">
              Regulatory teams can’t afford a confident guess. PermitPath separates what an official source says from what a model suggests, at every step.
            </p>
            <ul className="checklist-ul">
              <li>Only sources your team approves enter the knowledge base, each with its jurisdiction, effective date and last-verified date.</li>
              <li>AI-extracted requirements must quote the source verbatim. Quotes that can’t be found in the document are flagged and blocked.</li>
              <li>Completeness checks run against verified checklists only — never against model output.</li>
              <li>PermitPath does not state fees or approval timelines. Dates come from authority notices or your own entries, and are labelled that way.</li>
              <li>Where the source leaves room for interpretation, users are prompted to confirm with the authority.</li>
            </ul>
          </div>
          <div className="stack">
            <div className="card card-pad">
              <div className="row between" style={{ marginBottom: 10 }}>
                <span className="req-code">FS-03 · Equipment schedule</span>
                <span className="badge b-verified"><IconShield />Verified source</span>
              </div>
              <div className="citation">
                <blockquote>“an equipment schedule listing the make and model of each piece of food equipment”</blockquote>
                <div className="meta"><span><b>Harrow County Environmental Health Division</b></span><span>Effective <b>2025-03-01</b></span><span>Last verified <b>26 days ago</b></span></div>
              </div>
            </div>
            <div className="card card-pad">
              <div className="row between" style={{ marginBottom: 10 }}>
                <span className="req-code">Suggested link</span>
                <span className="badge b-ai"><IconSparkle />AI suggestion</span>
              </div>
              <p className="small" style={{ margin: 0 }}>
                <b>Kitchen_equipment_quote.xlsx</b> may relate to FS-03. Confirm the file lists make and model for each item before linking — it won’t count toward completeness until you do.
              </p>
            </div>
            <p className="xs muted">Examples use a fictional jurisdiction.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="eyebrow">How it works</div>
          <h2 className="display">From guidance document to submission-ready.</h2>
          <div className="grid-4" style={{ marginTop: 32 }}>
            {[
              ["1", "Approve sources", "Add official guidance, forms and ordinances. Record the authority, jurisdiction, effective date and who verified it."],
              ["2", "Build checklists", "Extract candidate requirements with AI, then verify each against the source quote and publish a versioned checklist."],
              ["3", "Collect documents", "Clients and consultants upload files linked to requirements. Validation flags expired, mistyped or unlinked files."],
              ["4", "Track to renewal", "Status, recorded deadlines, tasks and renewal reminders across every location, with a full audit trail."],
            ].map(([n, t, b]) => (
              <div key={n}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--navy-900)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, marginBottom: 14 }}>{n}</div>
                <h3>{t}</h3>
                <p className="muted small">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-navy">
        <div className="container grid-2" style={{ gap: 56 }}>
          <div>
            <div className="eyebrow">Built on AWS</div>
            <h2 className="display" style={{ color: "#fff" }}>Enterprise infrastructure, private by default.</h2>
            <p style={{ color: "#b9c8dc" }}>
              Supporting documents are stored in Amazon S3 with encryption and versioning. Requirement extraction and grounded answers run on Amazon Bedrock inside your AWS
              region. Applications and checklists live in PostgreSQL, and scheduled AWS Lambda jobs handle reminders and background processing.
            </p>
          </div>
          <div className="grid-2">
            {[
              ["Amazon S3", "Documents and source files, SSE-KMS, versioned"],
              ["Amazon Bedrock", "Extraction and grounded assistance"],
              ["PostgreSQL", "Applications, checklists, audit log"],
              ["AWS Lambda", "Scheduled reminders and background jobs"],
            ].map(([t, b]) => (
              <div key={t} style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, padding: 18 }}>
                <div className="strong" style={{ color: "#fff" }}>{t}</div>
                <div className="small" style={{ color: "#9fb2cc" }}>{b}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ textAlign: "center" }}>
          <h2 className="display" style={{ margin: "0 auto 12px" }}>See your own permits in PermitPath.</h2>
          <p className="sub" style={{ margin: "0 auto 28px" }}>We’ll walk through a workspace configured for your industry and locations.</p>
          <div className="row" style={{ justifyContent: "center", gap: 12 }}>
            <Link href="/request-demo" className="btn btn-primary btn-lg">Request a demo</Link>
            <Link href="/app" className="btn btn-outline btn-lg">Explore the demo workspace</Link>
          </div>
        </div>
      </section>
    </>
  );
}

function HeroPanel() {
  const rows: [string, string, "ok" | "miss" | "issue"][] = [
    ["FS-01", "Plan Review Application form", "ok"],
    ["FS-02", "Scaled floor plan", "ok"],
    ["FS-03", "Equipment schedule", "miss"],
    ["FS-04", "Proposed menu", "ok"],
    ["FS-05", "Food protection manager certificate", "issue"],
  ];
  return (
    <div className="hero-panel">
      <div className="card-head" style={{ background: "var(--bg-2)" }}>
        <div>
          <div className="strong small">PP-1001 · Food Service Plan Review</div>
          <div className="xs muted">Juniper &amp; Salt Kitchen · Riverside · Harrow County (fictional)</div>
        </div>
        <span className="badge b-verified"><IconShield />Checklist v3 verified</span>
      </div>
      <div style={{ padding: "6px 0" }}>
        {rows.map(([code, title, st]) => (
          <div key={code} className="row" style={{ padding: "10px 18px", borderBottom: "1px solid var(--line-2)", flexWrap: "nowrap" }}>
            <span className={"req-icon " + (st === "ok" ? "st-satisfied" : st === "miss" ? "st-missing" : "st-issue")}>
              {st === "ok" ? <IconCheck /> : st === "miss" ? <IconX /> : <IconAlert />}
            </span>
            <span className="req-code">{code}</span>
            <span className="small" style={{ flex: 1 }}>{title}</span>
            {st === "ok" && <span className="file-chip"><IconFile />linked</span>}
            {st === "miss" && <span className="badge b-red">Missing</span>}
            {st === "issue" && <span className="badge b-amber">Expired</span>}
          </div>
        ))}
      </div>
      <div style={{ padding: 16 }}>
        <div className="citation">
          <blockquote>“a copy of a current food protection manager certificate for at least one person in charge”</blockquote>
          <div className="meta"><span><b>Source §2</b></span><span>Effective 2025-03-01</span><span>Verified by R. Lindqvist</span></div>
        </div>
      </div>
    </div>
  );
}
