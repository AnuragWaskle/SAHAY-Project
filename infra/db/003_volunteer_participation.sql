-- ============================================================
-- SAHAY — Volunteer Participation Table
-- Version: 003_volunteer_participation
-- ============================================================

CREATE TABLE IF NOT EXISTS volunteer_participations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  initiative_id   UUID NOT NULL REFERENCES initiatives(id),
  user_id         UUID NOT NULL REFERENCES users(id),
  status          TEXT NOT NULL DEFAULT 'applied',
  -- applied|accepted|rejected|attended|completed|cancelled
  applied_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at     TIMESTAMPTZ,
  attended_at     TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  hours_logged    NUMERIC(6,2),
  feedback        TEXT,
  organizer_feedback TEXT,
  UNIQUE(initiative_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_volunteer_participations_initiative ON volunteer_participations(initiative_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_participations_user ON volunteer_participations(user_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_participations_status ON volunteer_participations(status);
