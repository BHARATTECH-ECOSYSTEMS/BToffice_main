import type { createApi } from './api';
import { canEditPerson, roleLabel, type AccountRole } from './people';
import { photoSource, type PhotoSource } from './profile';

/*
 * Photos picked in the browser: your own in Settings, or someone else's in People → Details (admins, by the same
 * rule as the rest of their details). Both are cut to the same square JPEG before they're sent.
 */

export const PHOTO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const PHOTO_MAX_MB = 5;
// stored as a square big enough to stay sharp on the dashboard's profile card (~380px wide) and the ID card on
// high-density screens, yet small enough for browser storage (a JPEG of roughly 60-100 KB)
const PHOTO_SIZE = 640;

/** Why `file` can't be a photo, or '' when it can. */
export const photoFileProblem = (file: File) =>
  !PHOTO_TYPES.includes(file.type) ? 'Choose a PNG, JPG or WebP image.' : file.size > PHOTO_MAX_MB * 1024 * 1024 ? `Choose an image under ${PHOTO_MAX_MB} MB.` : '';

/** The middle square of the picked image, drawn at the stored size. */
export function toSquare(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = PHOTO_SIZE;
      canvas.getContext('2d')!.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => (URL.revokeObjectURL(url), reject(new Error('unreadable image')));
    img.src = url;
  });
}

export const toJpeg = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('unreadable image'))), 'image/jpeg', 0.85));

/** Why `actor` can't change this person's photo in People → Details, or '' when they can. */
export function personPhotoProblem(actor: AccountRole, target: AccountRole, isSelf: boolean): string {
  if (isSelf) return 'Change your own photo in Settings.';
  if (!canEditPerson(actor, target)) return `Your role can't change the photo of ${roleLabel(target).toLowerCase()} accounts`;
  return '';
}

/** Someone else's photo: what is saved, a new one, or none. The backend tells them in their bell. */
export function personPhotoCalls(client: ReturnType<typeof createApi>) {
  const path = (id: string) => `/user/${encodeURIComponent(id)}`;
  return {
    load: async (id: string): Promise<PhotoSource | undefined> => photoSource((await client.get<{ profilePicture?: unknown } | null>(path(id)))?.profilePicture),
    /** `jpeg` is the square made by toSquare + toJpeg; the edit route keeps only this file from the form. */
    save: async (id: string, jpeg: Blob): Promise<PhotoSource | undefined> => {
      const form = new FormData();
      form.append('profilePicture', jpeg, 'photo.jpg');
      return photoSource((await client.putForm<{ profilePicture?: unknown } | null>(path(id), form))?.profilePicture);
    },
    remove: async (id: string) => void (await client.del(`${path(id)}/photo`)),
  };
}
