-- PermitPath PostgreSQL schema (Amazon RDS / Aurora PostgreSQL 16+)
--
-- Design notes
-- * Regulatory content (sources, checklists, requirement items) is versioned and never
--   updated in place once verified: a change creates a new version and supersedes the old.
-- * Every requirement item stores its provenance: either a verified quote from an approved
--   source section, or an AI suggestion with its grounding-check result.
-- * audit_events is append-only (enforced by trigger).
-- * Multi-tenant: every customer-owned row carries org_id; enable row-level security with
--   `SET app.org_id = ...` per request. Regulatory sources can be shared (org_id NULL) or
--   private to a consulting firm.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE organizations (
  id           text PRIMARY KEY,
  name         text NOT NULL,
  hubspot_company_id text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id        text PRIMARY KEY,
  org_id    text NOT NULL REFERENCES organizations(id),
  name      text NOT NULL,
  email     text NOT NULL UNIQUE,
  role      text NOT NULL CHECK (role IN ('admin','consultant','client')),
  title     text NOT NULL DEFAULT ''
);

CREATE TABLE jurisdictions (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  level      text NOT NULL CHECK (level IN ('state','county','city')),
  parent_id  text REFERENCES jurisdictions(id),
  fictional  boolean NOT NULL DEFAULT false
);

CREATE TABLE businesses (
  id               text PRIMARY KEY,
  org_id           text NOT NULL REFERENCES organizations(id),
  name             text NOT NULL,
  industry         text NOT NULL CHECK (industry IN ('construction','retail','hospitality','consulting','enterprise')),
  primary_contact  text NOT NULL,
  contact_email    text NOT NULL,
  notes            text,
  hubspot_company_id text
);

CREATE TABLE locations (
  id                text PRIMARY KEY,
  org_id            text NOT NULL REFERENCES organizations(id),
  business_id       text NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name              text NOT NULL,
  address           text NOT NULL,
  jurisdiction_ids  text[] NOT NULL
);
CREATE INDEX locations_business_idx ON locations(business_id);

-- ---------------------------------------------------------------------------
-- Knowledge base: approved official sources with effective and verification dates
-- ---------------------------------------------------------------------------
CREATE TABLE regulatory_sources (
  id                text PRIMARY KEY,
  org_id            text REFERENCES organizations(id), -- NULL = shared library
  title             text NOT NULL,
  authority         text NOT NULL,
  jurisdiction_id   text NOT NULL REFERENCES jurisdictions(id),
  url               text NOT NULL,
  document_type     text NOT NULL CHECK (document_type IN ('guidance','application_form','ordinance','checklist','notice')),
  effective_date    date NOT NULL,
  last_verified_at  date NOT NULL,
  verified_by       text NOT NULL REFERENCES users(id),
  status            text NOT NULL CHECK (status IN ('approved','pending_review','retired')),
  supersedes_id     text REFERENCES regulatory_sources(id),
  s3_key            text,
  sha256            text,
  fictional         boolean NOT NULL DEFAULT false
);
CREATE INDEX sources_jurisdiction_status_idx ON regulatory_sources(jurisdiction_id, status);

CREATE TABLE source_sections (
  source_id   text NOT NULL REFERENCES regulatory_sources(id) ON DELETE CASCADE,
  id          text NOT NULL,
  ordinal     int  NOT NULL,
  heading     text NOT NULL,
  body        text NOT NULL,
  tsv         tsvector GENERATED ALWAYS AS (to_tsvector('english', heading || ' ' || body)) STORED,
  -- embedding vector(1024)  -- enable with pgvector + Bedrock embeddings for semantic retrieval
  PRIMARY KEY (source_id, id)
);
CREATE INDEX source_sections_tsv_idx ON source_sections USING gin(tsv);

CREATE TABLE permit_types (
  id               text PRIMARY KEY,
  name             text NOT NULL,
  jurisdiction_id  text NOT NULL REFERENCES jurisdictions(id),
  authority        text NOT NULL,
  description      text NOT NULL,
  source_ids       text[] NOT NULL,
  fictional        boolean NOT NULL DEFAULT false
);

CREATE TABLE checklists (
  id                text PRIMARY KEY,
  name              text NOT NULL,
  permit_type_id    text NOT NULL REFERENCES permit_types(id),
  jurisdiction_id   text NOT NULL REFERENCES jurisdictions(id),
  version           int  NOT NULL,
  status            text NOT NULL CHECK (status IN ('verified','draft','superseded')),
  last_verified_at  date NOT NULL,
  verified_by       text NOT NULL REFERENCES users(id),
  UNIQUE (permit_type_id, name, version)
);

CREATE TABLE requirement_items (
  id                      text PRIMARY KEY,
  checklist_id            text NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  ordinal                 int  NOT NULL,
  code                    text NOT NULL,
  title                   text NOT NULL,
  description             text NOT NULL,
  kind                    text NOT NULL CHECK (kind IN ('document','condition','step')),
  accepted_doc_types      text[] NOT NULL DEFAULT '{}',
  mandatory               boolean NOT NULL,
  confirm_with_authority  boolean NOT NULL DEFAULT false,
  -- {"kind":"verified","sourceId","sectionId","quote","verifiedBy","verifiedAt"}
  -- {"kind":"ai_suggested","method","groundingCheck",...}
  provenance              jsonb NOT NULL,
  CHECK (provenance->>'kind' IN ('verified','ai_suggested'))
);
-- A verified checklist may only contain verified items.
CREATE FUNCTION enforce_verified_items() RETURNS trigger AS $$
BEGIN
  IF (SELECT status FROM checklists WHERE id = NEW.checklist_id) = 'verified'
     AND NEW.provenance->>'kind' <> 'verified' THEN
    RAISE EXCEPTION 'verified checklist % cannot contain AI-suggested item %', NEW.checklist_id, NEW.id;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER requirement_items_verified BEFORE INSERT OR UPDATE ON requirement_items
  FOR EACH ROW EXECUTE FUNCTION enforce_verified_items();

-- ---------------------------------------------------------------------------
-- Applications
-- ---------------------------------------------------------------------------
CREATE TABLE applications (
  id                    text PRIMARY KEY,
  org_id                text NOT NULL REFERENCES organizations(id),
  reference             text NOT NULL,
  authority_reference   text,
  business_id           text NOT NULL REFERENCES businesses(id),
  location_id           text NOT NULL REFERENCES locations(id),
  permit_type_id        text NOT NULL REFERENCES permit_types(id),
  checklist_id          text NOT NULL REFERENCES checklists(id),
  status                text NOT NULL CHECK (status IN ('draft','collecting','internal_review','submitted','information_requested','approved','denied','withdrawn')),
  lead_consultant_id    text NOT NULL REFERENCES users(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  submitted_at          date,
  hubspot_deal_id       text,
  UNIQUE (org_id, reference)
);

CREATE TABLE application_item_status (
  application_id  text NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  item_id         text NOT NULL REFERENCES requirement_items(id),
  state           text NOT NULL CHECK (state IN ('met','not_met','not_applicable')),
  decided_by      text NOT NULL REFERENCES users(id),
  decided_at      timestamptz NOT NULL DEFAULT now(),
  note            text,
  PRIMARY KEY (application_id, item_id)
);

CREATE TABLE deadlines (
  id              text PRIMARY KEY,
  application_id  text NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  label           text NOT NULL,
  date            date NOT NULL,
  -- PermitPath never computes regulatory timelines; every date records where it came from.
  origin          text NOT NULL CHECK (origin IN ('authority_notice','user_entered','internal_target')),
  note            text
);
CREATE INDEX deadlines_date_idx ON deadlines(date);

CREATE TABLE documents (
  id              text PRIMARY KEY,
  application_id  text NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  file_name       text NOT NULL,
  doc_type        text NOT NULL,
  size_bytes      bigint NOT NULL,
  mime_type       text NOT NULL,
  s3_key          text NOT NULL UNIQUE,
  s3_version_id   text,
  sha256          text,
  uploaded_at     timestamptz NOT NULL DEFAULT now(),
  uploaded_by     text NOT NULL REFERENCES users(id),
  requirement_id  text REFERENCES requirement_items(id),
  link_confirmed  boolean NOT NULL DEFAULT false,
  document_date   date,
  expires_on      date
);
CREATE INDEX documents_application_idx ON documents(application_id);

-- Issued permits with RECORDED expiration dates
CREATE TABLE permits (
  id                      text PRIMARY KEY,
  org_id                  text NOT NULL REFERENCES organizations(id),
  permit_type_id          text NOT NULL REFERENCES permit_types(id),
  location_id             text NOT NULL REFERENCES locations(id),
  business_id             text NOT NULL REFERENCES businesses(id),
  application_id          text REFERENCES applications(id),
  permit_number           text NOT NULL,
  issued_on               date NOT NULL,
  expires_on              date NOT NULL,
  reminder_days           int[] NOT NULL DEFAULT '{90,60,30}',
  owner_id                text NOT NULL REFERENCES users(id),
  renewal_application_id  text REFERENCES applications(id)
);
CREATE INDEX permits_expires_idx ON permits(expires_on);

CREATE TABLE reminder_log (
  permit_id   text NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
  threshold   int  NOT NULL,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (permit_id, threshold)
);

CREATE TABLE tasks (
  id              text PRIMARY KEY,
  org_id          text NOT NULL REFERENCES organizations(id),
  application_id  text REFERENCES applications(id) ON DELETE CASCADE,
  permit_id       text REFERENCES permits(id) ON DELETE CASCADE,
  requirement_id  text REFERENCES requirement_items(id),
  title           text NOT NULL,
  assignee_id     text NOT NULL REFERENCES users(id),
  due_date        date,
  status          text NOT NULL CHECK (status IN ('open','in_progress','blocked','done')),
  created_by      text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tasks_assignee_idx ON tasks(assignee_id, status);

CREATE TABLE extraction_runs (
  id              text PRIMARY KEY,
  source_id       text NOT NULL REFERENCES regulatory_sources(id),
  permit_type_id  text REFERENCES permit_types(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      text NOT NULL,
  method          text NOT NULL CHECK (method IN ('bedrock','heuristic')),
  model_id        text,
  status          text NOT NULL CHECK (status IN ('pending_review','accepted','rejected')),
  items           jsonb NOT NULL
);

CREATE TABLE demo_requests (
  id         text PRIMARY KEY,
  at         timestamptz NOT NULL DEFAULT now(),
  name       text NOT NULL,
  email      text NOT NULL,
  company    text NOT NULL,
  segment    text NOT NULL,
  locations  text NOT NULL,
  message    text,
  hubspot    jsonb NOT NULL
);

CREATE TABLE audit_events (
  id           text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  at           timestamptz NOT NULL DEFAULT now(),
  org_id       text REFERENCES organizations(id),
  actor_id     text NOT NULL,
  action       text NOT NULL,
  entity_type  text NOT NULL,
  entity_id    text NOT NULL,
  detail       text NOT NULL
);
CREATE INDEX audit_entity_idx ON audit_events(entity_id, at DESC);

CREATE FUNCTION audit_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END $$ LANGUAGE plpgsql;
CREATE TRIGGER audit_no_update BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION audit_append_only();
