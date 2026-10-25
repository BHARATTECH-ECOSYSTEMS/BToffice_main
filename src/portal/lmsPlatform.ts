import { api } from './api';
import { learningPlatform, readToolLinks } from './toolLinks';

/**
 * The LMS Platform's address when Learning opens it (connected portal + VITE_LMS_PLATFORM_URL), else undefined and the
 * portal's own course pages are used. Fixed for the page's whole life, like `api`.
 */
export const LMS_PLATFORM = learningPlatform(readToolLinks(import.meta.env as Record<string, string | undefined> | undefined), !!api);
