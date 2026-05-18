# Backend API — Setup & Run Guide

## Folder Structure

```
backend/
  server.js                  ← entry point, starts the server
  package.json               ← dependencies
  scripts/
    create-admin.js          ← run once to create your first admin
  src/
    config/
      db.js                  ← database connection
    controllers/
      auth.controller.js     ← login, change password
      worker.controller.js   ← manage workers
      site.controller.js     ← manage work sites & windows
      checkin.controller.js  ← attendance check-ins
      webauthn.controller.js ← biometric registration & auth
      admin.controller.js    ← dashboard & reports
    middleware/
      auth.middleware.js     ← JWT verification
      error.middleware.js    ← global error handler
    routes/
      auth.routes.js
      worker.routes.js
      site.routes.js
      checkin.routes.js
      webauthn.routes.js
      admin.routes.js
    utils/
      haversine.js           ← GPS distance calculator
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/login | Admin login | None |
| POST | /api/auth/change-password | Change password | JWT |

### Workers
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/workers | List all workers | JWT |
| GET | /api/workers/:id | Get one worker | JWT |
| POST | /api/workers | Create worker | Admin |
| PUT | /api/workers/:id | Update worker | Admin |
| DELETE | /api/workers/:id | Deactivate worker | Admin |
| POST | /api/workers/:id/assign | Assign to site | Admin |

### Sites
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/sites | List all sites | JWT |
| GET | /api/sites/:id | Get one site | JWT |
| POST | /api/sites | Create site | Admin |
| PUT | /api/sites/:id | Update site | Admin |
| POST | /api/sites/:id/windows | Add check-in window | Admin |
| DELETE | /api/sites/windows/:id | Remove window | Admin |

### Check-ins
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/checkins | Submit check-in | JWT |
| GET | /api/checkins/today | Today's check-ins | JWT |
| GET | /api/checkins/worker/:id | Worker history | JWT |
| POST | /api/checkins/:id/override | Supervisor override | JWT |

### WebAuthn (Biometrics)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/webauthn/register/options/:workerId | Get registration options | None |
| POST | /api/webauthn/register/verify/:workerId | Verify registration | None |
| GET | /api/webauthn/authenticate/options/:workerId | Get auth options | None |
| POST | /api/webauthn/authenticate/verify/:workerId | Verify biometric | None |

### Admin
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/admin/dashboard | Today's summary | Admin |
| GET | /api/admin/report | Attendance report | Admin |
| POST | /api/admin/create-admin | Create admin user | Admin |
