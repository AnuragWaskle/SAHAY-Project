-- ============================================================
-- SAHAY — Business Economy Layer
-- Version: 004_business_economy
-- Civic Credits, Rewards, CSR, Revenue, AI Tracking, Fraud
-- ============================================================

-- ─── CIVIC CREDITS LEDGER (immutable transaction log) ────────────
CREATE TABLE IF NOT EXISTS civic_credits_ledger (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id),
  action          TEXT NOT NULL,
  credits         INTEGER NOT NULL,
  balance_after   INTEGER NOT NULL,
  reason          TEXT NOT NULL,
  source_type     TEXT, -- 'report', 'verification', 'mission', 'volunteer', 'contribution', 'referral', 'campaign', 'redemption', 'admin_adjustment'
  source_id       UUID,
  verification_state TEXT NOT NULL DEFAULT 'verified', -- 'pending', 'verified', 'revoked'
  fraud_risk      TEXT NOT NULL DEFAULT 'none', -- 'none', 'low', 'medium', 'high', 'blocked'
  campaign_id     UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credits_ledger_user ON civic_credits_ledger(user_id);
CREATE INDEX idx_credits_ledger_created ON civic_credits_ledger(created_at DESC);
CREATE INDEX idx_credits_ledger_source ON civic_credits_ledger(source_type, source_id);

-- ─── CIVIC TRUST SCORE ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS civic_trust_scores (
  user_id              UUID PRIMARY KEY REFERENCES users(id),
  score                NUMERIC(5,2) NOT NULL DEFAULT 50.0,
  report_validity_rate NUMERIC(5,2) DEFAULT 0,
  evidence_quality_avg NUMERIC(5,2) DEFAULT 0,
  duplicate_rate       NUMERIC(5,2) DEFAULT 0,
  verification_accuracy NUMERIC(5,2) DEFAULT 0,
  moderation_flags     INTEGER DEFAULT 0,
  successful_missions  INTEGER DEFAULT 0,
  total_actions        INTEGER DEFAULT 0,
  last_computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── REWARD RULES (admin-configurable) ───────────────────────────
CREATE TABLE IF NOT EXISTS reward_rules (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action          TEXT NOT NULL UNIQUE,
  label           TEXT NOT NULL,
  base_points     INTEGER NOT NULL,
  trust_multiplier BOOLEAN NOT NULL DEFAULT true,
  daily_limit     INTEGER DEFAULT 100,
  cooldown_seconds INTEGER DEFAULT 0,
  min_trust_score NUMERIC(5,2) DEFAULT 0,
  requires_verification BOOLEAN NOT NULL DEFAULT false,
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default rules
INSERT INTO reward_rules (action, label, base_points, requires_verification, daily_limit) VALUES
  ('report_submitted', 'Submit valid report', 5, false, 10),
  ('report_with_evidence', 'Report with useful evidence', 8, false, 10),
  ('report_verified_incident', 'Report becomes verified incident', 20, true, 50),
  ('verification_helpful', 'Helpful verification', 10, true, 20),
  ('mission_participate', 'Participate in civic mission', 25, false, 5),
  ('volunteer_complete', 'Complete volunteer activity', 50, true, 3),
  ('resolution_verify', 'Help verify resolution', 15, false, 10),
  ('initiative_success', 'Successful initiative participation', 100, true, 5),
  ('referral_active', 'Refer active citizen', 10, true, 5),
  ('community_contribution', 'Useful community information', 5, false, 20)
ON CONFLICT (action) DO NOTHING;

-- ─── REWARD MARKETPLACE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reward_catalog (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  description     TEXT NOT NULL,
  category        TEXT NOT NULL, -- 'voucher', 'certificate', 'experience', 'environmental', 'education', 'partner'
  credits_required INTEGER NOT NULL,
  monetary_value  NUMERIC(10,2),
  sponsor_id      UUID,
  availability    INTEGER DEFAULT -1, -- -1 = unlimited
  claimed_count   INTEGER NOT NULL DEFAULT 0,
  eligibility_min_level INTEGER DEFAULT 1,
  eligibility_min_trust NUMERIC(5,2) DEFAULT 0,
  image_url       TEXT,
  expires_at      TIMESTAMPTZ,
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── REWARD REDEMPTIONS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id),
  reward_id       UUID NOT NULL REFERENCES reward_catalog(id),
  credits_spent   INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'fulfilled', 'cancelled', 'expired'
  fulfilled_at    TIMESTAMPTZ,
  redemption_code TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_redemptions_user ON reward_redemptions(user_id);

-- ─── SPONSOR PROFILES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sponsor_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  legal_name      TEXT,
  company_type    TEXT, -- 'private_ltd', 'public_ltd', 'psu', 'mnc', 'startup', 'foundation'
  sector          TEXT,
  cin_number      TEXT,
  contact_name    TEXT NOT NULL,
  contact_email   TEXT NOT NULL,
  contact_phone   TEXT,
  website         TEXT,
  logo_url        TEXT,
  description     TEXT,
  csr_budget_annual NUMERIC(12,2),
  focus_areas     TEXT[],
  operating_cities UUID[],
  verification_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'verified', 'suspended'
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SPONSORED CAMPAIGNS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sponsored_campaigns (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sponsor_id      UUID NOT NULL REFERENCES sponsor_profiles(id),
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  objective       TEXT,
  category        TEXT NOT NULL,
  budget          NUMERIC(12,2) NOT NULL,
  reward_pool     NUMERIC(12,2) NOT NULL DEFAULT 0,
  allocated_rewards NUMERIC(12,2) NOT NULL DEFAULT 0,
  city_id         UUID REFERENCES cities(id),
  target_wards    UUID[],
  target_participants INTEGER DEFAULT 100,
  actual_participants INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'pending_review', 'approved', 'active', 'completed', 'cancelled'
  start_date      DATE,
  end_date        DATE,
  evidence_requirements TEXT[],
  impact_metrics  JSONB DEFAULT '{}',
  ngo_partner_id  UUID REFERENCES organizations(id),
  initiative_id   UUID REFERENCES initiatives(id),
  admin_notes     TEXT,
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaigns_sponsor ON sponsored_campaigns(sponsor_id);
CREATE INDEX idx_campaigns_status ON sponsored_campaigns(status);

-- ─── CAMPAIGN PARTICIPATION ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_participants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id     UUID NOT NULL REFERENCES sponsored_campaigns(id),
  user_id         UUID NOT NULL REFERENCES users(id),
  status          TEXT NOT NULL DEFAULT 'joined', -- 'joined', 'active', 'evidence_submitted', 'verified', 'rewarded', 'disqualified'
  evidence_urls   TEXT[],
  evidence_note   TEXT,
  credits_earned  INTEGER DEFAULT 0,
  monetary_reward NUMERIC(10,2) DEFAULT 0,
  verified_at     TIMESTAMPTZ,
  rewarded_at     TIMESTAMPTZ,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, user_id)
);

CREATE INDEX idx_campaign_participants_campaign ON campaign_participants(campaign_id);
CREATE INDEX idx_campaign_participants_user ON campaign_participants(user_id);

-- ─── CSR CONTRIBUTIONS (monetary) ────────────────────────────────
CREATE TABLE IF NOT EXISTS csr_contributions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sponsor_id      UUID NOT NULL REFERENCES sponsor_profiles(id),
  campaign_id     UUID REFERENCES sponsored_campaigns(id),
  initiative_id   UUID REFERENCES initiatives(id),
  amount          NUMERIC(12,2) NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'successful', 'failed', 'refunded', 'cancelled'
  transaction_ref TEXT,
  payment_method  TEXT,
  receipt_url     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_csr_contributions_sponsor ON csr_contributions(sponsor_id);

-- ─── AI OPERATIONS LOG ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_operations_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task            TEXT NOT NULL, -- 'classification', 'clustering', 'duplicate_detection', 'priority', 'summarization', 'moderation', 'verification', 'prediction'
  model           TEXT,
  provider        TEXT DEFAULT 'nvidia_nemotron',
  entity_type     TEXT, -- 'report', 'incident', 'demand', 'initiative'
  entity_id       UUID,
  success         BOOLEAN NOT NULL,
  latency_ms      INTEGER,
  confidence      NUMERIC(5,2),
  tokens_used     INTEGER,
  estimated_cost  NUMERIC(8,6),
  error_code      TEXT,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_ops_task ON ai_operations_log(task);
CREATE INDEX idx_ai_ops_created ON ai_operations_log(created_at DESC);

-- ─── REVENUE RECORDS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS revenue_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_type     TEXT NOT NULL, -- 'csr_platform_fee', 'municipal_saas', 'ngo_premium', 'impact_analytics', 'sponsorship_fee'
  customer_type   TEXT NOT NULL, -- 'sponsor', 'municipality', 'ngo', 'enterprise'
  customer_id     UUID,
  customer_name   TEXT NOT NULL,
  amount          NUMERIC(12,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'INR',
  status          TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'invoiced', 'paid', 'overdue', 'cancelled'
  invoice_ref     TEXT,
  period_start    DATE,
  period_end      DATE,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_revenue_source ON revenue_records(source_type);
CREATE INDEX idx_revenue_status ON revenue_records(status);

-- ─── FRAUD FLAGS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fraud_flags (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id),
  flag_type       TEXT NOT NULL, -- 'duplicate_report', 'repeated_image', 'suspicious_timing', 'repeated_text', 'abnormal_activity', 'coordinated_manipulation', 'fake_engagement'
  severity        TEXT NOT NULL DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
  description     TEXT NOT NULL,
  evidence        JSONB DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'reviewed', 'confirmed', 'dismissed'
  action_taken    TEXT, -- 'warning', 'credits_revoked', 'suspended', 'none'
  reviewed_by     UUID REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fraud_flags_user ON fraud_flags(user_id);
CREATE INDEX idx_fraud_flags_status ON fraud_flags(status);

-- ─── REFERRALS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id     UUID NOT NULL REFERENCES users(id),
  referred_id     UUID NOT NULL REFERENCES users(id),
  referral_code   TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'registered', -- 'registered', 'active', 'rewarded'
  rewarded_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_code ON referrals(referral_code);

-- ─── ADD credits balance to users table ──────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS civic_credits INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trust_score NUMERIC(5,2) NOT NULL DEFAULT 50.0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id);

-- ─── IMPACT REPORTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS impact_reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id     UUID REFERENCES sponsored_campaigns(id),
  initiative_id   UUID REFERENCES initiatives(id),
  sponsor_id      UUID REFERENCES sponsor_profiles(id),
  title           TEXT NOT NULL,
  summary         TEXT,
  citizens_engaged INTEGER DEFAULT 0,
  locations_improved INTEGER DEFAULT 0,
  volunteer_hours NUMERIC(8,1) DEFAULT 0,
  people_reached_estimate INTEGER DEFAULT 0,
  evidence_count  INTEGER DEFAULT 0,
  verification_confidence NUMERIC(5,2),
  before_evidence TEXT[],
  after_evidence  TEXT[],
  outcomes        JSONB DEFAULT '{}',
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
