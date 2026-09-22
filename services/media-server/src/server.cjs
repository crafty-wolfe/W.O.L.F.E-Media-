const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { Store } = require('./store.cjs');
const { IptvService } = require('./iptv.cjs');
const { UpdateManager } = require('./updates.cjs');
const projectRoot = path.resolve(__dirname, '..', '..', '..');
const packageInfo = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const root = path.join(projectRoot, 'apps', 'media-client');
const packagesRoot = path.join(projectRoot, 'packages');
const port = Number(process.env.WOLFE_PORT || 47831);
const origin = `http://127.0.0.1:${port}`;
const store = new Store(process.env.WOLFE_DATA || path.join(process.env.LOCALAPPDATA || path.join(__dirname,'..'), 'WOLFE Media Center', 'state.json'));
const iptv = new IptvService(path.join(path.dirname(store.file), 'iptv.json'));
const updates = new UpdateManager({ file: path.join(path.dirname(store.file), 'updates.json'), currentVersion: packageInfo.version });
const files = {
  '/packages/ui/browser/library-loading.js': [path.join(packagesRoot,'ui','browser','library-loading.js'),'text/javascript'],
  '/packages/ui/browser/library-loading.css': [path.join(packagesRoot,'ui','browser','library-loading.css'),'text/css'],
  '/packages/media-catalogue/browser/collection-categories.js': [path.join(packagesRoot,'media-catalogue','browser','collection-categories.js'),'text/javascript'],
  '/': ['index.html','text/html'],
  '/index.html': ['index.html','text/html'],
  '/styles.css': ['styles.css','text/css'],
  '/design-v3.css': ['design-v3.css','text/css'],
  '/visual-rebuild.css': ['visual-rebuild.css','text/css'],
  '/packages/iptv/browser/player.css': [path.join(packagesRoot,'iptv','browser','player.css'),'text/css'],
  '/app.js': ['app.js','text/javascript'],
  '/enhancements.js': ['enhancements.js','text/javascript'],
  '/design-v3.js': ['design-v3.js','text/javascript'],
  '/packages/media-catalogue/browser/catalogue-filters.js': [path.join(packagesRoot,'media-catalogue','browser','catalogue-filters.js'),'text/javascript'],
  '/personalisation.js': ['personalisation.js','text/javascript'],
  '/packages/iptv/browser/player.js': [path.join(packagesRoot,'iptv','browser','player.js'),'text/javascript'],
  '/packages/updates/browser/updates.js': [path.join(packagesRoot,'updates','browser','updates.js'),'text/javascript'],
  '/vendor/hls.min.js': ['vendor/hls.min.js','text/javascript'],
  '/assets/hero-home-v3.png': ['assets/hero-home-v3.png','image/png'],
  '/assets/hero-ondemand-v3.png': ['assets/hero-ondemand-v3.png','image/png'],
  '/assets/hero-homecontrol-v3.png': ['assets/hero-homecontrol-v3.png','image/png'],
  '/assets/reference-homecontrol-v3.png': ['assets/reference-homecontrol-v3.png','image/png'],
  '/assets/reference-cameras-v3.png': ['assets/reference-cameras-v3.png','image/png'],
  '/assets/services/apple.svg': ['assets/services/apple.svg','image/svg+xml'],
  '/assets/services/paramount.svg': ['assets/services/paramount.svg','image/svg+xml'],
  '/assets/services/netflix.svg': ['assets/services/netflix.svg','image/svg+xml'],
  '/assets/services/prime.svg': ['assets/services/prime.svg','image/svg+xml'],
  '/assets/services/max.svg': ['assets/services/max.svg','image/svg+xml'],
  '/assets/services/sky.svg': ['assets/services/sky.svg','image/svg+xml'],
  '/assets/wolfe-mark-v4.png': ['assets/wolfe-mark-v4.png','image/png']
};
const server = http.createServer(async (req, res) => {
  const send = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
  if (req.headers.host !== `127.0.0.1:${port}`) return send(403, { error: 'Invalid host' });
  if (req.headers.origin && req.headers.origin !== origin) return send(403, { error: 'Invalid origin' });
  const url = new URL(req.url, origin);
  if (url.pathname === '/api/health' && req.method === 'GET') return send(200, { app: 'wolfe-media-center', version: packageInfo.version, root: projectRoot });
  if (url.pathname === '/api/updates/status' && req.method === 'GET') return send(200, updates.status());
  if (url.pathname === '/api/updates/check' && req.method === 'POST') {
    if (req.headers.origin !== origin || req.headers['content-type'] !== 'application/json') return send(403, { error: 'Local app requests only' });
    try { return send(200, await updates.check()); } catch (error) { return send(400, { error: error.message }); }
  }
  if (url.pathname === '/api/updates/install' && req.method === 'POST') {
    if (req.headers.origin !== origin || req.headers['content-type'] !== 'application/json') return send(403, { error: 'Local app requests only' });
    try {
      const prepared = await updates.prepareInstall();
      const installer = path.join(projectRoot, 'scripts', 'Install-Update.ps1');
      if (!fs.existsSync(installer)) throw new Error('The local update installer is unavailable.');
      const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', installer, '-PackagePath', prepared.packagePath, '-ExpectedSha256', prepared.expectedSha256, '-InstallRoot', projectRoot, '-RestartMode', 'main', '-WaitForPid', String(process.pid)], { detached: true, stdio: 'ignore', windowsHide: true });
      child.unref();
      send(202, { installing: true, version: prepared.version });
      setTimeout(() => server.close(() => process.exit(0)), 500);
      return;
    } catch (error) { return send(400, { error: error.message }); }
  }
  if (url.pathname === '/api/state' && req.method === 'GET') return send(200, store.snapshot());
  if (url.pathname === '/api/iptv/status' && req.method === 'GET') return send(200, iptv.status());
  if (url.pathname === '/api/iptv/catalog' && req.method === 'GET') {
    try { return send(200, await iptv.catalog(url.searchParams.get('category'), url.searchParams.get('limit'), url.searchParams.get('includeHidden') === '1', url.searchParams.get('kind'))); }
    catch (error) { return send(400, { error: error.message }); }
  }
  if (url.pathname === '/api/iptv/search' && req.method === 'GET') {
    try { return send(200, await iptv.search(url.searchParams.get('q'), url.searchParams.get('limit'), url.searchParams.get('kind'))); }
    catch (error) { return send(400, { error: error.message }); }
  }
  if (url.pathname === '/api/iptv/series' && req.method === 'GET') {
    try { return send(200, await iptv.seriesInfo(url.searchParams.get('id'))); }
    catch (error) { return send(400, { error: error.message }); }
  }
  if (url.pathname === '/api/iptv/stream' && req.method === 'GET') {
    try { res.writeHead(302, { Location: iptv.streamUrl(url.searchParams.get('id'), url.searchParams.get('format')), 'Cache-Control': 'no-store' }); return res.end(); }
    catch (error) { return send(400, { error: error.message }); }
  }
  if (url.pathname === '/api/iptv/playback-check' && req.method === 'GET') {
    try { return send(200, await iptv.playbackCheck(url.searchParams.get('id'), url.searchParams.get('format'))); }
    catch (error) { return send(400, { error: error.message }); }
  }
  if (url.pathname === '/api/iptv/config' && req.method === 'POST') {
    if (req.headers.origin !== origin || req.headers['content-type'] !== 'application/json') return send(403, { error: 'Local app requests only' });
    let body = '';
    try {
      for await (const chunk of req) { body += chunk; if (body.length > 4096) return send(413, { error: 'Request too large' }); }
      return send(200, await iptv.configure(JSON.parse(body)));
    } catch (error) { return send(400, { error: error.message }); }
  }
  if (url.pathname === '/api/iptv/categories' && req.method === 'POST') {
    if (req.headers.origin !== origin || req.headers['content-type'] !== 'application/json') return send(403, { error: 'Local app requests only' });
    let body = '';
    try {
      for await (const chunk of req) { body += chunk; if (body.length > 8192) return send(413, { error: 'Request too large' }); }
      const input = JSON.parse(body);
      return send(200, iptv.setHiddenCategories(input.hiddenCategories));
    } catch (error) { return send(400, { error: error.message }); }
  }
  if (url.pathname === '/api/command' && req.method === 'POST') {
    if (req.headers.origin !== origin || req.headers['content-type'] !== 'application/json') return send(403, { error: 'Local app requests only' });
    let body = '';
    try {
      for await (const chunk of req) { body += chunk; if (body.length > 8192) return send(413, { error: 'Request too large' }); }
      return send(200, store.command(JSON.parse(body)));
    } catch (error) { return send(400, { error: error.message }); }
  }
  if (req.method !== 'GET' || !files[url.pathname]) return send(404, { error: 'Not found' });
  const [file, type] = files[url.pathname];
  res.writeHead(200, { 'Content-Type': type + '; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; media-src 'self' http: https:; img-src 'self' data: http: https:; object-src 'none'; frame-src 'none'; base-uri 'none'; frame-ancestors 'none'" });
  fs.createReadStream(path.isAbsolute(file) ? file : path.join(root, file)).pipe(res);
});
server.listen(port, '127.0.0.1', () => { console.log(`W.O.L.F.E ready at ${origin}`); updates.check().catch(() => {}); });
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
