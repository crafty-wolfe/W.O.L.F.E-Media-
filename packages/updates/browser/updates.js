let wolfeUpdateStatus = null;
async function readUpdateStatus(check = false) {
  const response = await fetch(check ? '/api/updates/check' : '/api/updates/status', check ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' } : {});
  if (!response.ok) throw new Error('Updates are unavailable right now.');
  wolfeUpdateStatus = await response.json();
  return wolfeUpdateStatus;
}
function updateTime(value) { return value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Not checked yet'; }
function updateProfileNotice(status) {
  const host = document.querySelector('#profileOverlay .profiles');
  host?.querySelector('.profile-update-notice')?.remove();
  if (!host || !status?.updateAvailable) return;
  const notice = document.createElement('div'); notice.className = 'profile-update-notice';
  notice.innerHTML = `<span><b>Update available</b><small>W.O.L.F.E Media v${escapeHtml(status.latestVersion)}</small></span><button class="secondary focusable">Later</button><button class="primary focusable">Update now</button>`;
  notice.querySelector('.secondary').onclick = () => notice.remove();
  notice.querySelector('.primary').onclick = () => { app.tab = 'settings'; document.getElementById('profileOverlay').classList.add('hidden'); render(); setTimeout(openUpdateManager, 0); };
  host.appendChild(notice);
}
async function refreshUpdateNotice(check = false) { try { updateProfileNotice(await readUpdateStatus(check)); } catch {} }
function openUpdateManager() {
  const show = status => {
    modal('System updates', `<div class="update-manager"><div><b>Current version</b><span>v${escapeHtml(status.currentVersion)}</span></div><div><b>Latest stable version</b><span>${status.latestVersion ? `v${escapeHtml(status.latestVersion)}` : 'No verified release found'}</span></div><div><b>Last check</b><span>${escapeHtml(updateTime(status.lastCheckedAt))}</span></div><div><b>Update channel</b><span>Stable</span></div>${status.releaseNotes ? `<section><b>Release notes</b><p>${escapeHtml(status.releaseNotes)}</p></section>` : ''}${status.error ? `<p class="update-error">${escapeHtml(status.error)}</p>` : ''}</div>`, `<button class="secondary focusable" onclick="closeModal()">Back</button><button id="checkUpdates" class="primary focusable">Check for updates</button>`);
    document.getElementById('checkUpdates').onclick = async () => { const button = document.getElementById('checkUpdates'); button.disabled = true; button.textContent = 'Checking…'; try { show(await readUpdateStatus(true)); updateProfileNotice(wolfeUpdateStatus); } catch (error) { button.disabled = false; button.textContent = 'Try again'; } };
  };
  readUpdateStatus().then(show).catch(error => errorDialog(error));
}
const showProfilesWithUpdates = showProfiles;
showProfiles = function () { showProfilesWithUpdates(); refreshUpdateNotice(false); };
setTimeout(() => refreshUpdateNotice(false), 0);
