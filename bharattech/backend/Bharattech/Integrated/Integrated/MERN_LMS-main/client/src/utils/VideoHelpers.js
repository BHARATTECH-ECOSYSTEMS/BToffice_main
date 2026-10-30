/**
 * Extract YouTube video ID from a URL
 * Works with these formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 */
export const extractYouTubeId = (url) => {
  // If nothing provided, return null
  if (!url || typeof url !== "string") return null;

  // Remove any spaces
  const trimmedUrl = url.trim();

  // If it's already just an ID (11 characters), return it
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmedUrl)) {
    return trimmedUrl;
  }

  // Match all standard YouTube URL formats (watch, youtu.be, embed, shorts, live) with params (?si=, &t=, etc.)
  const match = trimmedUrl.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/|live\/)|youtu\.be\/)([^"&?\/\s]{11})/i
  );

  return match ? match[1] : null;
};

/**
 * Check if a YouTube URL is valid
 */
export const isValidYouTubeUrl = (url) => {
  const videoId = extractYouTubeId(url);
  return videoId !== null;
};

/**
 * Get thumbnail URL for a YouTube video
 */
export const getYouTubeThumbnail = (url) => {
  const videoId = extractYouTubeId(url);

  if (!videoId) return null;

  // YouTube thumbnail URL format
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
};
