const BASE_URL = 'https://cocobod-backend-production.up.railway.app/api';


// ── Helper ────────────────────────────────────────────────
async function request(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong.');
  }

  return data;
}

// ── Auth ──────────────────────────────────────────────────
export const authAPI = {
  // Workers don't "login" — they identify by employee ID
  getWorkerByEmployeeId: (employeeId) =>
    request('GET', `/workers/by-employee-id/${employeeId}`),
};

// ── WebAuthn ──────────────────────────────────────────────
export const webauthnAPI = {
  getRegistrationOptions: (workerId) =>
    request('GET', `/webauthn/register/options/${workerId}`),

  verifyRegistration: (workerId, registrationResponse, deviceName) =>
    request('POST', `/webauthn/register/verify/${workerId}`, {
      body: registrationResponse,
      deviceName,
    }),

  getAuthenticationOptions: (workerId) =>
    request('GET', `/webauthn/authenticate/options/${workerId}`),

  verifyAuthentication: (workerId, authResponse) =>
    request('POST', `/webauthn/authenticate/verify/${workerId}`, authResponse),
};

// ── Check-ins ─────────────────────────────────────────────
export const checkinAPI = {
  submit: (payload, token) =>
    request('POST', '/checkins', payload, token),

  getMyHistory: (workerId, token) =>
    request('GET', `/checkins/worker/${workerId}`, null, token),
};

// ── Sites ─────────────────────────────────────────────────
export const siteAPI = {
  getAll: (token) => request('GET', '/sites', null, token),
  getById: (siteId, token) => request('GET', `/sites/${siteId}`, null, token),
};
