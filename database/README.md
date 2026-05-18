# Database Setup

## Requirements
- PostgreSQL 14 or higher

## Setup Steps

### 1. Create the database
```bash
psql -U postgres
CREATE DATABASE attendance_db;
\q
```

### 2. Run the migration (creates all tables)
```bash
psql -U postgres -d attendance_db -f migrations/001_initial_schema.sql
```

### 3. Seed with sample data (development only — do NOT run in production)
```bash
psql -U postgres -d attendance_db -f seeds/001_seed_data.sql
```

### 4. Verify tables were created
```bash
psql -U postgres -d attendance_db -c "\dt"
```

You should see:
```
 admin_users
 checkin_windows
 checkins
 supervisor_overrides
 worker_credentials
 worker_site_assignments
 workers
 work_sites
```

---

## Tables Overview

| Table | Purpose |
|---|---|
| `workers` | All field workers |
| `work_sites` | GPS locations with geofence radius |
| `worker_site_assignments` | Which worker is assigned to which site |
| `checkin_windows` | Daily time slots (Morning, Midday, Afternoon, Close) |
| `checkins` | Every check-in attempt with GPS + biometric result |
| `worker_credentials` | WebAuthn device keys for biometric auth |
| `supervisor_overrides` | Manual approvals when GPS/biometrics fail |
| `admin_users` | Your boss, supervisors, and admins |

---

## Environment Variable
Set this in your backend `.env` file:
```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/attendance_db
```
