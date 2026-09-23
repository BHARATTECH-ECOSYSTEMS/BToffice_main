import { useState, useEffect, useCallback } from "react";
import { getSecurityEvents, getSecurityStats } from "../services/securityService";

const PAGE_SIZE = 20;

/**
 * useSecurityEvents — manages state for the Security Events admin panel.
 *
 * Returns:
 *  events       - current page of injection events
 *  stats        - aggregate stats { total, blocked, sanitized, last24h, ... }
 *  isLoading    - true while fetching
 *  error        - fetch error string or null
 *  total        - total event count matching current filter
 *  page         - current 1-based page
 *  setPage      - navigate to a page
 *  search       - current search term (name / email)
 *  setSearch    - update search
 *  actionFilter - "block" | "sanitize" | "" (all)
 *  setActionFilter
 *  refresh      - manually trigger a reload
 */
export function useSecurityEvents() {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState(""); // "" = all

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const skip = (page - 1) * PAGE_SIZE;
      const [eventsRes, statsRes] = await Promise.all([
        getSecurityEvents({ limit: PAGE_SIZE, skip, search, action: actionFilter }),
        stats ? Promise.resolve(null) : getSecurityStats(), // Only fetch stats once unless forced
      ]);

      setEvents(eventsRes.events ?? []);
      setTotal(eventsRes.total ?? 0);
      if (statsRes) setStats(statsRes);
    } catch (err) {
      setError(err.message || "Failed to load security events");
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, actionFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload stats too on forced refresh
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const skip = (page - 1) * PAGE_SIZE;
      const [eventsRes, statsRes] = await Promise.all([
        getSecurityEvents({ limit: PAGE_SIZE, skip, search, action: actionFilter }),
        getSecurityStats(),
      ]);
      setEvents(eventsRes.events ?? []);
      setTotal(eventsRes.total ?? 0);
      setStats(statsRes);
    } catch (err) {
      setError(err.message || "Failed to refresh security events");
    } finally {
      setIsLoading(false);
    }
  }, [page, search, actionFilter]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, actionFilter]);

  useEffect(() => { load(); }, [load]);

  return {
    events,
    stats,
    isLoading,
    error,
    total,
    page,
    setPage,
    pageSize: PAGE_SIZE,
    search,
    setSearch,
    actionFilter,
    setActionFilter,
    refresh,
  };
}
