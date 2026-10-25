import type { Tool } from './data';

/**
 * The addresses of the company tools that have one, from the site settings (.env.local on a laptop, the host's settings
 * when deployed), so test and live can point at different servers. A tool without an address stays "Not connected yet".
 * The setting names match the company frontend's where it has them (VITE_WORKSPACE_URL, VITE_LIBRECHAT_URL).
 */
export interface ToolLinks {
  workspace?: string;
  librechat?: string;
  hrms?: string;
  fileTransfer?: string;
  coderInstaller?: string;
  /** MERN LMS, the company's course platform (signs people in on Keycloak's own page). */
  lmsPlatform?: string;
}

const SETTINGS: Record<keyof ToolLinks, string> = {
  workspace: 'VITE_WORKSPACE_URL',
  librechat: 'VITE_LIBRECHAT_URL',
  hrms: 'VITE_HRMS_URL',
  fileTransfer: 'VITE_FILE_TRANSFER_URL',
  coderInstaller: 'VITE_CODER_INSTALLER_URL',
  lmsPlatform: 'VITE_LMS_PLATFORM_URL',
};

/**
 * Opens the BharatTech desktop app. Deliberately without a sign-in token: the company frontend puts the token in this
 * link, where the operating system can keep or log it. The app doesn't read the link or sign in at all (it only opens).
 */
export const CODER_APP_URL = 'bharattech://open?source=portal';

// only web addresses: a mistyped or javascript: setting must never become a button that runs code
const webAddress = (value: string | undefined) => {
  const text = value?.trim();
  if (!text) return undefined;
  try {
    const { protocol } = new URL(text);
    return protocol === 'https:' || protocol === 'http:' ? text : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Where Learning goes: the LMS Platform when the portal is connected and has its address (owner's 3B, 2026-10-25), else
 * undefined and the portal's own course pages. The demo has no Keycloak accounts to sign in to the platform with.
 */
export const learningPlatform = (links: ToolLinks, connected: boolean): string | undefined => (connected ? links.lmsPlatform : undefined);

export function readToolLinks(env: Record<string, string | undefined> | undefined): ToolLinks {
  const links: ToolLinks = {};
  for (const [key, setting] of Object.entries(SETTINGS) as [keyof ToolLinks, string][]) {
    const address = webAddress(env?.[setting]);
    if (address) links[key] = address;
  }
  return links;
}

/** The tools with their buttons pointed at the configured addresses; the list passed in is not changed. */
export function withToolLinks(tools: Tool[], links: ToolLinks): Tool[] {
  const urls: Record<string, { url?: string; secondary?: string }> = {
    huly: { url: links.workspace, secondary: links.workspace },
    // Plain address for now: the company's LibreChat answers its company sign-in link (<address>/oauth/openid) with a
    // server error (checked 2026-10-23). Point `url` there again once their sign-in works.
    librechat: { url: links.librechat, secondary: links.librechat },
    hrms: { url: links.hrms },
    filesync: { url: links.fileTransfer },
    coder: { url: CODER_APP_URL, secondary: links.coderInstaller },
  };
  return tools.map((tool) => {
    const set = urls[tool.id];
    if (!set) return tool;
    return {
      ...tool,
      url: set.url ?? '',
      secondary: tool.secondary && { ...tool.secondary, url: set.secondary ?? '' },
    };
  });
}
