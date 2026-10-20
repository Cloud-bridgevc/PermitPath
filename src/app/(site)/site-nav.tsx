"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/icons";

const links = [
  { href: "/#platform", label: "Platform" },
  { href: "/use-cases", label: "Use cases" },
  { href: "/demo", label: "Checklist demo" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/#team", label: "Team" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  return (
    <header className={"site-header" + (open ? " open" : "")}>
      <div className="container nav">
        <Link href="/" className="logo"><LogoMark />PermitPath</Link>
        <nav className="nav-links">{links.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}</nav>
        <div className="row nav-actions">
          <Link href="/app" className="btn btn-ghost">Open demo workspace</Link>
          <Link href="/request-demo" className="btn btn-primary">Request a demo</Link>
          <button className="menu-btn menu-btn-light" aria-expanded={open} aria-controls="site-menu" aria-label="Menu" onClick={() => setOpen(!open)}>
            <span /><span /><span />
          </button>
        </div>
      </div>
      <nav id="site-menu" className="site-menu">
        {links.map((l) => <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</Link>)}
        <Link href="/app" onClick={() => setOpen(false)}>Open demo workspace</Link>
      </nav>
    </header>
  );
}
