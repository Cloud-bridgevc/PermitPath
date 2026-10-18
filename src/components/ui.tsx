import type { ApplicationStatus, Deadline, TaskStatus } from "@/lib/types";
import type { RenewalStatus } from "@/lib/engine/renewals";
import { STATUS_LABEL } from "@/lib/services";

const STATUS_CLASS: Record<ApplicationStatus, string> = {
  draft: "b-gray",
  collecting: "b-teal",
  internal_review: "b-navy",
  submitted: "b-green",
  information_requested: "b-amber",
  approved: "b-green",
  denied: "b-red",
  withdrawn: "b-gray",
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <span className={"badge " + STATUS_CLASS[status]}>{STATUS_LABEL[status]}</span>;
}

export function OriginBadge({ origin }: { origin: Deadline["origin"] }) {
  const map = {
    authority_notice: ["b-navy", "From authority notice"],
    user_entered: ["b-gray", "Entered by user"],
    internal_target: ["b-gray", "Internal target"],
  } as const;
  const [cls, label] = map[origin];
  return <span className={"badge " + cls} title="PermitPath never calculates regulatory timelines; this shows where the date came from">{label}</span>;
}

export function Days({ n }: { n: number }) {
  const cls = n < 0 ? "b-red" : n <= 7 ? "b-red" : n <= 30 ? "b-amber" : "b-gray";
  const label = n < 0 ? `${-n}d overdue` : n === 0 ? "today" : `in ${n}d`;
  return <span className={"badge " + cls}>{label}</span>;
}

export function RenewalBadge({ r }: { r: RenewalStatus }) {
  const map = { expired: ["b-red", "Expired"], critical: ["b-red", "Final reminder"], due: ["b-amber", "Renewal due"], upcoming: ["b-teal", "Reminder active"], ok: ["b-gray", "Monitoring"] } as const;
  const [cls, label] = map[r.urgency];
  return <span className={"badge " + cls}>{label}</span>;
}

export const TASK_LABEL: Record<TaskStatus, string> = { open: "Open", in_progress: "In progress", blocked: "Blocked", done: "Done" };

export function Kpi({ num, label, tone }: { num: React.ReactNode; label: string; tone?: "red" | "amber" | "teal" }) {
  const color = tone === "red" ? "var(--red-700)" : tone === "amber" ? "var(--amber-700)" : tone === "teal" ? "var(--teal-700)" : undefined;
  return (
    <div className="card kpi">
      <div className="num" style={color ? { color } : undefined}>{num}</div>
      <div className="lbl">{label}</div>
    </div>
  );
}

export function PageHead({ title, sub, children }: { title: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="row">{children}</div>}
    </div>
  );
}

export function fmtBytes(n: number) {
  return n > 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.round(n / 1000)} KB`;
}

export function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" }) + " UTC";
}
