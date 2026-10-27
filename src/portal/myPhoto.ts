import { useEffect, useSyncExternalStore } from 'react';
import { api } from './api';
import { photoSource, type PhotoSource } from './profile';
import { setPhoto as setBrowserPhoto, useSession } from './session';

/**
 * The signed-in person's own photo, shared by the top bar, the dashboard card, Profile and Settings, so it is fetched
 * once and a change shows everywhere at once. Connected, it is the photo saved to their account (PUT/DELETE
 * /api/user/me/photo); with the demo sign-in, the one kept in this browser (session.ts).
 */

interface MyPhoto {
  /** Whose photo this is, so a new sign-in never shows the last person's. */
  email: string;
  /** An address an <img> can show: a blob: made from the stored photo, or a full web address. */
  url?: string;
}

let state: MyPhoto = { email: '' };
// a photo that didn't load is tried again after this long (the bell asks again every minute too)
const PHOTO_RETRY_MS = 60_000;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => (listeners.add(listener), () => listeners.delete(listener));

function set(next: MyPhoto) {
  if (state.url?.startsWith('blob:') && state.url !== next.url) URL.revokeObjectURL(state.url);
  state = next;
  listeners.forEach((l) => l());
}

async function show(source: PhotoSource | undefined, email: string) {
  if (!source || source.kind === 'web') return set({ email, url: source?.url });
  // a stored photo needs the sign-in token, which an <img> can't send, so it's fetched and shown from memory
  const blob = await api!.getFile(source.path);
  if (state.email === email) set({ email, url: URL.createObjectURL(blob) });
}

async function load(email: string) {
  set({ email });
  try {
    const me = await api!.get<{ profilePicture?: unknown }>('/user/me');
    await show(photoSource(me.profilePicture), email);
  } catch (error) {
    // the initials stand in for a photo that didn't load; Profile and the dashboard say when the account itself didn't
    console.warn('Your photo did not load:', error);
    window.setTimeout(() => state.email === email && !state.url && void load(email), PHOTO_RETRY_MS);
  }
}

/** The photo to show for the signed-in person, or undefined for their initials. */
export function useMyPhoto(): string | undefined {
  const session = useSession();
  const current = useSyncExternalStore(subscribe, () => state);
  const email = session?.email ?? '';
  const browserPhoto = session?.photo;
  useEffect(() => {
    if (!api || !email) return;
    // a photo kept in this browser from before is replaced by the account's, everywhere
    if (browserPhoto) setBrowserPhoto(undefined);
    if (state.email !== email) void load(email);
  }, [email, browserPhoto]);
  if (!api) return browserPhoto;
  return current.email === email ? current.url : undefined;
}

/** Saves `photo` (the square JPEG made in Settings) to the account. Throws an ApiError when the backend refuses. */
export async function saveMyPhoto(photo: Blob) {
  const form = new FormData();
  form.append('photo', photo, 'photo.jpg');
  const me = await api!.putForm<{ profilePicture?: unknown }>('/user/me/photo', form);
  await show(photoSource(me.profilePicture), state.email);
}

export async function removeMyPhoto() {
  await api!.del('/user/me/photo');
  set({ email: state.email });
}
