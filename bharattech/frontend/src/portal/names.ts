/** The first letters of someone's first two words ("Asha Rao" → "AR"), for an avatar without a photo. */
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
