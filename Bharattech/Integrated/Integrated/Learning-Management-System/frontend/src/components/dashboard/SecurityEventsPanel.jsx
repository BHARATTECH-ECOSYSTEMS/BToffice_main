import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldX,
  ShieldCheck,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Eye,
  EyeOff,
  Filter,
} from "lucide-react";
import { useSecurityEvents } from "../../hooks/useSecurityEvents";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function riskColor(risk) {
  if (risk >= 0.8) return "text-red-600 bg-red-50 border-red-200";
  if (risk >= 0.5) return "text-orange-600 bg-orange-50 border-orange-200";
  return "text-yellow-600 bg-yellow-50 border-yellow-200";
}

function riskLabel(risk) {
  if (risk >= 0.8) return "Critical";
  if (risk >= 0.5) return "High";
  return "Medium";
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function initials(name, email) {
  const src = name || email || "?";
  return src
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function avatarColor(str) {
  const colors = [
    "bg-red-500", "bg-orange-500", "bg-pink-500",
    "bg-purple-500", "bg-indigo-600", "bg-rose-500",
  ];
  let hash = 0;
  for (const ch of str) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 shadow-sm">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value ?? "—"}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );
}

// ─── Event Row ────────────────────────────────────────────────────────────────

function EventRow({ event }) {
  const [expanded, setExpanded] = useState(false);
  const name = event.userName || event.userEmail || "Unknown User";
  const email = event.userEmail || "";
  const isBlock = event.action === "block";

  return (
    <div className={`rounded-xl border transition-all duration-200 ${isBlock ? "border-red-200 bg-red-50/30" : "border-orange-200 bg-orange-50/20"} p-4 mb-2`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">

        {/* Avatar + Identity */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 ${avatarColor(name)}`}>
            {initials(name, email)}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 text-sm truncate">{name}</div>
            {email && <div className="text-xs text-gray-400 truncate">{email}</div>}
          </div>
        </div>

        {/* Action Badge */}
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0 ${isBlock ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
          {isBlock ? <ShieldX className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
          {isBlock ? "BLOCKED" : "SANITIZED"}
        </span>

        {/* Risk Badge */}
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border flex-shrink-0 ${riskColor(event.risk)}`}>
          {riskLabel(event.risk)} · {Math.round(event.risk * 100)}%
        </span>

        {/* Time */}
        <span
          className="text-xs text-gray-400 flex-shrink-0 cursor-help"
          title={new Date(event.createdAt).toLocaleString()}
        >
          {timeAgo(event.createdAt)}
        </span>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex-shrink-0 p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white transition-colors"
          title={expanded ? "Hide details" : "Show details"}
        >
          {expanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-dashed border-gray-200 space-y-2">

          {/* Flagged text */}
          {event.flaggedText && (
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-400" /> Flagged prompt
              </div>
              <div className="bg-gray-900 text-orange-300 text-xs rounded-lg px-3 py-2 font-mono break-all">
                {event.flaggedText}
              </div>
            </div>
          )}

          {/* Reasons */}
          {event.reasons?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-1">Detection reasons</div>
              <div className="flex flex-wrap gap-1.5">
                {event.reasons.map((r, i) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Module scores */}
          {event.modules && (
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-1">Module scores</div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {Object.entries(event.modules).map(([mod, val]) => {
                  const score = typeof val === "object" ? val.score : val;
                  const pct = Math.round((score ?? 0) * 100);
                  return (
                    <div key={mod} className="text-center">
                      <div className="text-xs text-gray-400 capitalize mb-0.5">{mod}</div>
                      <div className={`text-sm font-bold ${pct >= 70 ? "text-red-600" : pct >= 40 ? "text-orange-500" : "text-gray-400"}`}>
                        {pct}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Endpoint */}
          {event.endpoint && (
            <div className="text-xs text-gray-400">
              Endpoint: <span className="font-mono text-gray-600">{event.endpoint}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export default function SecurityEventsPanel() {
  const {
    events, stats, isLoading, error, total,
    page, setPage, pageSize,
    search, setSearch,
    actionFilter, setActionFilter,
    refresh,
  } = useSecurityEvents();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mt-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">AI Security Events</h2>
            <p className="text-xs text-gray-500">Prompt injection attempts detected by SecuPrompt</p>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatCard label="Total Events" value={stats.total} icon={ShieldAlert} color="bg-gray-700" />
          <StatCard label="Blocked" value={stats.blocked} icon={ShieldX} color="bg-red-500" />
          <StatCard label="Sanitized" value={stats.sanitized} icon={ShieldCheck} color="bg-orange-500" />
          <StatCard label="Last 24h" value={stats.last24h} icon={AlertTriangle} color="bg-purple-500" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-200"
          >
            <option value="">All actions</option>
            <option value="block">Blocked only</option>
            <option value="sanitize">Sanitized only</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && events.length === 0 && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && events.length === 0 && !error && (
        <div className="text-center py-16 text-gray-400">
          <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-green-300" />
          <div className="font-semibold text-gray-500">No injection events found</div>
          <div className="text-sm mt-1">
            {search || actionFilter ? "Try clearing your filters." : "All users are behaving correctly — great!"}
          </div>
        </div>
      )}

      {/* Events list */}
      {events.length > 0 && (
        <div>
          {events.map((ev) => (
            <EventRow key={ev._id} event={ev} />
          ))}

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <div className="text-xs text-gray-400">
              {total} event{total !== 1 ? "s" : ""} · Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
