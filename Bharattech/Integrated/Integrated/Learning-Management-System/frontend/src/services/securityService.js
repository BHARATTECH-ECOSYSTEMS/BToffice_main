// Security Service — SecuPrompt injection event queries (admin-only)
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const getAuthToken = () =>
  localStorage.getItem("authToken") ||
  localStorage.getItem("token") ||
  localStorage.getItem("accessToken") ||
  localStorage.getItem("jwt");

const getHeaders = () => {
  const token = getAuthToken();
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers["x-demo-role"] =
      localStorage.getItem("userRole") ||
      localStorage.getItem("role") ||
      "admin";
  }
  return headers;
};

/**
 * Fetch paginated prompt-injection events.
 * Admin / Superadmin only — backend enforces this.
 *
 * @param {{ limit?: number, skip?: number, action?: string, search?: string, from?: string, to?: string }} params
 * @returns {{ events: object[], total: number, limit: number, skip: number, page: number }}
 */
export async function getSecurityEvents(params = {}) {
  const query = new URLSearchParams();
  if (params.limit != null)  query.set("limit",  params.limit);
  if (params.skip  != null)  query.set("skip",   params.skip);
  if (params.action)         query.set("action", params.action);
  if (params.search)         query.set("search", params.search);
  if (params.from)           query.set("from",   params.from);
  if (params.to)             query.set("to",     params.to);

  const qs = query.toString();
  const res = await fetch(
    `${API_BASE_URL}/ai-assistant/security-events${qs ? `?${qs}` : ""}`,
    { headers: getHeaders() }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Fetch aggregate SecuPrompt statistics.
 * Admin / Superadmin only.
 *
 * @returns {{ total: number, blocked: number, sanitized: number, last24h: number, last7d: number, last30d: number, topOffenders: object[] }}
 */
export async function getSecurityStats() {
  const res = await fetch(
    `${API_BASE_URL}/ai-assistant/security-stats`,
    { headers: getHeaders() }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  return res.json();
}
