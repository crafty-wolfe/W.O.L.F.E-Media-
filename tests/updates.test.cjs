const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { UpdateManager, compareVersions } = require('../services/media-server/src/updates.cjs');
test('stable release check accepts only a matching manifest and hash', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wolfe-updates-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const release = { tag_name: 'v1.4.0', body: 'New features', published_at: '2026-09-22T12:00:00Z', assets: [{ name: 'release-manifest.json', browser_download_url: 'https://example.test/manifest' }, { name: 'wolfe-media-1.4.0-windows.zip', browser_download_url: 'https://example.test/package', size: 40 }] };
  const manifest = { version: '1.4.0', notes: 'New features', package: { name: 'wolfe-media-1.4.0-windows.zip', sha256: 'a'.repeat(64), size: 40 } };
  const fetchImpl = async url => ({ ok: true, status: 200, json: async () => url.includes('/releases/latest') ? release : manifest });
  const manager = new UpdateManager({ file: path.join(dir, 'updates.json'), currentVersion: '1.3.2', fetchImpl });
  const status = await manager.check();
  assert.equal(status.updateAvailable, true); assert.equal(status.installReady, true); assert.equal(status.latestVersion, '1.4.0');
});
test('version comparison keeps prereleases out of stable updates', () => { assert.equal(compareVersions('1.4.0', '1.3.9'), 1); assert.equal(compareVersions('1.4.0-beta.1', '1.4.0'), -1); });
