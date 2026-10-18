import Link from "next/link";
import { LogoMark } from "@/components/icons";
import { SiteNav } from "./site-nav";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav />
      <main>{children}</main>
      <footer className="site-footer">
        <div className="container">
          <div className="grid-4">
            <div>
              <div className="logo" style={{ color: "#fff" }}><LogoMark />PermitPath</div>
              <p style={{ marginTop: 12 }}>Permit application management and regulatory workflow for businesses and permit consultants.</p>
            </div>
            <div>
              <h4>Product</h4>
              <div className="stack-sm"><div><Link href="/#platform">Platform</Link></div><div><Link href="/demo">Checklist demo</Link></div><div><Link href="/pricing">Pricing</Link></div><div><Link href="/app">Demo workspace</Link></div></div>
            </div>
            <div>
              <h4>Industries</h4>
              <div className="stack-sm"><div><Link href="/use-cases#consultants">Permit consultants</Link></div><div><Link href="/use-cases#construction">Construction</Link></div><div><Link href="/use-cases#retail">Retail</Link></div><div><Link href="/use-cases#hospitality">Hospitality</Link></div><div><Link href="/use-cases#enterprise">Enterprise</Link></div></div>
            </div>
            <div>
              <h4>Company</h4>
              <div className="stack-sm"><div><Link href="/faq">FAQ</Link></div><div><Link href="/request-demo">Contact sales</Link></div></div>
            </div>
          </div>
          <hr style={{ borderColor: "rgba(255,255,255,.1)" }} />
          <p className="xs" style={{ maxWidth: 860 }}>
            PermitPath is a workflow tool, not a law firm or government agency, and does not provide legal advice. Requirements shown in PermitPath come from the official sources
            your team approves, with jurisdiction and verification dates displayed. Always confirm requirements with the issuing authority. All jurisdictions, businesses and
            sources on this website and in the demo workspace are fictional.
          </p>
        </div>
      </footer>
    </>
  );
}
