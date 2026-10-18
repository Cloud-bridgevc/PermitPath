"use client";

import { useMemo, useState } from "react";
import { assessCompleteness, type ItemResult } from "@/lib/engine/completeness";
import { validateDocument } from "@/lib/engine/validation";
import type { Application, Checklist, DocumentRecord, RegulatorySource } from "@/lib/types";
import { IconFile, IconShield, IconSparkle } from "@/components/icons";
import { STATE_BADGE, STATE_LABEL, StateIcon } from "@/components/state-icon";

export interface Scenario {
  id: string;
  business: string;
  permitName: string;
  authority: string;
  jurisdiction: string;
  checklist: Checklist;
  sources: RegulatorySource[];
  files: { id: string; fileName: string; docType: string; requirementId?: string; expiresOn?: string; on: boolean }[];
  /** item id → applies? (false = not applicable) */
  conditionalDefaults: Record<string, boolean>;
}

export function ChecklistDemo({ scenarios }: { scenarios: Scenario[] }) {
  const [scenarioId, setScenarioId] = useState(scenarios[0].id);
  const sc = scenarios.find((s) => s.id === scenarioId)!;
  const [filesOn, setFilesOn] = useState<Record<string, Record<string, boolean>>>(() =>
    Object.fromEntries(scenarios.map((s) => [s.id, Object.fromEntries(s.files.map((f) => [f.id, f.on]))])),
  );
  const [applies, setApplies] = useState<Record<string, Record<string, boolean | undefined>>>(() =>
    Object.fromEntries(scenarios.map((s) => [s.id, { ...s.conditionalDefaults }])),
  );
  const [stepsDone, setStepsDone] = useState<Record<string, Record<string, boolean>>>({});
  const [linked, setLinked] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | undefined>(undefined);

  const report = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const items = new Map(sc.checklist.items.map((i) => [i.id, i]));
    const docs: DocumentRecord[] = sc.files
      .filter((f) => filesOn[sc.id][f.id])
      .map((f) => {
        const reqId = f.requirementId ?? linked[f.id];
        const d: DocumentRecord = {
          id: f.id, applicationId: sc.id, fileName: f.fileName, docType: f.docType, sizeBytes: 250_000,
          mimeType: f.fileName.endsWith(".xlsx") ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf",
          s3Key: "", uploadedAt: "", uploadedBy: "demo", requirementId: reqId, linkConfirmed: Boolean(reqId), expiresOn: f.expiresOn,
          validation: { state: "pending", checks: [] },
        };
        d.validation = validateDocument(d, reqId ? items.get(reqId) : undefined, today);
        return d;
      });
    const itemStatus: Application["itemStatus"] = {};
    for (const [id, v] of Object.entries(applies[sc.id] ?? {})) if (v === false) itemStatus[id] = { state: "not_applicable", by: "demo", at: "" };
    for (const [id, v] of Object.entries(stepsDone[sc.id] ?? {})) if (v) itemStatus[id] = { state: "met", by: "demo", at: "" };
    const app = { id: sc.id, itemStatus } as Application;
    return assessCompleteness(app, sc.checklist, docs);
  }, [sc, filesOn, applies, stepsDone, linked]);

  const sel = report.results.find((r) => r.item.id === selected) ?? report.blocking[0] ?? report.results[0];
  const selSource = sel && sel.item.provenance.kind === "verified" ? sc.sources.find((s) => s.id === (sel.item.provenance as { sourceId: string }).sourceId) : undefined;
  const selSection = selSource?.sections.find((x) => x.id === (sel.item.provenance as { sectionId: string }).sectionId);

  return (
    <div className="stack">
      <div className="row" role="tablist" aria-label="Scenarios">
        {scenarios.map((s) => (
          <button key={s.id} role="tab" aria-selected={s.id === scenarioId} className={"btn btn-wrap " + (s.id === scenarioId ? "btn-navy" : "btn-outline")} onClick={() => { setScenarioId(s.id); setSelected(undefined); }}>
            {s.business} · {s.permitName}
          </button>
        ))}
      </div>

      <div className="demo-grid">
        {/* Files */}
        <div className="card">
          <div className="card-head"><h3>Collected files</h3></div>
          <div style={{ padding: "8px 0" }}>
            {sc.files.map((f) => (
              <label key={f.id} className="row" style={{ padding: "8px 16px", margin: 0, fontWeight: 500, flexWrap: "nowrap", cursor: "pointer" }}>
                <input type="checkbox" checked={filesOn[sc.id][f.id]} onChange={(e) => setFilesOn({ ...filesOn, [sc.id]: { ...filesOn[sc.id], [f.id]: e.target.checked } })} />
                <IconFile width={14} height={14} style={{ flex: "none", color: "var(--ink-3)" }} />
                <span className="small" style={{ wordBreak: "break-all", color: "var(--ink)" }}>{f.fileName}</span>
              </label>
            ))}
          </div>
          <div style={{ padding: "0 16px 16px" }} className="xs muted">Toggle files to simulate uploads. Files are linked to requirements when uploaded, except where noted.</div>
        </div>

        {/* Checklist */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3>{sc.checklist.name}</h3>
              <div className="xs muted">{sc.authority} · {sc.jurisdiction} (fictional)</div>
            </div>
            <span className="badge b-verified"><IconShield />v{sc.checklist.version} verified {sc.checklist.lastVerifiedAt}</span>
          </div>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--line-2)" }}>
            <div className="row between small"><span className="strong">{Math.round(report.progress * 100)}% complete</span><span className="muted">{report.counts.missing} missing · {report.counts.issue} need attention · {report.counts.conditional_open} undecided</span></div>
            <div className="progress" style={{ marginTop: 8 }}><span style={{ width: `${report.progress * 100}%` }} /></div>
          </div>
          {report.results.map((r) => (
            <button key={r.item.id} onClick={() => setSelected(r.item.id)} className="req" style={{ width: "100%", textAlign: "left", background: sel?.item.id === r.item.id ? "var(--teal-50)" : "#fff", border: 0, borderBottom: "1px solid var(--line-2)", cursor: "pointer", font: "inherit", color: "inherit" }}>
              <StateIcon state={r.state} />
              <div>
                <div><span className="req-code">{r.item.code}</span> <span className="req-title">{r.item.title}</span></div>
                <div className="xs muted">{r.reason}</div>
              </div>
              <span className={"badge " + STATE_BADGE[r.state]}>{STATE_LABEL[r.state]}</span>
            </button>
          ))}
        </div>

        {/* Detail */}
        <div className="stack">
          {sel && (
            <div className="card card-pad stack-sm">
              <div className="row between">
                <span className="req-code">{sel.item.code}</span>
                <span className="badge b-verified"><IconShield />Verified requirement</span>
              </div>
              <h3 style={{ margin: 0 }}>{sel.item.title}</h3>
              <p className="small muted" style={{ margin: 0 }}>{sel.item.description}</p>
              {selSource && selSection && (
                <div className="citation">
                  <div className="xs strong" style={{ marginBottom: 6, color: "var(--ink-2)" }}>{selSection.heading}</div>
                  <blockquote className="small"><Highlight text={selSection.text} quote={sel.item.provenance.kind === "verified" ? sel.item.provenance.quote : ""} /></blockquote>
                  <div className="meta">
                    <span><b>{selSource.authority}</b></span>
                    <span>{selSource.title}</span>
                    <span>Effective <b>{selSource.effectiveDate}</b></span>
                    <span>Last verified <b>{selSource.lastVerifiedAt}</b></span>
                    <span className="badge b-fictional">Fictional source</span>
                  </div>
                </div>
              )}
              {!sel.item.mandatory && sel.item.kind === "document" && (
                <div className="row small">
                  <span className="strong">Applies to this application?</span>
                  {[["Yes", true], ["No", false], ["Undecided", undefined]].map(([l, v]) => (
                    <button key={String(l)} className={"btn btn-sm " + (applies[sc.id]?.[sel.item.id] === v ? "btn-navy" : "btn-outline")} onClick={() => setApplies({ ...applies, [sc.id]: { ...applies[sc.id], [sel.item.id]: v as boolean | undefined } })}>{String(l)}</button>
                  ))}
                </div>
              )}
              {sel.item.kind !== "document" && (
                <label className="row small" style={{ margin: 0 }}>
                  <input type="checkbox" checked={Boolean(stepsDone[sc.id]?.[sel.item.id])} onChange={(e) => setStepsDone({ ...stepsDone, [sc.id]: { ...stepsDone[sc.id], [sel.item.id]: e.target.checked } })} />
                  Mark this step complete
                </label>
              )}
              {sel.item.confirmWithAuthority && <div className="callout callout-info xs">Confirm how this applies with {sc.authority}.</div>}
              {sel.documents.length > 0 && (
                <div className="stack-sm">
                  {sel.documents.map((d) => (
                    <div key={d.id} className="small">
                      <span className="file-chip"><IconFile />{d.fileName}</span>
                      {d.validation.checks.filter((c) => c.result !== "pass").map((c) => <div key={c.id} className="xs" style={{ color: c.result === "fail" ? "var(--red-700)" : "var(--amber-700)", marginTop: 4 }}>{c.detail ?? c.label}</div>)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {report.suggestions.length > 0 && (
            <div className="card card-pad stack-sm" style={{ borderColor: "var(--amber-100)" }}>
              <div className="row between"><h3 style={{ margin: 0 }}>Suggested links</h3><span className="badge b-ai"><IconSparkle />AI suggestion</span></div>
              {report.suggestions.map((s) => {
                const f = sc.files.find((x) => x.id === s.documentId)!;
                const it = sc.checklist.items.find((x) => x.id === s.requirementId)!;
                return (
                  <div key={s.documentId} className="small">
                    <div><b>{f.fileName}</b> → {it.code} {it.title}</div>
                    <div className="xs muted" style={{ margin: "4px 0 8px" }}>{s.rationale}</div>
                    <button className="btn btn-sm btn-outline" onClick={() => setLinked({ ...linked, [f.id]: it.id })}>Confirm link</button>
                  </div>
                );
              })}
              <div className="xs muted">Suggested links never count toward completeness until a person confirms them. Confirming doesn’t change the file’s type — validation still checks it.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Highlight({ text, quote }: { text: string; quote: string }) {
  const i = quote ? text.toLowerCase().indexOf(quote.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark style={{ background: "var(--teal-100)", color: "inherit", padding: "0 2px", borderRadius: 3 }}>{text.slice(i, i + quote.length)}</mark>
      {text.slice(i + quote.length)}
    </>
  );
}
