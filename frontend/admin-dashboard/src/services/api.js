const BASE = 'https://cocobod-backend-production.up.railway.app/api';

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

export const authAPI = {
  login: (email, password) => req('POST', '/auth/login', { email, password }),
};

export const adminAPI = {
  getDashboard:   (token)              => req('GET',  '/admin/dashboard',     null,   token),
  getReport:      (token, params)      => req('GET',  `/admin/report?${new URLSearchParams(params)}`, null, token),
  createAdmin:    (token, data)        => req('POST', '/admin/create-admin',  data,   token),
};

export const workerAPI = {
  getAll:         (token)              => req('GET',  '/workers',             null,   token),
  create:         (token, data)        => req('POST', '/workers',             data,   token),
  update:         (token, id, data)    => req('PUT',  `/workers/${id}`,       data,   token),
  deactivate:     (token, id)          => req('DELETE', `/workers/${id}`,     null,   token),
  assign:         (token, id, data)    => req('POST', `/workers/${id}/assign`, data,  token),
};

export const siteAPI = {
  getAll:         (token)              => req('GET',  '/sites',               null,   token),
  create:         (token, data)        => req('POST', '/sites',               data,   token),
  update:         (token, id, data)    => req('PUT',  `/sites/${id}`,         data,   token),
  addWindow:      (token, id, data)    => req('POST', `/sites/${id}/windows`, data,   token),
  removeWindow:   (token, wid)         => req('DELETE', `/sites/windows/${wid}`, null, token),
};

export const checkinAPI = {
  getToday:       (token, siteId)      => req('GET',  `/checkins/today${siteId ? `?site_id=${siteId}` : ''}`, null, token),
  override:       (token, id, reason)  => req('POST', `/checkins/${id}/override`, { reason }, token),
};
