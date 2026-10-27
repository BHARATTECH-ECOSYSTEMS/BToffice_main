/** A web address starting with http:// or https://, as the browser writes it; null when it isn't one. */
export const webLink = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
};
