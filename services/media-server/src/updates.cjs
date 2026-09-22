const fs = require('node:fs');
const path = require('node:path');

const VERSION = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;
function parseVersion(value) {
  const match = VERSION.exec(String(value || '').trim());
  if (!match) return null;
  return { raw: match[0].replace(/^v/, ''), parts: match.slice(1, 4).map(Number), prerelease: match[4] || '' };
}
function compareVersions(left, right) {
  const a = parseVersion(left), b = parseVersion(right);
  if (!a || !b) return 0;
  for (let index = 0; index < 3; index += 1) if (a.parts[index] !== b.parts[index]) return a.parts[index] > b.parts[index] ? 1 : -1;
  if (!a.prerelease && b.prerelease) return 1;
  if (a.prerelease && !b.prerelease) return -1;
  return a.prerelease.localeCompare(b.prerelease);
}
function safeManifest(input, release, assets) {
  if (!input || typeof input !== 'object') return null;
  const version = parseVersion(input.version)?.raw;
  const packageInfo = input.package;
  if (!version || version !== parseVersion(release.tag_name)?.raw || !packageInfo || typeof packageInfo !== 'object') return null;
  const name = String(packageInfo.name || '');
  const sha256 = String(packageInfo.sha256 || '').toLowerCase();
  const asset = assets.find(item => item.name === name);
  if (!asset || !/\.zip$/i.test(name) || !/^[a-f0-9]{64}$/.test(sha256)) return null;
  return { version, notes: String(input.notes || release.body || '').slice(0, 12000), publishedAt: String(release.published_at || ''), package: { name, url: String(asset.browser_download_url || ''), sha256, size: Number(packageInfo.size || asset.size || 0) } };
}

class UpdateManager {
  constructor({ file, currentVersion, repository = 'crafty-wolfe/W.O.L.F.E-Media-', fetchImpl = fetch }) {
    this.file = file; this.currentVersion = currentVersion; this.repository = repository; this.fetch = fetchImpl;
    this.state = { channel: 'stable', lastCheckedAt: null, latest: null, error: null };
    try { this.state = { ...this.state, ...JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch {}
  }
  save() { fs.mkdirSync(path.dirname(this.file), { recursive: true }); fs.writeFileSync(this.file, JSON.stringify(this.state, null, 2)); }
  status() {
    const latest = this.state.latest;
    return { currentVersion: this.currentVersion, channel: 'stable', lastCheckedAt: this.state.lastCheckedAt, latestVersion: latest?.version || null, releaseNotes: latest?.notes || '', updateAvailable: Boolean(latest && compareVersions(latest.version, this.currentVersion) > 0), installReady: Boolean(latest?.package?.url && latest?.package?.sha256), error: this.state.error };
  }
  async check() {
    this.state.lastCheckedAt = new Date().toISOString(); this.state.error = null;
    try {
      const releaseResponse = await this.fetch(`https://api.github.com/repos/${this.repository}/releases/latest`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'WOLFE-Media-Center' }, signal: AbortSignal.timeout(8000) });
      if (releaseResponse.status === 404) { this.state.latest = null; this.save(); return this.status(); }
      if (!releaseResponse.ok) throw new Error('Unable to check for updates right now.');
      const release = await releaseResponse.json();
      if (release.prerelease || release.draft || !parseVersion(release.tag_name)) throw new Error('No stable release is available yet.');
      const assets = Array.isArray(release.assets) ? release.assets : [];
      const manifestAsset = assets.find(asset => asset.name === 'release-manifest.json');
      if (!manifestAsset?.browser_download_url) throw new Error('The latest release does not include its verified update manifest.');
      const manifestResponse = await this.fetch(manifestAsset.browser_download_url, { headers: { Accept: 'application/json', 'User-Agent': 'WOLFE-Media-Center' }, signal: AbortSignal.timeout(8000) });
      if (!manifestResponse.ok) throw new Error('The release manifest could not be verified.');
      const latest = safeManifest(await manifestResponse.json(), release, assets);
      if (!latest) throw new Error('The latest release package could not be verified.');
      this.state.latest = latest; this.save(); return this.status();
    } catch (error) { this.state.error = error.message; this.save(); return this.status(); }
  }
}
module.exports = { UpdateManager, compareVersions, parseVersion, safeManifest };
