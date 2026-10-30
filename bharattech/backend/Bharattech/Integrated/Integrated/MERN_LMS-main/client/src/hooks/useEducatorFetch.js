import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useAppConfig } from "../context/AppContext";
import { refreshWhileVisible } from "../utils/visibleRefresh";

/**
 * One educator API read (`read` picks what the page needs from the reply; keep it outside the component). With
 * `refresh`, it is read again every 15 s while the tab is in view. A failed refresh keeps what is on screen (the old
 * pages swapped real figures for zeros on any hiccup); only a first load that fails shows as failed.
 */
export function useEducatorFetch(path, read, { refresh = false } = {}) {
  const { backendUrl } = useAppConfig();
  const { isEducator, getToken } = useAuth();
  const [state, setState] = useState({ status: "loading", data: null });

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get(`${backendUrl}${path}`, { headers: { Authorization: `Bearer ${token}` } });
      if (data?.status !== "success") throw new Error("unexpected reply");
      setState({ status: "ready", data: read(data.data) });
    } catch {
      setState((before) => (before.status === "ready" ? before : { status: "failed", data: null }));
    }
  }, [backendUrl, getToken, path, read]);

  useEffect(() => {
    if (!isEducator) {
      setState({ status: "ready", data: read(null) });
      return undefined;
    }
    load();
    return refresh ? refreshWhileVisible(load) : undefined;
  }, [load, isEducator, refresh, read]);

  return { ...state, retry: load };
}
