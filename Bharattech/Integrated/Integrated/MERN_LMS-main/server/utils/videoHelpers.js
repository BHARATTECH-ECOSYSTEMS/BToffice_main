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

  const match = trimmedUrl.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/|live\/)|youtu\.be\/)([^"&?\/\s]{11})/i
  );

  return match ? match[1] : null;
};

/**
 * Check if a YouTube URL is valid
 */
export const isValidYouTubeUrl = (url) => {
  return extractYouTubeId(url) !== null;
};
