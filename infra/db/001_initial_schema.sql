-- ============================================================
-- SAHAY — Full Database Schema Migration
-- PostgreSQL + PostGIS
-- Version: 001_initial_schema
-- ============================================================

-- Extensions (also in init.sql, but safe to repeat)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── Geography ───────────────────────────────────────────────

CREATE TABLE cities (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  state       TEXT NOT NULL,
  country     TEXT NOT NULL DEFAULT 'India',
  config      JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE wards (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id               UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  ward_number           TEXT NOT NULL,
  boundary              GEOMETRY(MULTIPOLYGON, 4326),
  center_point          GEOMETRY(POINT, 4326),
  population_estimate   INTEGER NOT NULL DEFAULT 0,
  area_sqkm             NUMERIC(10,4)
);

CREATE INDEX idx_wards_city_id ON wards(city_id);
CREATE INDEX idx_wards_boundary ON wards USING GIST(boundary);

-- ─── Users & Identity ────────────────────────────────────────

CREATE TYPE user_role AS ENUM (
  'citizen_guest', 'citizen', 'verified_citizen', 'civic_leader',
  'ngo', 'company_csr', 'society_rwa',
  'municipal_officer', 'elected_representative', 'political_party',
  'police', 'journalist', 'sub_admin', 'super_admin'
);

CREATE TYPE badge_type AS ENUM (
  'blue_tick', 'green_tick', 'gold_star', 'grey_check', 'press_badge', 'none'
);

CREATE TYPE verification_status AS ENUM (
  'unverified', 'pending', 'verified', 'rejected', 'suspended'
);

CREATE TYPE privacy_level AS ENUM ('public', 'semi_private', 'private');

CREATE TABLE users (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_uid          TEXT UNIQUE NOT NULL,
  phone                 TEXT,
  email                 TEXT,
  name                  TEXT NOT NULL DEFAULT 'Sahay User',
  avatar_url            TEXT,
  role                  user_role NOT NULL DEFAULT 'citizen',
  verification_status   verification_status NOT NULL DEFAULT 'unverified',
  badge_type            badge_type NOT NULL DEFAULT 'none',
  bio                   TEXT,
  language_pref         TEXT NOT NULL DEFAULT 'en',
  privacy_level         privacy_level NOT NULL DEFAULT 'public',
  civic_impact_score    INTEGER NOT NULL DEFAULT 0,
  level                 SMALLINT NOT NULL DEFAULT 1,
  jurisdiction_id       UUID REFERENCES wards(id),
  city_id               UUID REFERENCES cities(id),
  fcm_token             TEXT,
  notification_pref     TEXT NOT NULL DEFAULT 'instant', -- 'instant' | 'daily' | 'weekly'
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_city_id ON users(city_id);

CREATE TABLE verification_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_applied    user_role NOT NULL,
  documents       JSONB NOT NULL DEFAULT '[]',
  status          TEXT NOT NULL DEFAULT 'pending', -- pending|approved|rejected|more_info_requested
  reviewed_by     UUID REFERENCES users(id),
  review_notes    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ
);

CREATE INDEX idx_verification_requests_status ON verification_requests(status);

-- ─── Civic Data ──────────────────────────────────────────────

CREATE TYPE report_category AS ENUM (
  'waterlogging', 'pothole', 'garbage', 'streetlight', 'water_supply',
  'sewage', 'road_damage', 'encroachment', 'tree_hazard',
  'air_pollution', 'noise_pollution', 'park_damage', 'stray_animals',
  'safety', 'other'
);

CREATE TYPE severity_level AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE reports (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES users(id),
  category              report_category NOT NULL,
  description           TEXT NOT NULL,
  ai_structured_data    JSONB,
  media_urls            JSONB NOT NULL DEFAULT '[]',
  location              GEOMETRY(POINT, 4326) NOT NULL,
  address               TEXT,
  ward_id               UUID REFERENCES wards(id),
  evidence_confidence   NUMERIC(4,3) NOT NULL DEFAULT 0.5,
  status                TEXT NOT NULL DEFAULT 'submitted',
  -- submitted|ai_processed|clustered|standalone|resolved|rejected
  incident_id           UUID, -- FK added after civic_incidents table
  is_sos                BOOLEAN NOT NULL DEFAULT FALSE,
  is_integrity_report   BOOLEAN NOT NULL DEFAULT FALSE,
  language              TEXT NOT NULL DEFAULT 'en',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_location ON reports USING GIST(location);
CREATE INDEX idx_reports_ward_id ON reports(ward_id);
CREATE INDEX idx_reports_incident_id ON reports(incident_id);
CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_category ON reports(category);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);

-- Full-text search index
CREATE INDEX idx_reports_description_fts ON reports USING GIN(to_tsvector('simple', description));

CREATE TABLE civic_incidents (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id                     UUID NOT NULL REFERENCES cities(id),
  ward_id                     UUID REFERENCES wards(id),
  category                    report_category NOT NULL,
  title                       TEXT NOT NULL,
  description                 TEXT NOT NULL,
  report_count                INTEGER NOT NULL DEFAULT 1,
  unique_citizen_count        INTEGER NOT NULL DEFAULT 1,
  severity                    severity_level NOT NULL DEFAULT 'medium',
  status                      TEXT NOT NULL DEFAULT 'active',
  -- active|in_progress|resolved|closed
  root_cause_hypothesis       TEXT,
  priority_score              NUMERIC(6,2) NOT NULL DEFAULT 50,
  affected_population_estimate INTEGER NOT NULL DEFAULT 0,
  location_center             GEOMETRY(POINT, 4326) NOT NULL,
  location_radius_m           INTEGER NOT NULL DEFAULT 500,
  first_detected_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_civic_incidents_location ON civic_incidents USING GIST(location_center);
CREATE INDEX idx_civic_incidents_ward_id ON civic_incidents(ward_id);
CREATE INDEX idx_civic_incidents_city_id ON civic_incidents(city_id);
CREATE INDEX idx_civic_incidents_status ON civic_incidents(status);
CREATE INDEX idx_civic_incidents_priority ON civic_incidents(priority_score DESC);

-- Add FK from reports to incidents
ALTER TABLE reports ADD CONSTRAINT fk_reports_incident
  FOREIGN KEY (incident_id) REFERENCES civic_incidents(id);

CREATE TABLE civic_demands (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id           UUID NOT NULL REFERENCES civic_incidents(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  description           TEXT NOT NULL,
  supporters_count      INTEGER NOT NULL DEFAULT 0,
  affected_residents    INTEGER NOT NULL DEFAULT 0,
  priority              NUMERIC(6,2) NOT NULL DEFAULT 50,
  stage                 TEXT NOT NULL DEFAULT 'proposed',
  -- proposed|community_supported|submitted|accepted|work_planned|in_progress|completed|citizen_verification|resolved|reopened
  department_id         UUID,
  assigned_officer_id   UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_civic_demands_incident_id ON civic_demands(incident_id);
CREATE INDEX idx_civic_demands_stage ON civic_demands(stage);

CREATE TABLE demand_supporters (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  demand_id   UUID NOT NULL REFERENCES civic_demands(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(demand_id, user_id)
);

CREATE INDEX idx_demand_supporters_demand_id ON demand_supporters(demand_id);

CREATE TABLE work_orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  demand_id       UUID NOT NULL REFERENCES civic_demands(id),
  department_id   UUID NOT NULL,
  contractor_id   UUID,
  status          TEXT NOT NULL DEFAULT 'created',
  -- created|assigned|in_progress|completed|verified
  evidence_before JSONB NOT NULL DEFAULT '[]',
  evidence_after  JSONB NOT NULL DEFAULT '[]',
  notes           TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE resolution_verifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  demand_id       UUID NOT NULL REFERENCES civic_demands(id),
  user_id         UUID NOT NULL REFERENCES users(id),
  verdict         TEXT NOT NULL, -- solved|partially_solved|not_solved
  evidence_urls   JSONB NOT NULL DEFAULT '[]',
  ai_confidence   NUMERIC(4,3) NOT NULL DEFAULT 0,
  comment         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(demand_id, user_id)
);

-- ─── Organizations ───────────────────────────────────────────

CREATE TABLE organizations (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type                  TEXT NOT NULL, -- ngo|company|society
  name                  TEXT NOT NULL,
  registration_number   TEXT,
  verification_status   TEXT NOT NULL DEFAULT 'pending',
  operating_wards       JSONB NOT NULL DEFAULT '[]',
  focus_areas           JSONB NOT NULL DEFAULT '[]',
  contact               JSONB NOT NULL DEFAULT '{}',
  description           TEXT,
  logo_url              TEXT,
  owner_user_id         UUID REFERENCES users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_type ON organizations(type);
CREATE INDEX idx_organizations_verification ON organizations(verification_status);

CREATE TABLE initiatives (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id),
  incident_id       UUID REFERENCES civic_incidents(id),
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  type              TEXT NOT NULL, -- fund|volunteer|awareness|equipment|skills|materials
  goal_amount       NUMERIC(12,2),
  raised_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  volunteer_target  INTEGER,
  volunteer_count   INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'active', -- active|completed|cancelled
  contributor_count INTEGER NOT NULL DEFAULT 0,
  start_date        DATE,
  end_date          DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE contributions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  initiative_id   UUID NOT NULL REFERENCES initiatives(id),
  user_id         UUID NOT NULL REFERENCES users(id),
  type            TEXT NOT NULL, -- fund|volunteer|equipment|skills|materials|awareness
  amount_hidden   BOOLEAN NOT NULL DEFAULT TRUE,
  amount          NUMERIC(12,2),
  hours           NUMERIC(6,2),
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Government ──────────────────────────────────────────────

CREATE TABLE departments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id         UUID NOT NULL REFERENCES cities(id),
  name            TEXT NOT NULL,
  categories      JSONB NOT NULL DEFAULT '[]',
  head_officer_id UUID,
  contact         TEXT
);

CREATE INDEX idx_departments_city_id ON departments(city_id);

CREATE TABLE government_officials (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id),
  department_id   UUID NOT NULL REFERENCES departments(id),
  designation     TEXT NOT NULL,
  jurisdiction_id UUID REFERENCES wards(id)
);

CREATE TABLE elected_representatives (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id),
  office_type     TEXT NOT NULL, -- corporator|ward_member|mla|mp|mayor
  constituency    TEXT,
  ward_id         UUID REFERENCES wards(id),
  term_start      DATE,
  term_end        DATE
);

-- ─── Civic Circles / Missions ────────────────────────────────

CREATE TABLE circles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'general', -- college|locality|ngo|school|general
  description TEXT,
  member_count INTEGER NOT NULL DEFAULT 0,
  city_id     UUID NOT NULL REFERENCES cities(id),
  ward_id     UUID REFERENCES wards(id),
  avatar_url  TEXT,
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE circle_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  circle_id   UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  role        TEXT NOT NULL DEFAULT 'member', -- admin|member
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(circle_id, user_id)
);

CREATE TABLE missions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  category          report_category NOT NULL,
  goal_metric       TEXT NOT NULL,
  current_progress  INTEGER NOT NULL DEFAULT 0,
  target            INTEGER NOT NULL,
  created_by        UUID NOT NULL REFERENCES users(id),
  status            TEXT NOT NULL DEFAULT 'proposed',
  -- proposed|approved|active|completed|cancelled
  start_at          TIMESTAMPTZ,
  end_at            TIMESTAMPTZ,
  ward_id           UUID REFERENCES wards(id),
  city_id           UUID NOT NULL REFERENCES cities(id),
  participant_count INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE mission_participants (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mission_id            UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES users(id),
  contribution_summary  JSONB NOT NULL DEFAULT '{}',
  joined_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(mission_id, user_id)
);

-- ─── Gamification ────────────────────────────────────────────

CREATE TABLE badges (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  icon        TEXT NOT NULL,
  category    TEXT NOT NULL
);

CREATE TABLE user_badges (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id),
  badge_id    UUID NOT NULL REFERENCES badges(id),
  earned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

CREATE TABLE rewards (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  description     TEXT NOT NULL,
  sponsor_org_id  UUID REFERENCES organizations(id),
  points_required INTEGER NOT NULL,
  stock           INTEGER NOT NULL DEFAULT 0,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at      TIMESTAMPTZ
);

CREATE TABLE reward_redemptions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id),
  reward_id   UUID NOT NULL REFERENCES rewards(id),
  status      TEXT NOT NULL DEFAULT 'pending', -- pending|fulfilled|cancelled
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Trust / Moderation / Integrity ──────────────────────────

CREATE TABLE moderation_flags (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_type TEXT NOT NULL, -- report|incident|comment|user|initiative
  target_id   UUID NOT NULL,
  reason      TEXT NOT NULL,
  flagged_by  UUID NOT NULL REFERENCES users(id),
  status      TEXT NOT NULL DEFAULT 'pending', -- pending|reviewed|dismissed|actioned
  reviewed_by UUID REFERENCES users(id),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE TABLE integrity_reports (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_user_id      UUID REFERENCES users(id), -- nullable for anonymous
  description           TEXT NOT NULL,
  evidence              JSONB NOT NULL DEFAULT '[]',
  target_type           TEXT, -- official|department|process
  target_id             UUID,
  status                TEXT NOT NULL DEFAULT 'submitted',
  -- submitted|under_review|resolved|dismissed
  restricted            BOOLEAN NOT NULL DEFAULT TRUE, -- super_admin only
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID REFERENCES users(id),
  action      TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id   UUID,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ─── Notifications ───────────────────────────────────────────

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  data        JSONB NOT NULL DEFAULT '{}',
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id, read, created_at DESC);

-- ─── Petitions & Polls ───────────────────────────────────────

CREATE TABLE petitions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  demand_id       UUID REFERENCES civic_demands(id),
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  created_by      UUID NOT NULL REFERENCES users(id),
  target_entity   TEXT,
  signature_count INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'active',
  city_id         UUID NOT NULL REFERENCES cities(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE petition_signatures (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  petition_id UUID NOT NULL REFERENCES petitions(id),
  user_id     UUID NOT NULL REFERENCES users(id),
  signed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(petition_id, user_id)
);

CREATE TABLE polls (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  options     JSONB NOT NULL,
  created_by  UUID NOT NULL REFERENCES users(id),
  ends_at     TIMESTAMPTZ,
  city_id     UUID NOT NULL REFERENCES cities(id),
  ward_id     UUID REFERENCES wards(id),
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE poll_votes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id     UUID NOT NULL REFERENCES polls(id),
  user_id     UUID NOT NULL REFERENCES users(id),
  option_idx  INTEGER NOT NULL,
  voted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(poll_id, user_id)
);

-- ─── Predictions & Analytics ──────────────────────────────────

CREATE TABLE risk_predictions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id                 UUID NOT NULL REFERENCES cities(id),
  ward_id                 UUID REFERENCES wards(id),
  category                report_category NOT NULL,
  risk_score              NUMERIC(5,2) NOT NULL,
  risk_level              TEXT NOT NULL, -- low|medium|high|critical
  prediction_window_days  INTEGER NOT NULL DEFAULT 30,
  reasoning               TEXT,
  generated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_risk_predictions_city ON risk_predictions(city_id, generated_at DESC);

CREATE TABLE city_index_snapshots (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id             UUID NOT NULL REFERENCES cities(id),
  score               NUMERIC(5,2) NOT NULL,
  sub_scores          JSONB NOT NULL DEFAULT '{}',
  period_start        DATE NOT NULL,
  period_end          DATE NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_city_index_snapshots_city ON city_index_snapshots(city_id, period_end DESC);

-- ─── SOS / Emergency ─────────────────────────────────────────

CREATE TABLE sos_alerts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id),
  location    GEOMETRY(POINT, 4326) NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'active', -- active|acknowledged|closed
  acknowledged_by UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sos_alerts_location ON sos_alerts USING GIST(location);
CREATE INDEX idx_sos_alerts_status ON sos_alerts(status, created_at DESC);

-- ─── Comments / Timeline ─────────────────────────────────────

CREATE TABLE incident_comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES civic_incidents(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  content     TEXT NOT NULL,
  is_official BOOLEAN NOT NULL DEFAULT FALSE, -- from gov/ngo account
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE demand_timeline (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  demand_id   UUID NOT NULL REFERENCES civic_demands(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES users(id),
  stage_from  TEXT,
  stage_to    TEXT NOT NULL,
  note        TEXT,
  evidence    JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Functions & Triggers ─────────────────────────────────────

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_civic_incidents_updated_at
  BEFORE UPDATE ON civic_incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_civic_demands_updated_at
  BEFORE UPDATE ON civic_demands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
