-- Migration: Add webauthn_challenges table
-- Run this on your Railway database

CREATE TABLE webauthn_challenges (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id  UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  challenge  TEXT NOT NULL,
  type       VARCHAR(20) NOT NULL,  -- 'registration' or 'authentication'
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_worker_challenge_type UNIQUE (worker_id, type)
);

CREATE INDEX idx_challenges_worker_id ON webauthn_challenges(worker_id);
CREATE INDEX idx_challenges_expires_at ON webauthn_challenges(expires_at);
