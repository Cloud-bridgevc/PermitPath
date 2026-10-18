import type { Metadata } from "next";
import { DemoRequestForm } from "./form";

export const metadata: Metadata = { title: "Request a demo" };

export default function RequestDemo() {
  return (
    <section className="section">
      <div className="container grid-2" style={{ gap: 64, alignItems: "start" }}>
        <div>
          <div className="eyebrow">Request a demo</div>
          <h1 style={{ fontSize: "2.4rem", letterSpacing: "-0.03em" }}>See PermitPath with your permits and locations.</h1>
          <p className="sub">In 30 minutes we’ll show how your team would approve sources, build verified checklists, collect documents and track renewals.</p>
          <ul className="checklist-ul">
            <li>A walkthrough tailored to your industry</li>
            <li>How grounding and verification keep AI output honest</li>
            <li>AWS deployment, security and data handling</li>
            <li>Pricing for your portfolio size</li>
          </ul>
        </div>
        <div className="card card-pad" style={{ padding: 28 }}>
          <DemoRequestForm />
        </div>
      </div>
    </section>
  );
}
