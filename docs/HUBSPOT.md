# HubSpot CRM plan

PermitPath uses HubSpot for marketing and sales. Product data stays in PostgreSQL; HubSpot receives contact, company and deal data, plus a few product-usage signals. Implementation: [`src/lib/hubspot.ts`](../src/lib/hubspot.ts) (demo-request sync via a private-app token; nothing is sent when `HUBSPOT_PRIVATE_APP_TOKEN` is unset).

## Custom properties

| Object | Property (internal name) | Type | Source |
| --- | --- | --- | --- |
| Contact, Company, Deal | `permitpath_segment` | Dropdown: consulting, construction, retail, hospitality, enterprise | Demo form |
| Contact | `permitpath_location_count` | Dropdown: 1, 2-10, 11-50, 51-200, 200+ | Demo form |
| Contact | `permitpath_demo_message` | Multi-line text | Demo form |
| Company | `permitpath_workspace_id` | Single-line text | Provisioning |
| Company | `permitpath_plan` | Dropdown: team, professional, enterprise | Billing |
| Company | `permitpath_active_applications` | Number | Nightly usage sync |
| Company | `permitpath_locations_managed` | Number | Nightly usage sync |
| Company | `permitpath_last_active_at` | Date | Nightly usage sync |
| Company | `permitpath_renewals_next_90d` | Number | Nightly usage sync (count only) |

Create these before enabling the integration. Personas (`hs_persona`) map to the five segments below.

**Never synced to HubSpot:** document contents, requirement text, client business names held *inside* a consultant's workspace, permit numbers, or anything from the regulatory knowledge base. Usage sync sends counts only.

## Pipelines

**New business (default pipeline)**
1. Demo requested → 2. Demo scheduled → 3. Demo completed → 4. Workspace pilot (14 days) → 5. Proposal → 6. Closed won / lost

**Enterprise pipeline** (separate, for `enterprise` segment or 51+ locations)
1. Qualified → 2. Discovery → 3. Security & procurement review (AWS architecture, DPA) → 4. Pilot → 5. Order form → 6. Closed won / lost

**Partner pipeline** (consultancies reselling or co-selling)
1. Partner applied → 2. Partner onboarded → 3. First client workspace → 4. Active partner

## Segment workflows

All workflows start from a form submission or a deal entering stage 1 and branch on `permitpath_segment`. Every email that mentions regulation says that PermitPath organizes the requirements in **official sources** and does not provide legal advice, fees or timelines.

| ID | Segment | Trigger | Steps |
| --- | --- | --- | --- |
| WF-01 | Permit consultants | Segment = consulting | Assign to partner manager (round-robin) · send "multi-client workspace" walkthrough · day 3: case study on client upload portal and task assignment · day 7: invite to partner program · if 11+ locations, enroll in partner pipeline |
| WF-02 | Construction | Segment = construction | Assign to construction AE · send tenant-improvement checklist demo video · day 4: content on conditional requirements and contractor license tracking · create task for AE to offer a site-based pilot |
| WF-03 | Retailers | Segment = retail | Assign by territory · send multi-location renewal calendar overview · day 5: "renewals across 50 stores" webinar invite · if 51+ locations, move to enterprise pipeline |
| WF-04 | Hospitality | Segment = hospitality | Assign to hospitality AE · send opening-readiness guide (food, beverage, signage workflows — fictional examples) · day 3: document validation demo · task: offer onboarding with a consultant partner |
| WF-05 | Enterprise prospects | Segment = enterprise **or** locations 51+ | Create enterprise-pipeline deal · assign to enterprise AE + solutions engineer · send security pack request form (SOC 2 status, AWS architecture, data handling) · task: schedule discovery within 2 business days · notify sales leadership in Slack |

## Lifecycle and lead scoring

- Demo form → `lifecyclestage = marketingqualifiedlead`; deal created at "Demo requested".
- Demo completed → `salesqualifiedlead`. Pilot workspace provisioned → `opportunity`. Closed won → `customer`.
- Score (+): 11+ locations (+20), enterprise segment (+25), visited pricing twice (+10), used interactive checklist demo (+10), work email domain (+10). (−): free email domain (−15), student/test keywords (−30).

## Customer success (post-sale)

- Nightly usage sync updates company properties. Workflow **CS-01**: if `permitpath_last_active_at` > 14 days ago → CSM task. **CS-02**: if `permitpath_renewals_next_90d` > 0 and no active users in 7 days → CSM check-in email ("you have renewals coming up in PermitPath"). **CS-03**: plan limit at 80% locations → expansion deal in default pipeline.

## Integration mechanics

- Contact upsert by email (`PATCH /crm/v3/objects/contacts/{email}?idProperty=email`), fallback create; deal create with contact association.
- Retries: failures are recorded on the demo request (`hubspot.detail`) and in the audit log; a follow-up job should retry unsynced rows.
- Consent: the demo form states how details are used; respect HubSpot subscription types for marketing email.
