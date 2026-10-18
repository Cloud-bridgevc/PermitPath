import type { Metadata } from "next";
import { bedrockEnabled } from "@/lib/ai/client";
import { isDemoData } from "@/lib/repo";
import { IconInfo } from "@/components/icons";
import { SideNav } from "./nav";

export const metadata: Metadata = { title: { default: "Workspace", template: "%s · PermitPath" } };
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const demo = isDemoData();
  return (
    <div className="app-shell">
      <SideNav bedrock={bedrockEnabled()} database={!demo} />
      <div>
        {demo && (
          <div className="demo-banner">
            <IconInfo />
            <span>Demo workspace for <b>Meridian Permit Advisors</b> (fictional). All businesses, jurisdictions, permits and sources are invented for demonstration. Changes reset when the server restarts.</span>
          </div>
        )}
        <div className="topbar">
          <div className="small muted">Signed in as <b style={{ color: "var(--ink)" }}>Amara Okafor</b> · Lead Permit Consultant</div>
          <div className="row small">
            <span className="badge b-verified">Verified = traceable to approved source</span>
            <span className="badge b-ai">AI = suggestion, needs review</span>
          </div>
        </div>
        <div className="main">{children}</div>
      </div>
    </div>
  );
}
