import type { Metadata } from "next";

export const metadata: Metadata = { title: "FAQ" };

const faqs: [string, string][] = [
  ["Does PermitPath tell me which permits my business needs?", "No. PermitPath manages the permits and requirements your team identifies from official sources. It can help you search the sources you’ve approved, but determining which permits apply is for you, your consultant and the issuing authority."],
  ["Where do requirements come from?", "From official sources your team adds to the knowledge base — guidance documents, application forms, checklists and ordinances. Each source records its issuing authority, jurisdiction, effective date, and the date and person that last verified it is current."],
  ["How do you prevent the AI from inventing requirements?", "Three ways. The model only sees passages from approved sources and is instructed not to use outside knowledge. Every requirement or answer it produces must include a verbatim quote, and PermitPath checks that the quote actually appears in the cited section — anything that fails is flagged and dropped. And AI output is always a suggestion: a named reviewer must verify it before it can appear in a live checklist."],
  ["How can I tell verified information from AI suggestions?", "Verified requirements carry a teal ‘Verified source’ badge with the source quote, jurisdiction, effective date and last-verified date. AI output carries an amber ‘AI suggestion’ badge and a notice that it needs review. The two never share a style."],
  ["Does PermitPath show permit fees or approval timelines?", "No. Fees and processing times change often and vary by case, so PermitPath does not state or estimate them. Dates in PermitPath come from authority notices, your own entries, or internal targets — and each is labelled with its origin."],
  ["How do renewal reminders work?", "When a permit is issued, you record its permit number and the expiration date printed on it, then choose reminder thresholds (for example 90, 60 and 30 days). A scheduled job creates reminders and renewal tasks when each threshold is reached."],
  ["What happens when a source changes?", "Add the revised source as a new version. It stays in ‘pending review’ — invisible to search and completeness checks — until a reviewer approves it. Extraction can highlight what changed, and you publish a new checklist version when ready."],
  ["Where is our data stored?", "On AWS: supporting documents in Amazon S3 with KMS encryption and versioning, application data in PostgreSQL, and AI processing in Amazon Bedrock in your selected region. Enterprise plans can run in a dedicated account."],
  ["Is my data used to train models?", "No. Amazon Bedrock does not use your prompts or outputs to train models, and PermitPath does not use customer documents for training."],
  ["Is the demo data real?", "No. Every jurisdiction, authority, business and source in the demo is fictional and labelled as such. Source links use the reserved .example domain."],
  ["Does PermitPath integrate with our CRM?", "Yes. Demo requests and customer accounts sync to HubSpot, and consultancies can sync client companies and application milestones to HubSpot deals."],
];

export default function Faq() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <div className="eyebrow">FAQ</div>
        <h1 style={{ fontSize: "2.4rem", letterSpacing: "-0.03em" }}>Questions, answered.</h1>
        <div style={{ marginTop: 28 }}>
          {faqs.map(([q, a]) => (
            <details key={q} className="faq">
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
