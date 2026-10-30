import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useAppConfig } from "../context/AppContext";

/**
 * The signed-in person's courses with how far they are (GET /api/user/learning, unfinished first): one request for
 * Home's "Continue learning" and My courses, instead of one progress request per course.
 */
export function useMyLearning() {
  const { getToken, isLoggedIn } = useAuth();
  const { backendUrl } = useAppConfig();
  const [state, setState] = useState({ status: "loading", courses: [] });

  const load = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const token = await getToken();
      const { data } = await axios.get(`${backendUrl}/api/user/learning`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setState({ status: "ready", courses: Array.isArray(data?.data?.courses) ? data.data.courses : [] });
    } catch {
      setState((before) => ({ status: "failed", courses: before.courses }));
    }
  }, [backendUrl, getToken, isLoggedIn]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, retry: load };
}
