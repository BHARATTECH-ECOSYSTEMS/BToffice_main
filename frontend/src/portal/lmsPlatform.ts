import { api } from './api';
import { learningPlatform, readToolLinks } from './toolLinks';

/**
 * The LMS Platform's address when Learning opens it (connected portal + VITE_LMS_PLATFORM_URL), else undefined and the
 * portal's own course pages are used. Fixed for the page's whole life, like `api`.
 */
const links = readToolLinks(import.meta.env as Record<string, string | undefined> | undefined);
export const LMS_PLATFORM = learningPlatform(links, !!api);

/** The LMS Platform's server, for "My learning" on the dashboard; only alongside the platform itself. */
export const LMS_API = LMS_PLATFORM ? links.lmsApi : undefined;
