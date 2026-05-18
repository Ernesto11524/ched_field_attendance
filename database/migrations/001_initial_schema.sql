-- ============================================================
-- Attendance App - Initial Schema Migration
-- Run this file once to set up the full database
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. WORKERS
-- ============================================================
CREATE TABLE workers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name        VARCHAR(255) NOT NULL,
  phone_number     VARCHAR(20)  NOT NULL,
  email            VARCHAR(255),
  employee_id      VARCHAR(100) NOT NULL UNIQUE,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. WORK SITES
-- ============================================================
CREATE TABLE work_sites (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(255) NOT NULL,
  address             TEXT NOT NULL,
  latitude            DOUBLE PRECISION NOT NULL,
  longitude           DOUBLE PRECISION NOT NULL,
  geofence_radius_m   INT NOT NULL DEFAULT 100,   -- metres
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. WORKER SITE ASSIGNMENTS
-- A worker is assigned to one or more sites for a date range
-- ============================================================
CREATE TABLE worker_site_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id   UUID NOT NULL REFERENCES workers(id)    ON DELETE CASCADE,
  site_id     UUID NOT NULL REFERENCES work_sites(id) ON DELETE CASCADE,
  start_date  DATE NOT NULL,
  end_date    DATE,                    -- NULL means assignment is open-ended
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- A worker should not be assigned to the same site twice in the same period
  CONSTRAINT uq_worker_site_active UNIQUE (worker_id, site_id, start_date)
);

-- ============================================================
-- 4. CHECK-IN WINDOWS (time slots per site)
-- e.g. Morning: 07:30–08:00, Midday: 12:00–12:30, etc.
-- ============================================================
CREATE TABLE checkin_windows (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id      UUID NOT NULL REFERENCES work_sites(id) ON DELETE CASCADE,
  label        VARCHAR(50) NOT NULL,    -- e.g. 'Morning', 'Midday', 'Afternoon', 'Close'
  window_open  TIME NOT NULL,           -- e.g. 07:30
  window_close TIME NOT NULL,           -- e.g. 08:00
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_window_order CHECK (window_close > window_open)
);

-- ============================================================
-- 5. WORKER WEBAUTHN CREDENTIALS (one per registered device)
-- ============================================================
CREATE TABLE worker_credentials (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id      UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  credential_id  TEXT NOT NULL UNIQUE,   -- WebAuthn credential ID (base64url)
  public_key     TEXT NOT NULL,          -- COSE-encoded public key
  sign_count     BIGINT NOT NULL DEFAULT 0,
  device_name    VARCHAR(100),           -- e.g. 'Kwame's Android'
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  registered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. CHECKINS (the core attendance record)
-- ============================================================
CREATE TABLE checkins (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id             UUID NOT NULL REFERENCES workers(id)          ON DELETE CASCADE,
  site_id               UUID NOT NULL REFERENCES work_sites(id)       ON DELETE CASCADE,
  window_id             UUID          REFERENCES checkin_windows(id)  ON DELETE SET NULL,
  credential_id         UUID          REFERENCES worker_credentials(id) ON DELETE SET NULL,

  -- GPS snapshot at time of check-in
  latitude              DOUBLE PRECISION,
  longitude             DOUBLE PRECISION,
  distance_from_site_m  DOUBLE PRECISION,   -- computed server-side using Haversine

  -- Verification flags
  location_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  biometric_verified    BOOLEAN NOT NULL DEFAULT FALSE,

  -- Status: on_time | late | outside_geofence | biometric_failed | overridden | absent
  status                VARCHAR(30) NOT NULL DEFAULT 'pending',

  checked_in_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_in_date       DATE NOT NULL DEFAULT CURRENT_DATE

);

-- ============================================================
-- 7. SUPERVISOR OVERRIDES
-- When GPS/biometrics fail, a supervisor can manually approve
-- ============================================================
CREATE TABLE supervisor_overrides (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id      UUID NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
  supervisor_id   UUID NOT NULL REFERENCES workers(id)  ON DELETE CASCADE,
  reason          TEXT NOT NULL,
  overridden_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. ADMIN USERS (separate from workers — your boss/supervisors)
-- ============================================================
CREATE TABLE admin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'supervisor',  -- supervisor | admin
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES — speeds up the most common queries
-- ============================================================

-- Worker lookups
CREATE INDEX idx_workers_employee_id    ON workers(employee_id);
CREATE INDEX idx_workers_is_active      ON workers(is_active);

-- Assignment lookups (who is assigned to what site today?)
CREATE INDEX idx_assignments_worker_id  ON worker_site_assignments(worker_id);
CREATE INDEX idx_assignments_site_id    ON worker_site_assignments(site_id);
CREATE INDEX idx_assignments_active     ON worker_site_assignments(is_active);

-- Check-in windows per site
CREATE INDEX idx_windows_site_id        ON checkin_windows(site_id);

-- Check-ins (the most queried table)
CREATE INDEX idx_checkins_worker_id     ON checkins(worker_id);
CREATE INDEX idx_checkins_site_id       ON checkins(site_id);
CREATE INDEX idx_checkins_window_id     ON checkins(window_id);
CREATE INDEX idx_checkins_date          ON checkins(checked_in_at);
CREATE INDEX idx_checkins_status        ON checkins(status);

-- Prevent duplicate check-ins: same worker + same window + same day
CREATE UNIQUE INDEX uq_checkin_per_window ON checkins(worker_id, window_id, checked_in_date);

-- Credentials per worker
CREATE INDEX idx_credentials_worker_id  ON worker_credentials(worker_id);
CREATE INDEX idx_credentials_cred_id    ON worker_credentials(credential_id);

-- ============================================================
-- AUTO-UPDATE updated_at via trigger
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_workers_updated_at
  BEFORE UPDATE ON workers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_sites_updated_at
  BEFORE UPDATE ON work_sites
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_admins_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
