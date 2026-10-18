"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconBook, IconBuilding, IconCalendar, IconClipboard, IconHistory, IconHome, IconList, IconScan, IconSearch, IconUsers, LogoMark,
} from "@/components/icons";

const groups = [
  { label: "Workspace", links: [
    { href: "/app", label: "Overview", icon: <IconHome /> },
    { href: "/app/businesses", label: "Businesses & locations", icon: <IconBuilding /> },
    { href: "/app/applications", label: "Applications", icon: <IconClipboard /> },
    { href: "/app/renewals", label: "Renewal calendar", icon: <IconCalendar /> },
    { href: "/app/tasks", label: "Tasks", icon: <IconUsers /> },
  ] },
  { label: "Regulatory content", links: [
    { href: "/app/assistant", label: "Regulatory search", icon: <IconSearch /> },
    { href: "/app/checklists", label: "Checklists", icon: <IconList /> },
    { href: "/app/sources", label: "Source library", icon: <IconBook /> },
    { href: "/app/extraction", label: "Requirement extraction", icon: <IconScan /> },
    { href: "/app/audit", label: "Audit log", icon: <IconHistory /> },
  ] },
];

export function SideNav({ bedrock, database }: { bedrock: boolean; database: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]); // close the mobile menu after navigating
  return (
    <aside className={"sidebar" + (open ? " open" : "")}>
      <div className="side-top">
        <Link href="/" className="logo"><LogoMark />PermitPath</Link>
        <button className="menu-btn" aria-expanded={open} aria-controls="side-menu" aria-label="Menu" onClick={() => setOpen(!open)}>
          <span /><span /><span />
        </button>
      </div>
      <nav id="side-menu" className="side-menu">
      {groups.map((g) => (
        <div key={g.label}>
          <div className="side-group">{g.label}</div>
          {g.links.map((l) => {
            const active = l.href === "/app" ? path === "/app" : path.startsWith(l.href);
            return <Link key={l.href} href={l.href} className={"side-link" + (active ? " active" : "")}>{l.icon}{l.label}</Link>;
          })}
        </div>
      ))}
      </nav>
      <div className="side-foot">
        <div className="row" style={{ gap: 6 }}><span className="dot" style={{ background: bedrock ? "#14a9a5" : "#e0a020" }} />AI: {bedrock ? "Amazon Bedrock" : "deterministic fallback"}</div>
        <div className="row" style={{ gap: 6, marginTop: 4 }}><span className="dot" style={{ background: database ? "#14a9a5" : "#e0a020" }} />Data: {database ? "PostgreSQL" : "in-memory demo"}</div>
      </div>
    </aside>
  );
}
