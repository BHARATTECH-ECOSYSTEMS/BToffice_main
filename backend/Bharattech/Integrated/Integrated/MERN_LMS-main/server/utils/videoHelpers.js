const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "youtube-nocookie.com", "www.youtube-nocookie.com"]);

/**
 * Extract YouTube video ID from any valid YouTube URL
 */
export const extractYouTubeId = (url) => {
  if (!url || typeof url !== "string") return null;

  const trimmedUrl = url.trim();

  // If already an 11-character video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmedUrl)) {
    return trimmedUrl;
  }

  // the link's own address must be YouTube's: "youtube.com/…" inside another site's link isn't a YouTube link
  let link;
  try {
    link = new URL(/^[a-z][a-z0-9+.-]*:/i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(link.protocol) || !YOUTUBE_HOSTS.has(link.hostname.toLowerCase())) return null;

  const match = `${link.hostname}${link.pathname}${link.search}`.match(
    /(?:youtube(?:-nocookie)?\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/|live\/)|youtu\.be\/)([^"&?\/\s]{11})/i
  );

  return match ? match[1] : null;
};

/**
 * Check if a YouTube URL is valid
 */
export const isValidYouTubeUrl = (url) => {
  return extractYouTubeId(url) !== null;
};
