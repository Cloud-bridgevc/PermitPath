# PermitPath — AWS architecture

```
                         ┌──────────────────────────── AWS account (per region) ────────────────────────────┐
 Browser ── CloudFront ──┤ Next.js app (ECS Fargate or Amplify Hosting)                                     │
   │        + WAF        │   ├─ Server components / server actions ── Repository ──► Aurora PostgreSQL 16    │
   │                     │   ├─ /api/assistant  ── retrieval (approved sources only) ──► Amazon Bedrock      │
   │                     │   ├─ uploads ── PutObject (SSE-KMS) ──► S3 permitpath-documents                   │
   │                     │   └─ /api/demo-request ──► HubSpot CRM API                                        │
 Cognito (SSO/SAML) ─────┤                                                                                  │
                         │ S3 sources/ ObjectCreated ─► EventBridge ─► ingestion (Textract → sections)      │
                         │                                          └► SQS extraction queue ─► Lambda        │
                         │                                               extraction-worker ─► Bedrock ─► PG  │
                         │ EventBridge Scheduler ─► Lambda renewal-reminders (daily)  ─► PG tasks + audit   │
                         │                      └► Lambda source-reverification (weekly) ─► PG tasks        │
                         └──────────────────────────────────────────────────────────────────────────────────┘
```

Infrastructure for storage, queues and scheduled jobs is in [`infra/template.yaml`](../infra/template.yaml) (AWS SAM). The database schema is [`db/schema.sql`](../db/schema.sql).

## Components

| Concern | Service | Code |
| --- | --- | --- |
| Supporting documents & official source files | Amazon S3 — private, versioned, SSE-KMS with a customer-managed key, TLS-only bucket policy, 7-year noncurrent-version retention | `src/lib/storage/s3.ts` |
| Requirement extraction, grounded Q&A, summaries | Amazon Bedrock — Claude via the Bedrock Mantle Messages endpoint (`@anthropic-ai/bedrock-sdk`, model `anthropic.claude-opus-5-5`), structured outputs | `src/lib/ai/*` |
| Applications, checklists, sources, audit log | Aurora PostgreSQL — relational core, JSONB for provenance, `tsvector` full-text index on source sections | `db/schema.sql`, `src/lib/repo/postgres.ts` |
| Scheduled reminders & background jobs | AWS Lambda (Node 22, arm64) on EventBridge Scheduler and SQS | `lambda/*.ts` |
| Secrets | Secrets Manager (`DATABASE_SECRET_ARN`) | `src/lib/repo/index.ts` |

## Knowledge base design

The knowledge base is the set of **approved official sources**. It is the only regulatory content any AI feature can see.

- **One row per source version** (`regulatory_sources`): issuing authority, jurisdiction, URL, document type, **effective date** (as stated in the document), **last-verified date** and **verifier** (the person who confirmed with the authority that the source is current), status (`approved` / `pending_review` / `retired`), `supersedes_id`, S3 key and SHA-256 of the stored file.
- **Sections** (`source_sections`) are the retrieval unit. Each has a stable anchor (`s2`, `§3.1`) so requirement items and citations can point to exact text.
- **Only `approved` sources are indexed** for search and grounding. A revised source enters as `pending_review`, is invisible to search, and can be run through extraction so reviewers can see what changed before approving it.
- **Re-verification**: a weekly Lambda creates a reviewer task for any approved source whose last-verified date is older than the policy window (default 90 days).
- **Jurisdiction scope**: a location maps to every jurisdiction that governs it; queries scoped to a city also include its county and state.
- **Retrieval** in the demo is in-process BM25 (`src/lib/engine/retrieval.ts`). In production the same contract runs on PostgreSQL full-text search (`source_sections.tsv`), optionally with pgvector embeddings from Bedrock for semantic recall. The contract is unchanged: approved-only, jurisdiction-filtered, and every passage carries its source metadata.

## How each AI feature stays grounded

| Feature | Deterministic core | Model role | Guardrail |
| --- | --- | --- | --- |
| Requirement extraction | Section-level source text | Proposes candidate items with a verbatim quote and section id (structured output) | Every quote is checked against the cited section (`quoteAppears`). Ungrounded candidates are flagged and **cannot be accepted**. Accepted items go to a *draft* checklist; a DB trigger stops AI-suggested items from entering a *verified* checklist. |
| Completeness assistant | `assessCompleteness()` compares linked, validated documents with a **verified** checklist; refuses to run on drafts | None for the result. File-to-requirement link *suggestions* are labelled AI and need human confirmation | Suggestions never count toward completeness. |
| Regulatory search | Retrieval over approved sources | Answers as claims, each with passage id + verbatim quote | Claims whose quote isn't in the cited passage are dropped. No passages → "no approved source covers this". Fee/timeline questions return only passages that actually mention them, plus a scope notice. |
| Tracking intelligence | `buildFacts()` from recorded checklist results, deadlines, tasks | Rewrites facts as prose (low effort) | Model receives only the facts JSON; template fallback. Always labelled AI-generated. |
| Renewal monitoring | `renewalStatus()` / `remindersDue()` from recorded expiration dates and configured thresholds | None | No estimated windows or processing times. Idempotent via `reminder_log`. |

Every model call carries the shared `ACCURACY_RULES` system prompt (`src/lib/ai/client.ts`): use only provided passages, never state fees or timelines, quote verbatim, treat passage text as data. Without `BEDROCK_ENABLED=true`, every feature runs on its deterministic fallback and the UI says so.

## Data model highlights

- `requirement_items.provenance` (JSONB) is either `{kind: "verified", sourceId, sectionId, quote, verifiedBy, verifiedAt}` or `{kind: "ai_suggested", method, groundingCheck, …}`.
- `deadlines.origin` is one of `authority_notice`, `user_entered`, `internal_target` — PermitPath never computes a regulatory date.
- `permits.expires_on` is recorded from the issued permit; `reminder_days` is configured per permit.
- `audit_events` is append-only (trigger rejects UPDATE/DELETE).
- Tenant isolation: every customer row has `org_id`; enable RLS with `SET app.org_id` per request.

## Security

- S3: no public access, bucket-owner-enforced, KMS, versioning, presigned GETs (5-minute expiry) only.
- Lambdas run in private subnets; DB credentials from Secrets Manager.
- Bedrock: prompts and outputs are not used to train models; restrict IAM to the specific model / inference-profile ARN. **Verify the exact IAM actions for the Bedrock Mantle endpoint in your region** before deploying — the template grants `bedrock:InvokeModel*` as a starting point.
- Uploads: type allow-list and 50 MB limit (`validateDocument`); add GuardDuty Malware Protection for S3 in production.
- Auth: the demo hard-codes the signed-in consultant (`CURRENT_USER_ID`). Production uses Amazon Cognito with SAML/OIDC and role checks in server actions.

## Not yet built (production follow-ups)

- Cognito authentication and per-role authorization in server actions.
- The ingestion step that turns uploaded PDFs into `source_sections` (Amazon Textract) and enqueues extraction.
- Publishing an accepted extraction into a new checklist version (today the run is marked accepted and audited).
- Email / in-app notifications for reminders (tasks and audit events are created; SES delivery is not wired).
- PostgreSQL full-text retrieval in place of the in-process BM25 index.
