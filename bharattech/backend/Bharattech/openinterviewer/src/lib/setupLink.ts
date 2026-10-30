import { StudyConfig } from '@/types';

// Saving a study and making its candidate link from the setup screen. A link only works while its study is stored
// (api/participant-token), and the setup screen used to make links for studies it hadn't saved, so every such link
// opened as "Invalid or expired link". Now the study is saved first, or its changes updated (owner's 1A, 2026-10-27).

type SavedStudy = { id: string; config: StudyConfig };

/** 'auth': the researcher session ended; 'cancelled': the researcher chose not to change a study with interviews. */
export type SetupFailure = { ok: false; error: string };

const STORAGE_MISSING = 'Storage not configured. Please set MONGODB_URI in your environment.';
const NETWORK_ERROR = 'Network error. Please check your connection and try again.';

const errorOf = async (response: Response, fallback: string) => {
  const data = await response.json().catch(() => ({}));
  return (data as { error?: string }).error || fallback;
};

export async function saveStudyConfig({
  config,
  savedStudyId,
  confirm,
  fetchImpl = fetch
}: {
  config: StudyConfig;
  savedStudyId: string | null;
  /** asked with the server's warning when the study already has interviews */
  confirm: (warning: string) => boolean;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: true; study: SavedStudy } | SetupFailure> {
  const send = (confirmed?: boolean) =>
    fetchImpl(savedStudyId ? `/api/studies/${savedStudyId}` : '/api/studies', {
      method: savedStudyId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(confirmed ? { config, confirmed } : { config })
    });

  try {
    let response = await send();

    if (response.status === 409) {
      const data = await response.json().catch(() => ({}));
      if (!data.requiresConfirmation) return { ok: false, error: data.error || 'Failed to save study. Please try again.' };
      if (!confirm(data.warning)) return { ok: false, error: 'cancelled' };
      response = await send(true);
    }

    if (response.status === 401) return { ok: false, error: 'auth' };
    if (response.status === 503) return { ok: false, error: STORAGE_MISSING };
    if (!response.ok) return { ok: false, error: await errorOf(response, 'Failed to save study. Please try again.') };

    const data = await response.json();
    return { ok: true, study: data.study };
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }
}

/** The candidate link for the study on the setup screen; `study` is the saved study when it had to be saved first. */
export async function createSetupLink({
  config,
  savedStudyId,
  isDirty,
  confirm,
  fetchImpl = fetch
}: {
  config: StudyConfig;
  savedStudyId: string | null;
  isDirty: boolean;
  confirm: (warning: string) => boolean;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: true; url: string; study: SavedStudy | null } | SetupFailure> {
  let study: SavedStudy | null = null;

  if (!savedStudyId || isDirty) {
    const saved = await saveStudyConfig({ config, savedStudyId, confirm, fetchImpl });
    if (!saved.ok) return saved;
    study = saved.study;
  }

  try {
    const response = await fetchImpl('/api/generate-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studyConfig: study ? study.config : config })
    });

    if (response.status === 401) return { ok: false, error: 'auth' };
    if (!response.ok) return { ok: false, error: await errorOf(response, 'Failed to generate link') };

    const data = await response.json();
    return { ok: true, url: data.url, study };
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }
}
