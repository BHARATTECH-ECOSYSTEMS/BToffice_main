const LOCAL_HOSTS = ["localhost", "127.0.0.1"];

export const OPEN_INTERVIEWER_URL = "http://localhost:3000";
export const LOCAL_INTERVIEW_URL = "http://localhost:3000";

const isLocalUrl = (url = "") => /localhost|127\.0\.0\.1/i.test(url);

export const getInterviewBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_INTERVIEW_URL;
  const isLocalHost = LOCAL_HOSTS.includes(window.location.hostname);

  if (configuredUrl && (isLocalHost || !isLocalUrl(configuredUrl))) {
    return configuredUrl;
  }

  return isLocalHost ? LOCAL_INTERVIEW_URL : OPEN_INTERVIEWER_URL;
};

export const buildFallbackLaunchUrl = (token) => {
  const base = getInterviewBaseUrl().replace(/\/+$/, "");
  const launchUrl = new URL("/login", base);

  launchUrl.searchParams.set("launchToken", token);
  launchUrl.searchParams.set("redirect", "/studies");

  return launchUrl.toString();
};
