import { NextResponse } from "next/server";
import { z } from "zod";
import { getRepo } from "@/lib/repo";
import { syncDemoRequest } from "@/lib/hubspot";

const Body = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  company: z.string().trim().min(2).max(160),
  segment: z.enum(["consulting", "construction", "retail", "hospitality", "enterprise"]),
  locations: z.enum(["1", "2-10", "11-50", "51-200", "200+"]),
  message: z.string().trim().max(2000).optional(),
  website: z.string().max(0).optional(), // honeypot
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })) }, { status: 400 });
  }
  const { website: _hp, ...data } = parsed.data;
  const base = { id: `dr-${crypto.randomUUID().slice(0, 8)}`, at: new Date().toISOString(), ...data };
  const hubspot = await syncDemoRequest(base);
  const repo = await getRepo();
  await repo.addDemoRequest({ ...base, hubspot });
  return NextResponse.json({ ok: true, id: base.id, hubspotSynced: hubspot.synced });
}
