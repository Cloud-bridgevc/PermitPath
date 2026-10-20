import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24" };

export const IconShield = (p: P) => (<svg {...base} {...p}><path d="M12 3l7 3v6c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>);
export const IconSparkle = (p: P) => (<svg {...base} {...p}><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" /></svg>);
export const IconCheck = (p: P) => (<svg {...base} strokeWidth={2.4} {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>);
export const IconX = (p: P) => (<svg {...base} strokeWidth={2.4} {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>);
export const IconAlert = (p: P) => (<svg {...base} strokeWidth={2.2} {...p}><path d="M12 8v5M12 16.5v.5" /></svg>);
export const IconMinus = (p: P) => (<svg {...base} strokeWidth={2.4} {...p}><path d="M7 12h10" /></svg>);
export const IconQuestion = (p: P) => (<svg {...base} strokeWidth={2.2} {...p}><path d="M9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1-1.5 2M12 16.5v.5" /></svg>);
export const IconFile = (p: P) => (<svg {...base} {...p}><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" /><path d="M14 3v5h5" /></svg>);
export const IconHome = (p: P) => (<svg {...base} {...p}><path d="M4 11l8-7 8 7v8a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1v-8z" /></svg>);
export const IconBuilding = (p: P) => (<svg {...base} {...p}><path d="M4 21V5a1 1 0 011-1h9a1 1 0 011 1v16M15 9h4a1 1 0 011 1v11M3 21h18M8 8h3M8 12h3M8 16h3" /></svg>);
export const IconClipboard = (p: P) => (<svg {...base} {...p}><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4h6v3H9zM9 12h6M9 16h4" /></svg>);
export const IconList = (p: P) => (<svg {...base} {...p}><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" /></svg>);
export const IconCalendar = (p: P) => (<svg {...base} {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>);
export const IconUsers = (p: P) => (<svg {...base} {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.8a3.5 3.5 0 010 6.4M18.5 14.8c1.6.8 2.6 2.6 3 5.2" /></svg>);
export const IconSearch = (p: P) => (<svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>);
export const IconBook = (p: P) => (<svg {...base} {...p}><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5z" /><path d="M4 19a2 2 0 012-2h13v4H6a2 2 0 01-2-2z" /></svg>);
export const IconHistory = (p: P) => (<svg {...base} {...p}><path d="M3 12a9 9 0 103-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></svg>);
export const IconScan = (p: P) => (<svg {...base} {...p}><path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3M7 12h10" /></svg>);
export const IconUpload = (p: P) => (<svg {...base} {...p}><path d="M12 16V4M7 9l5-5 5 5M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" /></svg>);
export const IconLink = (p: P) => (<svg {...base} {...p}><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" /></svg>);
export const IconExternal = (p: P) => (<svg {...base} {...p}><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" /></svg>);
export const IconArrow = (p: P) => (<svg {...base} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>);
export const IconBell = (p: P) => (<svg {...base} {...p}><path d="M6 16V11a6 6 0 1112 0v5l2 2H4l2-2zM10 20a2 2 0 004 0" /></svg>);
export const IconInfo = (p: P) => (<svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></svg>);
export const IconLayers = (p: P) => (<svg {...base} {...p}><path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5" /></svg>);

export function LogoMark(p: P) {
  return (
    <svg viewBox="0 0 32 32" {...p} className={"logo-mark " + (p.className ?? "")}>
      <rect width="32" height="32" rx="8" fill="#0e918e" />
      <path d="M9 23V9h7.5a4.5 4.5 0 010 9H13" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="22.5" cy="22.5" r="2.5" fill="#e0a020" />
    </svg>
  );
}

export const IconLinkedIn = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 110-4.13 2.06 2.06 0 010 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
  </svg>
);
