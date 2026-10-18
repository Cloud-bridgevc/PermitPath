"use client";

import { useState } from "react";
import type { AssistantAnswer } from "@/lib/ai/assistant";
import { IconExternal, IconSearch, IconSparkle } from "@/components/icons";

const EXAMPLES = [
  "What documents are required for a food service plan review?",
  "Does a beverage license application need a zoning verification letter?",
  "When are structural calculations required for a tenant improvement?",
  "What is the fee for a sign permit?",
];

type Answer = Omit<AssistantAnswer, "passages"> & { passages: { passageId: string; score: number }[] };

export function AssistantClient({ jurisdictions }: { jurisdictions: { id: string; name: string; fictional: boolean }[] }) {
  const [q, setQ] = useState("");
  const [jur, setJur] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [asked, setAsked] = useState("");

  async function ask(question: string) {
    if (!question.trim()) return;
    setLoading(true);
    setAsked(question);
    const res = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, jurisdictionIds: jur ? [jur] : undefined }) });
    setAnswer(res.ok ? await res.json() : null);
    setLoading(false);
  }

  return (
    <div className="stack" style={{ maxWidth: 920 }}>
      <form className="card card-pad" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
        <div className="search-row">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about requirements in your approved sources…" aria-label="Question" style={{ height: 42 }} />
          <select value={jur} onChange={(e) => setJur(e.target.value)} style={{ height: 42 }} aria-label="Jurisdiction">
            <option value="">All jurisdictions</option>
            {jurisdictions.map((j) => <option key={j.id} value={j.id}>{j.name}{j.fictional ? " (fictional)" : ""}</option>)}
          </select>
          <button className="btn btn-primary" style={{ height: 42 }} disabled={loading}><IconSearch width={16} height={16} />{loading ? "Searching…" : "Ask"}</button>
        </div>
        <div className="row xs" style={{ marginTop: 12 }}>
          <span className="muted">Try:</span>
          {EXAMPLES.map((e) => <button type="button" key={e} className="btn btn-sm btn-ghost btn-wrap" style={{ minHeight: 30 }} onClick={() => { setQ(e); ask(e); }}>{e}</button>)}
        </div>
        <div className="hint" style={{ marginTop: 8 }}>A jurisdiction filter includes parent jurisdictions (city → county → state).</div>
      </form>

      {answer && (
        <div className="card">
          <div className="card-head">
            <div className="small"><span className="muted">Question:</span> <b>{asked}</b></div>
            <span className="badge b-ai"><IconSparkle />{answer.method === "bedrock" ? "AI answer · Claude on Bedrock" : "Extractive answer · source text only"}</span>
          </div>
          <div className="card-pad stack">
            {answer.scopeNotice && <div className="callout callout-info small"><div>{answer.scopeNotice}</div></div>}
            {answer.status === "no_approved_source" ? (
              <div className="callout callout-info">
                <div>
                  <div className="strong">No approved source in your knowledge base covers this question.</div>
                  <div>PermitPath won’t answer from general knowledge. Contact the issuing authority directly, or add and approve an official source that addresses it.</div>
                </div>
              </div>
            ) : (
              <>
                {answer.claims.map((c, i) => (
                  <div key={i} className="stack-sm">
                    <div className="small strong">{c.text}</div>
                    {c.citations.map((ct, j) => (
                      <div key={j} className="citation">
                        <blockquote className="small">“{ct.quote}”</blockquote>
                        <div className="meta">
                          <span><b>{ct.authority}</b></span>
                          <span>{ct.sourceTitle} · {ct.sectionHeading}</span>
                          <span>Jurisdiction: <b>{jurisdictions.find((x) => x.id === ct.jurisdictionId)?.name ?? ct.jurisdictionId}</b></span>
                          <span>Effective <b>{ct.effectiveDate}</b></span>
                          <span>Last verified <b>{ct.lastVerifiedAt}</b></span>
                          <a href={ct.url} target="_blank" rel="noreferrer" className="row" style={{ gap: 4 }}>Official source <IconExternal width={12} height={12} /></a>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                {answer.droppedClaims > 0 && <div className="xs muted">{answer.droppedClaims} statement(s) were removed because their quotes could not be found in the cited source.</div>}
              </>
            )}
            <div className="callout callout-ai xs"><IconSparkle /><div>{answer.disclaimer}</div></div>
          </div>
        </div>
      )}
    </div>
  );
}
