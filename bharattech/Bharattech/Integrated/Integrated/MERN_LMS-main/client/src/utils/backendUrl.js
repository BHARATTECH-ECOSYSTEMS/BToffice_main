const LOCAL_BACKEND_URL = "http://localhost:65535";

export const getBackendUrl = () => {
  const envUrl = import.meta.env.VITE_BACKEND_URL || window?.__env?.VITE_BACKEND_URL;

  if (envUrl && !/localhost|127\.0\.0\.1/i.test(envUrl)) {
    return envUrl.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    const { origin, hostname } = window.location;
    if (hostname && !["localhost", "127.0.0.1"].includes(hostname)) {
      return origin;
    }
  }

  return (envUrl || LOCAL_BACKEND_URL).replace(/\/+$/, "");
};
