# PermitPath

AI-native permit application management and regulatory workflow platform. Helps businesses and permit consultants organize application requirements, collect documents, track submissions and manage renewals across locations — with every requirement traced to an approved official source.

> **All demo data is fictional.** Jurisdictions (State of Northmere, Harrow County, City of Alderbrook, City of Port Linden), authorities, businesses, permits and sources are invented. Source URLs use the reserved `.example` domain.

## Run it

```bash
npm install
npm run dev        # http://localhost:3100
```

- `/` public website (use cases, interactive checklist demo at `/demo`, pricing, demo request, FAQ)
- `/app` demo workspace for the fictional consultancy *Meridian Permit Advisors*

With no environment variables set, the app uses the in-memory demo dataset and deterministic fallbacks for every AI feature. See [`.env.example`](.env.example) to enable PostgreSQL, S3, Bedrock and HubSpot.

```bash
npm test           # engine + grounding tests
npm run typecheck
```

### With PostgreSQL

```bash
psql "$DATABASE_URL" -f db/schema.sql
npm run db:seed-sql && psql "$DATABASE_URL" -f db/seed.sql
DATABASE_URL=... npm run dev
DATABASE_URL=... node --experimental-strip-types tests/postgres.integration.ts
```

## What's where

| Path | Purpose |
| --- | --- |
| `src/lib/types.ts` | Domain model, including `Provenance` (verified vs AI-suggested) |
| `src/lib/engine/` | Deterministic core: completeness, validation, renewals, retrieval |
| `src/lib/ai/` | Bedrock-backed extraction, grounded search, summaries — each with a fallback |
| `src/lib/repo/` | Repository interface, in-memory demo store, PostgreSQL implementation |
| `src/lib/demo/seed.ts` | Fictional demonstration dataset |
| `src/app/(site)/` | Public website |
| `src/app/app/` | Dashboard |
| `lambda/` | Renewal reminders, extraction worker, source re-verification |
| `infra/template.yaml` | AWS SAM: S3 + KMS, SQS, scheduled Lambdas |
| `db/schema.sql` | PostgreSQL schema |
| `docs/` | [Architecture](docs/ARCHITECTURE.md), [HubSpot plan](docs/HUBSPOT.md), [Accuracy policy](docs/ACCURACY.md) |

## Demo walkthrough

1. **/demo** — pick *Juniper & Salt · Food Service Plan Review*. FS-03 (equipment schedule) is missing and FS-05 (manager certificate) is expired. Click any item to see the source text it comes from. Toggle files on to watch items resolve; confirm the AI-suggested link for the equipment quote and see validation still flag the wrong document type.
2. **/app/applications/app-1001** — the same check against live workspace data, with source citations, task assignment, recorded dates and the audit trail.
3. **/app/assistant** — ask a question; answers cite approved sources with effective and last-verified dates. Ask about a fee and see it decline.
4. **/app/extraction** — a revised (pending) source produced two candidates; one failed the grounding check and can't be accepted.
5. **/app/renewals** — calendar of recorded expirations and configured reminders.
