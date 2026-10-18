// HubSpot CRM sync for website demo requests. See docs/HUBSPOT.md for the full plan
// (properties, pipelines, workflows per segment).
//
// Without HUBSPOT_PRIVATE_APP_TOKEN nothing is sent anywhere; the request is stored
// locally and marked unsynced.

import type { DemoRequest, Industry } from "./types.ts";

const API = "https://api.hubapi.com";

/** Segment → HubSpot routing. Owners/pipelines are configured per portal. */
export const SEGMENT_ROUTING: Record<Industry, { pipelineStage: string; persona: string; workflow: string }> = {
  consulting: { pipelineStage: "appointmentscheduled", persona: "permit_consultant", workflow: "WF-01 Consultant partner nurture" },
  construction: { pipelineStage: "appointmentscheduled", persona: "construction_ops", workflow: "WF-02 Construction submittal nurture" },
  retail: { pipelineStage: "appointmentscheduled", persona: "retail_multisite", workflow: "WF-03 Retail renewals nurture" },
  hospitality: { pipelineStage: "appointmentscheduled", persona: "hospitality_operator", workflow: "WF-04 Hospitality opening nurture" },
  enterprise: { pipelineStage: "qualifiedtobuy", persona: "enterprise_compliance", workflow: "WF-05 Enterprise sales assist" },
};

export function hubspotEnabled() {
  return Boolean(process.env.HUBSPOT_PRIVATE_APP_TOKEN);
}

async function hs(path: string, body: unknown, method = "POST") {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${process.env.HUBSPOT_PRIVATE_APP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HubSpot ${path} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<{ id: string }>;
}

export async function syncDemoRequest(req: Omit<DemoRequest, "hubspot">): Promise<DemoRequest["hubspot"]> {
  if (!hubspotEnabled()) return { synced: false, detail: "HubSpot not configured; stored locally only." };
  const route = SEGMENT_ROUTING[req.segment];
  const [first, ...rest] = req.name.trim().split(/\s+/);
  try {
    // Upsert contact by email (idProperty=email makes this idempotent on resubmission).
    const contact = await hs(`/crm/v3/objects/contacts/${encodeURIComponent(req.email)}?idProperty=email`, {
      properties: {
        email: req.email, firstname: first, lastname: rest.join(" "), company: req.company,
        lifecyclestage: "marketingqualifiedlead", hs_persona: route.persona,
        permitpath_segment: req.segment, permitpath_location_count: req.locations, permitpath_demo_message: req.message ?? "",
      },
    }, "PATCH").catch(() =>
      hs("/crm/v3/objects/contacts", {
        properties: { email: req.email, firstname: first, lastname: rest.join(" "), company: req.company, lifecyclestage: "marketingqualifiedlead", permitpath_segment: req.segment, permitpath_location_count: req.locations },
      }),
    );
    const deal = await hs("/crm/v3/objects/deals", {
      properties: { dealname: `${req.company} — PermitPath demo`, pipeline: "default", dealstage: route.pipelineStage, permitpath_segment: req.segment },
      associations: [{ to: { id: contact.id }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 }] }],
    });
    return { synced: true, detail: `Contact ${contact.id}, deal ${deal.id}; enrolled via ${route.workflow}.` };
  } catch (e) {
    return { synced: false, detail: `HubSpot sync failed: ${(e as Error).message}` };
  }
}
