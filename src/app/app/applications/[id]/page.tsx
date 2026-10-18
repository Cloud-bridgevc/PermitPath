import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepo } from "@/lib/repo";
import { applicationLabel, loadWorkspace, sourceForItem, STATUS_LABEL } from "@/lib/services";
import { daysBetween } from "@/lib/engine/renewals";
import type { ItemResult } from "@/lib/engine/completeness";
import type { ApplicationStatus } from "@/lib/types";
import { ConfirmWithAuthority, FictionalBadge, SourceCitation, VerifiedBadge } from "@/components/trust";
import { STATE_BADGE, STATE_LABEL, StateIcon } from "@/components/state-icon";
import { Days, fmtBytes, fmtDateTime, OriginBadge, PageHead, StatusBadge, TASK_LABEL } from "@/components/ui";
import { IconFile, IconLink, IconSparkle, IconUpload } from "@/components/icons";
import { addDeadline, createTask, linkDocument, setApplicationStatus, setItemStatus, uploadDocument } from "../../actions";
import { SummaryPanel } from "./summary-panel";

const DOC_TYPES = [
  "plan_review_application", "floor_plan", "equipment_schedule", "menu", "food_manager_certificate", "commissary_agreement", "water_test_report",
  "construction_drawings", "site_plan", "code_analysis", "contractor_license", "owner_authorization", "energy_compliance", "structural_calcs",
  "sign_elevation", "building_elevation", "owner_consent", "electrical_listing", "premises_diagram", "lease", "deed", "personal_history",
  "zoning_verification", "renewal_form", "ownership_update", "equipment_quote", "correspondence", "other",
];

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = await getRepo();
  const ws = await loadWorkspace(repo);
  const app = ws.maps.applications.get(id);
  if (!app) notFound();
  const report = ws.reports.get(id)!;
  const { business, location, permitType, checklist } = applicationLabel(ws, app);
  const tasks = ws.tasks.filter((t) => t.applicationId === id);
  const audit = await repo.listAudit({ entityId: id, limit: 30 });
  const docAudit = (await repo.listAudit({ limit: 300 })).filter((e) => ws.documents.some((d) => d.applicationId === id && d.id === e.entityId));
  const events = [...audit, ...docAudit].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 25);
  const jurisdiction = ws.jurisdictionName(permitType.jurisdictionId);

  return (
    <>
      <div className="xs muted" style={{ marginBottom: 6 }}><Link href="/app/applications">Applications</Link> / {app.reference}</div>
      <PageHead
        title={`${app.reference} · ${permitType.name}`}
        sub={<>{business.name} · {location.name}, {location.address} · {permitType.authority} ({jurisdiction})</>}
      >
        {permitType.fictional && <FictionalBadge />}
        <StatusBadge status={app.status} />
      </PageHead>

      <div className="split">
        <div className="stack">
          {/* ---------------------------------------------------------- completeness */}
          <div className="card">
            <div className="card-head">
              <div>
                <h3>Completeness — {checklist.name}</h3>
                <div className="xs muted">Checked against checklist v{checklist.version}, verified {checklist.lastVerifiedAt} by {ws.userName(checklist.verifiedBy)}</div>
              </div>
              <VerifiedBadge label="Verified checklist" />
            </div>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--line-2)" }}>
              <div className="row between small">
                <span className="strong">{Math.round(report.progress * 100)}% of applicable items satisfied</span>
                <span className="muted">{report.counts.satisfied} satisfied · {report.counts.missing} missing · {report.counts.issue} need attention · {report.counts.conditional_open} undecided · {report.counts.not_applicable} n/a</span>
              </div>
              <div className="progress" style={{ marginTop: 8 }}><span style={{ width: `${report.progress * 100}%` }} /></div>
            </div>
            {report.results.map((r) => <RequirementRow key={r.item.id} r={r} appId={app.id} ws={ws} />)}
          </div>

          {/* ---------------------------------------------------------- unlinked files */}
          {report.unlinkedDocuments.length > 0 && (
            <div className="card">
              <div className="card-head"><h3>Files not linked to a requirement</h3><span className="xs muted">These don’t count toward completeness</span></div>
              {report.unlinkedDocuments.map((d) => {
                const sug = report.suggestions.find((s) => s.documentId === d.id);
                const sugItem = sug ? ws.itemIndex.get(sug.requirementId) : undefined;
                return (
                  <div key={d.id} className="card-pad" style={{ borderBottom: "1px solid var(--line-2)" }}>
                    <div className="row between">
                      <span className="file-chip"><IconFile />{d.fileName}</span>
                      <span className="xs muted">{d.docType} · {fmtBytes(d.sizeBytes)} · uploaded by {ws.userName(d.uploadedBy)}</span>
                    </div>
                    {sug && sugItem && (
                      <div className="callout callout-ai" style={{ marginTop: 12 }}>
                        <IconSparkle />
                        <div style={{ flex: 1 }}>
                          <div><b>Suggestion:</b> this file may relate to <b>{sugItem.code} {sugItem.title}</b>.</div>
                          <div className="xs" style={{ margin: "4px 0 8px" }}>{sug.rationale} Linking will not change the file’s type, so validation may still flag a mismatch.</div>
                          <form action={linkDocument} className="row">
                            <input type="hidden" name="documentId" value={d.id} />
                            <input type="hidden" name="applicationId" value={app.id} />
                            <input type="hidden" name="requirementId" value={sugItem.id} />
                            <button className="btn btn-sm btn-outline"><IconLink width={14} height={14} />Confirm link to {sugItem.code}</button>
                          </form>
                        </div>
                      </div>
                    )}
                    <form action={linkDocument} className="row inline-form" style={{ marginTop: 10 }}>
                      <input type="hidden" name="documentId" value={d.id} />
                      <input type="hidden" name="applicationId" value={app.id} />
                      <select name="requirementId" defaultValue="" style={{ maxWidth: 320 }}>
                        <option value="" disabled>Link to requirement…</option>
                        {checklist.items.filter((i) => i.kind === "document").map((i) => <option key={i.id} value={i.id}>{i.code} {i.title}</option>)}
                      </select>
                      <button className="btn btn-sm btn-ghost">Link</button>
                    </form>
                  </div>
                );
              })}
            </div>
          )}

          {/* ---------------------------------------------------------- upload */}
          <div className="card">
            <div className="card-head"><h3>Upload a document</h3><span className="xs muted">Stored in Amazon S3 (SSE-KMS)</span></div>
            <form action={uploadDocument} className="card-pad">
              <input type="hidden" name="applicationId" value={app.id} />
              <div className="field"><label htmlFor="file">File</label><input id="file" name="file" type="file" required accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx" /></div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="requirementId">Requirement</label>
                  <select id="requirementId" name="requirementId" defaultValue="">
                    <option value="">Not linked yet</option>
                    {checklist.items.filter((i) => i.kind === "document").map((i) => <option key={i.id} value={i.id}>{i.code} {i.title}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="docType">Document type</label>
                  <select id="docType" name="docType" defaultValue="other">{DOC_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}</select>
                </div>
              </div>
              <div className="field" style={{ maxWidth: 260 }}>
                <label htmlFor="expiresOn">Expiration date on document <span className="muted">(if any)</span></label>
                <input id="expiresOn" name="expiresOn" type="date" />
                <div className="hint">Enter the date printed on the document. PermitPath does not infer it.</div>
              </div>
              <button className="btn btn-primary"><IconUpload width={16} height={16} />Upload</button>
            </form>
          </div>

          {/* ---------------------------------------------------------- audit */}
          <div className="card">
            <div className="card-head"><h3>Activity &amp; audit trail</h3><Link href="/app/audit" className="xs">Full log</Link></div>
            <table className="table table-compact">
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td className="xs muted" style={{ whiteSpace: "nowrap" }}>{fmtDateTime(e.at)}</td>
                    <td className="small"><b>{ws.userName(e.actorId)}</b> <span className="mono xs muted">{e.action}</span><div className="xs">{e.detail}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ============================================================ sidebar */}
        <div className="stack">
          <div className="card card-pad stack-sm small">
            <div className="row between"><span className="muted">Lead consultant</span><b>{ws.userName(app.leadConsultantId)}</b></div>
            <div className="row between"><span className="muted">Authority reference</span><span className="mono">{app.authorityReference ?? "—"}</span></div>
            <div className="row between"><span className="muted">Submitted</span><span>{app.submittedAt ?? "—"}</span></div>
            <form action={setApplicationStatus} className="row status-form" style={{ marginTop: 6 }}>
              <input type="hidden" name="applicationId" value={app.id} />
              <select name="status" defaultValue={app.status}>{(Object.keys(STATUS_LABEL) as ApplicationStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
              <button className="btn btn-sm btn-outline">Update</button>
            </form>
            {report.blocking.length > 0 && app.status !== "submitted" && (
              <div className="xs" style={{ color: "var(--red-700)" }}>{report.blocking.length} item(s) are missing or have issues.</div>
            )}
          </div>

          <SummaryPanel applicationId={app.id} />

          <div className="card">
            <div className="card-head"><h3>Recorded dates</h3></div>
            {app.deadlines.length === 0 && <div className="empty">No dates recorded.</div>}
            {app.deadlines.map((d) => (
              <div key={d.id} style={{ padding: "12px 18px", borderBottom: "1px solid var(--line-2)" }}>
                <div className="row between"><b className="small">{d.label}</b><Days n={daysBetween(ws.today, d.date)} /></div>
                <div className="row xs" style={{ marginTop: 4 }}><span>{d.date}</span><OriginBadge origin={d.origin} /></div>
                {d.note && <div className="xs muted" style={{ marginTop: 4 }}>{d.note}</div>}
              </div>
            ))}
            <details style={{ padding: "12px 18px" }}>
              <summary className="small strong" style={{ cursor: "pointer" }}>Record a date</summary>
              <form action={addDeadline} style={{ marginTop: 12 }}>
                <input type="hidden" name="applicationId" value={app.id} />
                <div className="field"><label>Label</label><input type="text" name="label" required placeholder="e.g. Response to correction notice" /></div>
                <div className="field"><label>Date</label><input type="date" name="date" required /></div>
                <div className="field">
                  <label>Where does this date come from?</label>
                  <select name="origin" defaultValue="authority_notice">
                    <option value="authority_notice">Stated in an authority notice</option>
                    <option value="user_entered">Entered by user / client</option>
                    <option value="internal_target">Internal target</option>
                  </select>
                  <div className="hint">PermitPath doesn’t calculate regulatory deadlines. Record the date exactly as the authority states it.</div>
                </div>
                <div className="field"><label>Note</label><input type="text" name="note" placeholder="e.g. Notice reference and date" /></div>
                <button className="btn btn-sm btn-primary">Save date</button>
              </form>
            </details>
          </div>

          <div className="card">
            <div className="card-head"><h3>Tasks</h3><Link href="/app/tasks" className="xs">All tasks</Link></div>
            {tasks.length === 0 && <div className="empty">No tasks.</div>}
            {tasks.map((t) => (
              <div key={t.id} style={{ padding: "12px 18px", borderBottom: "1px solid var(--line-2)" }}>
                <div className="small strong">{t.title}</div>
                <div className="row xs muted" style={{ marginTop: 4 }}>
                  <span>{ws.userName(t.assigneeId)}</span>
                  {t.dueDate && <span>due {t.dueDate}</span>}
                  <span className={"badge " + (t.status === "blocked" ? "b-red" : t.status === "done" ? "b-green" : "b-gray")}>{TASK_LABEL[t.status]}</span>
                  {t.requirementId && <span className="req-code">{ws.itemIndex.get(t.requirementId)?.code}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function RequirementRow({ r, appId, ws }: { r: ItemResult; appId: string; ws: Awaited<ReturnType<typeof loadWorkspace>> }) {
  const { source, section } = sourceForItem(ws, r.item);
  const open = r.state === "missing" || r.state === "issue";
  return (
    <div className="req" id={r.item.code}>
      <StateIcon state={r.state} />
      <div className="stack-sm" style={{ minWidth: 0 }}>
        <div>
          <span className="req-code">{r.item.code}</span> <span className="req-title">{r.item.title}</span>
          {!r.item.mandatory && <span className="badge b-gray" style={{ marginLeft: 8 }}>Conditional</span>}
          {r.item.kind !== "document" && <span className="badge b-gray" style={{ marginLeft: 8 }}>{r.item.kind === "step" ? "Step" : "Condition"}</span>}
        </div>
        <div className="small muted">{r.item.description}</div>
        <div className={"small " + (open ? "" : "muted")} style={open ? { color: r.state === "missing" ? "var(--red-700)" : "var(--amber-700)" } : undefined}>
          {r.reason}{r.decidedBy && <> — {ws.userName(r.decidedBy)}{r.note ? `: ${r.note}` : ""}</>}
        </div>
        {r.documents.length > 0 && (
          <div className="row">
            {r.documents.map((d) => <span key={d.id} className="file-chip" title={d.validation.checks.map((c) => `${c.result.toUpperCase()}: ${c.label}`).join("\n")}><IconFile />{d.fileName}{d.expiresOn ? ` · exp. ${d.expiresOn}` : ""}</span>)}
          </div>
        )}
        <details>
          <summary className="xs strong" style={{ cursor: "pointer", color: "var(--teal-700)" }}>Source requirement</summary>
          <div className="stack-sm" style={{ marginTop: 8 }}>
            {source ? (
              <SourceCitation
                source={source}
                section={section}
                quote={r.item.provenance.kind === "verified" ? r.item.provenance.quote : undefined}
                jurisdictionName={ws.jurisdictionName(source.jurisdictionId)}
                verifiedByName={r.item.provenance.kind === "verified" ? ws.userName(r.item.provenance.verifiedBy) : undefined}
              />
            ) : (
              <div className="callout callout-red">No source recorded for this item.</div>
            )}
            {r.item.confirmWithAuthority && source && <ConfirmWithAuthority authority={source.authority} />}
          </div>
        </details>
        {(r.item.kind !== "document" || !r.item.mandatory || open) && (
          <div className="row">
            {r.item.kind !== "document" && r.state !== "satisfied" && <DecisionButton appId={appId} itemId={r.item.id} decision="met" label="Mark complete" />}
            {!r.item.mandatory && r.state !== "not_applicable" && <DecisionButton appId={appId} itemId={r.item.id} decision="not_applicable" label="Doesn’t apply" withNote />}
            {(r.state === "not_applicable" || (r.item.kind !== "document" && r.state === "satisfied")) && <DecisionButton appId={appId} itemId={r.item.id} decision="clear" label="Undo" />}
            {open && (
              <details>
                <summary className="btn btn-sm btn-ghost">Assign task</summary>
                <form action={createTask} className="row inline-form" style={{ marginTop: 8 }}>
                  <input type="hidden" name="applicationId" value={appId} />
                  <input type="hidden" name="requirementId" value={r.item.id} />
                  <input type="text" name="title" defaultValue={`Collect ${r.item.code} ${r.item.title}`} style={{ width: 260 }} className="grow" />
                  <select name="assigneeId" defaultValue="u-amara" style={{ width: 160 }}>{ws.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
                  <input type="date" name="dueDate" style={{ width: 150 }} />
                  <button className="btn btn-sm btn-primary">Assign</button>
                </form>
              </details>
            )}
          </div>
        )}
      </div>
      <div><span className={"badge " + STATE_BADGE[r.state]}>{STATE_LABEL[r.state]}</span></div>
    </div>
  );
}

function DecisionButton({ appId, itemId, decision, label, withNote }: { appId: string; itemId: string; decision: string; label: string; withNote?: boolean }) {
  return (
    <form action={setItemStatus} className="row inline-form" style={{ gap: 6 }}>
      <input type="hidden" name="applicationId" value={appId} />
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="decision" value={decision} />
      {withNote && <input type="text" name="note" placeholder="Reason (recorded in audit log)" required style={{ width: 220, height: 30, padding: "4px 8px", fontSize: 13 }} />}
      <button className="btn btn-sm btn-outline">{label}</button>
    </form>
  );
}
