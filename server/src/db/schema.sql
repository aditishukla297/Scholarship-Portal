-- =====================================================================
--  AI-Enabled Scholarship and Fellowship Management System
--  PostgreSQL schema
--
--  Nested structures that are always read and written as a whole
--  (documents, deficiencies, timeline, AI findings) are held as JSONB.
--  Anything filtered, sorted or aggregated on is a real column or a
--  generated column, so it can be indexed.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------- users
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL,
  email           TEXT        NOT NULL UNIQUE,
  phone           TEXT        NOT NULL,
  password_hash   TEXT        NOT NULL,
  aadhaar_masked  TEXT        NOT NULL DEFAULT '',
  category        TEXT        NOT NULL DEFAULT 'NA'
                   CHECK (category IN ('ST','SC','OBC','General','NA')),
  role            TEXT        NOT NULL DEFAULT 'applicant'
                   CHECK (role IN ('applicant','officer','admin')),
  gender          TEXT        NOT NULL DEFAULT 'NA'
                   CHECK (gender IN ('Male','Female','Transgender','NA')),
  state           TEXT        NOT NULL DEFAULT '',
  district        TEXT        NOT NULL DEFAULT '',
  designation     TEXT        NOT NULL DEFAULT '',
  active          BOOLEAN     NOT NULL DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);

-- -------------------------------------------------------------- schemes
CREATE TABLE IF NOT EXISTS schemes (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code               TEXT        NOT NULL UNIQUE,
  name               TEXT        NOT NULL,
  short_name         TEXT        NOT NULL DEFAULT '',
  ministry           TEXT        NOT NULL DEFAULT 'Ministry of Tribal Affairs',
  type               TEXT        NOT NULL DEFAULT 'Scholarship'
                      CHECK (type IN ('Fellowship','Scholarship','Overseas Scholarship','Grant')),
  description        TEXT        NOT NULL DEFAULT '',
  benefits           JSONB       NOT NULL DEFAULT '[]'::jsonb,
  education_levels   JSONB       NOT NULL DEFAULT '[]'::jsonb,
  slots_per_year     INTEGER     NOT NULL DEFAULT 0,
  amount_per_annum   BIGINT      NOT NULL DEFAULT 0,
  application_start  TIMESTAMPTZ,
  application_end    TIMESTAMPTZ,
  eligibility_rules  JSONB       NOT NULL DEFAULT '[]'::jsonb,
  required_documents JSONB       NOT NULL DEFAULT '[]'::jsonb,
  guidelines_url     TEXT        NOT NULL DEFAULT '',
  active             BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------- applications
CREATE TABLE IF NOT EXISTS applications (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id        TEXT        NOT NULL UNIQUE,
  applicant_id          UUID        NOT NULL REFERENCES users (id)   ON DELETE CASCADE,
  scheme_id             UUID        NOT NULL REFERENCES schemes (id) ON DELETE RESTRICT,
  academic_year         TEXT        NOT NULL DEFAULT '2026-27',
  status                TEXT        NOT NULL DEFAULT 'Draft'
                         CHECK (status IN ('Draft','Submitted','Under Verification','Deficiency Raised',
                                           'Verified','Selected','Rejected','Sanctioned','Disbursed')),
  current_step          INTEGER     NOT NULL DEFAULT 1,

  personal              JSONB       NOT NULL DEFAULT '{}'::jsonb,
  category              JSONB       NOT NULL DEFAULT '{}'::jsonb,
  academic              JSONB       NOT NULL DEFAULT '{}'::jsonb,
  bank                  JSONB       NOT NULL DEFAULT '{}'::jsonb,
  documents             JSONB       NOT NULL DEFAULT '[]'::jsonb,
  deficiencies          JSONB       NOT NULL DEFAULT '[]'::jsonb,
  timeline              JSONB       NOT NULL DEFAULT '[]'::jsonb,
  ai_findings           JSONB       NOT NULL DEFAULT '{}'::jsonb,
  disbursement          JSONB,

  submitted_at          TIMESTAMPTZ,
  verified_at           TIMESTAMPTZ,
  decision_at           TIMESTAMPTZ,
  sanction_order_number TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Promoted out of JSONB so the officer queue and MIS can filter and group on them.
  state           TEXT GENERATED ALWAYS AS (personal ->> 'state')            STORED,
  education_level TEXT GENERATED ALWAYS AS (academic ->> 'educationLevel')   STORED,
  gender          TEXT GENERATED ALWAYS AS (personal ->> 'gender')           STORED,
  merit_score     NUMERIC GENERATED ALWAYS AS
                    (NULLIF(ai_findings ->> 'meritScore', '')::NUMERIC)      STORED
);
CREATE INDEX IF NOT EXISTS applications_status_idx      ON applications (status);
CREATE INDEX IF NOT EXISTS applications_applicant_idx   ON applications (applicant_id);
CREATE INDEX IF NOT EXISTS applications_scheme_idx      ON applications (scheme_id);
CREATE INDEX IF NOT EXISTS applications_state_idx       ON applications (state);
CREATE INDEX IF NOT EXISTS applications_level_idx       ON applications (education_level);
CREATE INDEX IF NOT EXISTS applications_merit_idx       ON applications (merit_score DESC);
CREATE INDEX IF NOT EXISTS applications_deficiency_gin  ON applications USING GIN (deficiencies);

-- -------------------------------------------------------- verifications
CREATE TABLE IF NOT EXISTS verifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id    UUID        NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
  officer_id        UUID        NOT NULL REFERENCES users (id)        ON DELETE CASCADE,
  action            TEXT        NOT NULL
                     CHECK (action IN ('Verified','Deficiency Raised','Approved','Rejected',
                                       'Selected','Sanctioned','Reopened')),
  remarks           TEXT        NOT NULL DEFAULT '',
  confidence        INTEGER     NOT NULL DEFAULT 0,
  ai_recommendation TEXT        NOT NULL DEFAULT '',
  overrode_ai       BOOLEAN     NOT NULL DEFAULT FALSE,
  documents_checked JSONB       NOT NULL DEFAULT '[]'::jsonb,
  acted_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS verifications_application_idx ON verifications (application_id);
CREATE INDEX IF NOT EXISTS verifications_officer_idx     ON verifications (officer_id);

-- ------------------------------------------------------- document_files
-- Binaries live in the database because the serverless filesystem is read-only.
CREATE TABLE IF NOT EXISTS document_files (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stored_name    TEXT        NOT NULL UNIQUE,
  application_id UUID        NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
  document_code  TEXT        NOT NULL,
  file_name      TEXT,
  mime_type      TEXT,
  size_bytes     INTEGER,
  data           BYTEA       NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS document_files_application_idx ON document_files (application_id);

-- ----------------------------------------------------------- grievances
CREATE TABLE IF NOT EXISTS grievances (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id      TEXT        NOT NULL UNIQUE,
  name           TEXT        NOT NULL,
  email          TEXT        NOT NULL,
  phone          TEXT,
  application_ref TEXT,
  category       TEXT        NOT NULL DEFAULT 'Other'
                  CHECK (category IN ('Application','Document','Payment / DBT','Login / Registration','Other')),
  subject        TEXT        NOT NULL,
  message        TEXT        NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'Open'
                  CHECK (status IN ('Open','In Progress','Resolved','Closed')),
  raised_by      UUID REFERENCES users (id) ON DELETE SET NULL,
  response       TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Keep updated_at honest without touching every UPDATE statement.
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','schemes','applications','grievances'] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I_touch ON %I; CREATE TRIGGER %I_touch BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION touch_updated_at();', t, t, t, t);
  END LOOP;
END $$;
