import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CODER_APP_URL, readToolLinks, withToolLinks } from '../../src/portal/toolLinks';
import { TOOLS } from '../../src/portal/data';

const SETTINGS = {
  VITE_WORKSPACE_URL: ' https://workspace.example.test ',
  VITE_LIBRECHAT_URL: 'https://chat.example.test/',
  VITE_HRMS_URL: 'https://hrm.example.test/login/',
  VITE_FILE_TRANSFER_URL: 'https://files.example.test/',
  VITE_CODER_INSTALLER_URL: 'https://lms.example.test/downloads/setup.exe',
};

const tool = (tools: typeof TOOLS, id: string) => tools.find((t) => t.id === id)!;

test('the five tool addresses are read from the site settings, trimmed', () => {
  assert.deepEqual(readToolLinks(SETTINGS), {
    workspace: 'https://workspace.example.test',
    librechat: 'https://chat.example.test/',
    hrms: 'https://hrm.example.test/login/',
    fileTransfer: 'https://files.example.test/',
    coderInstaller: 'https://lms.example.test/downloads/setup.exe',
  });
});

test('missing or empty settings give no address', () => {
  assert.deepEqual(readToolLinks(undefined), {});
  assert.deepEqual(readToolLinks({ VITE_WORKSPACE_URL: '  ', VITE_HRMS_URL: '' }), {});
});

test('a setting that is not an http or https address is ignored, so it can never become a code link', () => {
  const links = readToolLinks({ VITE_WORKSPACE_URL: 'javascript:alert(1)', VITE_HRMS_URL: 'ftp://hrm.example.test', VITE_LIBRECHAT_URL: 'chat.example.test' });
  assert.deepEqual(links, {});
});

test('Workspace, HRMS and File Transfer open their addresses', () => {
  const tools = withToolLinks(TOOLS, readToolLinks(SETTINGS));
  assert.equal(tool(tools, 'huly').url, 'https://workspace.example.test');
  assert.equal(tool(tools, 'huly').secondary?.url, 'https://workspace.example.test');
  assert.equal(tool(tools, 'hrms').url, 'https://hrm.example.test/login/');
  assert.equal(tool(tools, 'filesync').url, 'https://files.example.test/');
});

// The company's LibreChat answers its sign-in link (/oauth/openid) with a server error, so both buttons open it plainly
// and LibreChat shows its own login. Switch the main one back once their sign-in works.
test('LibreChat opens at its plain address, not the sign-in link that currently fails', () => {
  const tools = withToolLinks(TOOLS, readToolLinks(SETTINGS));
  assert.equal(tool(tools, 'librechat').url, 'https://chat.example.test/');
  assert.doesNotMatch(tool(tools, 'librechat').url, /oauth/);
  assert.equal(tool(tools, 'librechat').secondary?.url, 'https://chat.example.test/');
});

test('Coder opens the desktop app without any sign-in token in the link', () => {
  const coder = tool(withToolLinks(TOOLS, readToolLinks(SETTINGS)), 'coder');
  assert.equal(coder.url, CODER_APP_URL);
  assert.equal(CODER_APP_URL, 'bharattech://open?source=portal');
  assert.doesNotMatch(coder.url, /token/i);
  assert.equal(coder.secondary?.url, 'https://lms.example.test/downloads/setup.exe');
});

test('without settings the app button still works but the installer is not connected', () => {
  const coder = tool(withToolLinks(TOOLS, {}), 'coder');
  assert.equal(coder.url, CODER_APP_URL);
  assert.equal(coder.secondary?.url, '');
});

test('tools nobody has an address for stay not connected, and the shared list is left unchanged', () => {
  const before = JSON.stringify(TOOLS);
  const tools = withToolLinks(TOOLS, readToolLinks(SETTINGS));
  for (const id of ['eoffice', 'plane', 'securo', 'chatwoot', 'screego', 'invoice', 'excalidraw', 'lobehub']) {
    assert.equal(tool(tools, id).url, '', id);
  }
  assert.equal(JSON.stringify(TOOLS), before);
});
