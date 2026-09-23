const LOCAL_HOSTS = ["localhost", "127.0.0.1"];

export const LMS_PLATFORM_URL =
  "https://bharattech-integrated-mern-lms-main-uk61.onrender.com";
export const FILESYNC_PLATFORM_URL =
  "https://bharattech-filesync.onrender.com";

export const isLocalUrl = (url = "") => /localhost|127\.0\.0\.1/i.test(url);

export const getExternalUrl = (configuredUrl, localUrl, deployedUrl = "") => {
  const isLocalHost = LOCAL_HOSTS.includes(window.location.hostname);

  if (configuredUrl && (isLocalHost || !isLocalUrl(configuredUrl))) {
    return configuredUrl;
  }

  return isLocalHost ? localUrl : deployedUrl;
};

export const buildLmsPlatformUrl = (baseUrl, user, explicitToken, explicitRefresh) => {
  if (!baseUrl) return baseUrl;

  const params = new URLSearchParams();
  if (user?.role) params.set("role", user.role);
  if (user?.email) params.set("email", user.email);
  if (user?.fullName || user?.username)
    params.set("name", user.fullName || user.username);

  const token =
    explicitToken ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token");
  if (token) params.set("token", token);

  const refreshToken =
    explicitRefresh ||
    localStorage.getItem("refresh_token") ||
    sessionStorage.getItem("refresh_token");
  if (refreshToken) params.set("refresh_token", refreshToken);

  if (!params.toString()) return baseUrl;

  try {
    const url = new URL(baseUrl);
    params.forEach((value, key) => url.searchParams.set(key, value));
    return url.toString();
  } catch {
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}${params.toString()}`;
  }
};
