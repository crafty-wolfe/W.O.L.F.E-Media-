/* Local app behaviour layered over the preserved v1 visual components. */
const client = crypto.randomUUID();
let state = { progress: {}, slots: [] }, selectedTitle = '', playing = null, timer = null;
let focusReturn = null;
const services = { Netflix:'https://www.netflix.com', 'Prime Video':'https://www.primevideo.com', 'Disney+':'https://www.disneyplus.com', YouTube:'https://www.youtube.com' };
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(data) {
  const response = await fetch(data ? '/api/command' : '/api/state', data ? { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ client, ...data }) } : {});
  if (!response.ok) throw new Error('The local media service is unavailable. Relaunch W.O.L.F.E.');
  state = await response.json();
  return state;
}
async function iptvApi(path, options) {
  const response = await fetch(path, options ? { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(options) } : {});
  const result = await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(result.error || 'Unable to contact the IPTV provider.');
  return result;
}
function errorDialog(error) { modal('Unable to complete action', `<p>${escapeHtml(error.message)}</p>`, `<button class="primary focusable" onclick="closeModal()">Back</button>`); }
function scope() {
  for (const id of ['modal','camera','profileOverlay']) if (!$(id).classList.contains('hidden')) return $(id);
  return $('shell');
}
function focusables() { return [...scope().querySelectorAll('.focusable')].filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden'); }
function focusFirst() { const items=focusables(); if (!items.includes(document.activeElement)) (items.find(x=>x.classList.contains('active')) || items[0])?.focus(); }
function restoreFocus() { if (focusReturn?.isConnected && focusables().includes(focusReturn)) focusReturn.focus(); else focusFirst(); }
const originalModal = modal;
modal = function(title,body,buttons) { if ($('modal').classList.contains('hidden')) focusReturn=document.activeElement; originalModal(title,body,buttons); $('modal').setAttribute('role','dialog'); $('modal').setAttribute('aria-modal','true'); $('modal').setAttribute('aria-labelledby','modalTitle'); };
closeModal = function() { $('modal').classList.add('hidden'); restoreFocus(); };
const originalProfiles = showProfiles;
showProfiles = function() { if (playing) { modal('Stop playback first','<p>Stop the current demo before changing profiles.</p>',`<button class="primary focusable" onclick="stopPlayback()">Stop playback</button><button class="secondary focusable" onclick="closeModal()">Back</button>`); return; } originalProfiles(); };
$('profileChip').onclick=showProfiles;
$('profileChip').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showProfiles();}};
const navIcons={home:'⌂',movies:'◉',series:'▣',kids:'✦',ondemand:'▷',apps:'▦',cameras:'◫',homecontrol:'⚙'};
document.querySelectorAll('.nav').forEach(button=>{
  button.dataset.icon=navIcons[button.dataset.tab]||'•';
  if(button.dataset.tab==='homecontrol')button.textContent='Settings';
});
['home','movies','series','kids','ondemand','apps','cameras','homecontrol'].forEach(id=>{
  const item=nav.querySelector(`[data-tab="${id}"]`);
  if(item)nav.appendChild(item);
});
$('profileChip').insertAdjacentHTML('beforebegin',`<div class="room-status"><span class="wifi">⌁</span><span>${mode==='lite'?'Bedroom':'Living Room'}</span></div>`);
home=function(){
  const feature=app.profile==='Elsie-Joan'?'Skybound Kingdom':app.profile==='Brooke'?'Neon Horizon':app.profile==='Alfie'?'Zero Signal':'Midnight Protocol';
  const continueItems=watch[app.profile].slice(0,4);
  const imageCard=(item,index,compact=false)=>`<button class="card art-card art-${index%6} ${compact?'compact-card':''} focusable" onclick="details('${item[0].replaceAll("'","\\'")}')"><div class="shade"></div><div class="meta"><div class="source">${['NETFLIX','PRIME VIDEO','DISNEY+','IPTV'][index%4]}</div><div class="title">${item[0]}</div><div class="small">${item[1]}</div>${item[2]?`<div class="progress"><span style="width:${item[2]}%"></span></div>`:''}</div></button>`;
  const gallery=(title,items,offset=0)=>`<section class="row gallery-row"><div class="rowTitle">${title}</div><div class="cards">${items.map((item,index)=>imageCard(item,index+offset,true)).join('')}</div></section>`;
  const because=[['Shadow Vale','Mystery · 2026',0],['Afterlight','Adventure · 2025',0],['Orbital','Sci-fi · 2026',0],['Neon Case','Thriller · 2026',0],['Red Frontier','Film · 2025',0],['Wonderland','Family · 2026',0]];
  const popular=[['The Crossing','Film · 2026',0],['Last City','Series · S1',0],['Deep Space','Film · 2025',0],['Night Watch','Series · S2',0],['Distant Suns','Film · 2026',0],['Little Worlds','Family · 2025',0]];
  $('content').innerHTML=`<section class="hero cinematic-hero"><div class="heroCopy"><div class="service-kicker">W.O.L.F.E ORIGINAL</div><h1>${feature}</h1><h2>New season now streaming</h2><p>A city in darkness. Two people with one chance to bring the truth into the light.</p><div class="actions"><button class="primary focusable">▶ &nbsp; Watch Now</button><button class="secondary focusable" onclick="details('${feature}')">More Info</button></div></div><button class="camera-peek focusable" onclick="showCamera()"><span class="camera-scene"></span><span><b>Driveway</b><small>Camera ready · simulated</small></span><i>View</i></button><div class="hero-dots"><b></b><i></i><i></i><i></i></div></section><div class="rows media-rows"><section class="row continue-row"><div class="rowTitle">Continue Watching</div><div class="cards">${continueItems.map((item,index)=>imageCard(item,index)).join('')}</div></section>${gallery('Because You Watched '+continueItems[1][0],because)}${gallery('Popular on Demand',popular,2)}<section class="bottom-dashboard"><div class="quick-panel"><div class="rowTitle">Quick Access</div><div class="quick-grid"><button class="quick iptv focusable" onclick="openIptvPortal()">IPTV</button><button class="quick netflix focusable" onclick="details('Netflix')">NETFLIX</button><button class="quick prime focusable" onclick="details('Prime Video')">prime video</button><button class="quick disney focusable" onclick="details('Disney+')">Disney+</button><button class="quick youtube focusable" onclick="details('YouTube')">▶ YouTube</button></div></div><div class="room-panel"><div class="rowTitle">Room Info <small>(Coming Soon)</small></div><div class="room-grid"><button class="info-tile focusable" onclick="details('Temperature')"><b>♨</b><span>Temperature<small>-- °C</small></span></button><button class="info-tile focusable" onclick="details('Lights')"><b>♧</b><span>Lights<small>Not connected</small></span></button><button class="info-tile focusable" onclick="showCamera()"><b>◫</b><span>Cameras<small>Ready</small></span></button></div></div></section></div>`;
};
apps=function(){
  page('Apps','Core family services in one place.',[['N','Netflix','Open Netflix.'],['P','Prime Video','Amazon Prime Video.'],['D+','Disney+','Open Disney+.'],['▶','YouTube','Open YouTube.'],['IP','IPTV On Demand','Prototype VOD library.'],['👤','Change Profile','Who’s watching?']]);
  $('content').querySelectorAll('.tile').forEach((button,i)=>{button.removeAttribute('onclick');button.onclick=()=>{if(i<4)window.open(Object.values(services)[i],'_blank','noopener,noreferrer');else if(i===4){app.tab='ondemand';render();}else showProfiles();};});
};
const originalRender=render;
render=function(){
  originalRender();
  const roomName=mode==='lite'?(app.profile==='Visitors'?'Guest Room':`${app.profile}’s Room`):'Living Room';
  document.querySelector('.room-status span:last-child').textContent=roomName;
  const history=state.progress[app.profile]||{};
  if(app.tab==='home'){
    const cards=$('content').querySelectorAll('.row:first-child .card');
    cards.forEach(card=>{const title=card.querySelector('.title').textContent;const saved=history[title];if(saved){let bar=card.querySelector('.progress');if(!bar){bar=document.createElement('div');bar.className='progress';bar.innerHTML='<span></span>';card.querySelector('.meta').appendChild(bar);}bar.firstChild.style.width=saved.percent+'%';card.querySelector('.small').textContent=`Demo progress · ${Math.round(saved.percent)}%`;}});
    const extra=Object.entries(history).filter(([title])=>!watch[app.profile].some(x=>x[0]===title));
    extra.forEach(([title,progress])=>{const button=document.createElement('button');button.className='card focusable';button.innerHTML=`<div class="meta"><div class="title">${escapeHtml(title)}</div><div class="small">Demo progress · ${Math.round(progress.percent)}%</div><div class="progress"><span style="width:${progress.percent}%"></span></div></div>`;button.onclick=()=>details(title);$('content').querySelector('.cards').prepend(button);});
    $('content').querySelector('.hero .primary').onclick=()=>{selectedTitle=$('content').querySelector('h1').textContent;playDemo();};
  }
  focusFirst();
};
details=function(title){
  if(title==='Search'&&typeof openUniversalSearch==='function'){openUniversalSearch();return;}
  if(services[title]){window.open(services[title],'_blank','noopener,noreferrer');return;}
  if(title==='IPTV On Demand'){app.tab='ondemand';render();return;}
  if(['homecontrol','cameras'].includes(app.tab)){modal(title,'<p>Integration placeholder. No Home Assistant, Tapo or Alexa connection is active.</p>',`<button class="primary focusable" onclick="closeModal()">Back</button>`);return;}
  selectedTitle=title;
  modal(title,`<p>Demo catalogue · simulated playback. Progress is saved for ${escapeHtml(app.profile)}. No IPTV provider is connected.</p>`,`<button class="primary focusable" onclick="playDemo()">Start demo</button><button class="secondary focusable" onclick="closeModal()">Back</button>`);
};
function playbackDialog(){modal('Demo playing',`<p><b>${escapeHtml(playing.title)}</b> · ${escapeHtml(playing.profile)}</p><p>Simulated playback — no video source configured.</p><p id="playProgress">${Math.round(playing.percent)}% complete</p>`,`<button class="primary focusable" onclick="stopPlayback()">Stop and save</button><button class="secondary focusable" onclick="closeModal()">Browse while playing</button>`);}
playDemo=async function(){try{
  if(playing){playbackDialog();return;}
  const title=selectedTitle||'Beyond Tomorrow';
  const result=await api({action:'acquire',profile:app.profile,title,mode});
  if(result.blocked){showIptv();return;}
  playing={title,profile:app.profile,percent:state.progress[app.profile]?.[title]?.percent||0};
  if(playing.percent>=100)playing.percent=0;
  playbackDialog();
  timer=setInterval(async()=>{if(!playing)return;playing.percent=Math.min(100,playing.percent+1);if($('playProgress'))$('playProgress').textContent=Math.round(playing.percent)+'% complete';try{await api({action:'progress',...playing});if(playing?.percent===100)await stopPlayback();}catch(error){clearInterval(timer);errorDialog(error);}},3000);
}catch(error){errorDialog(error);}};
async function stopPlayback(){try{clearInterval(timer);if(playing)await api({action:'progress',...playing});await api({action:'release'});playing=null;closeModal();render();}catch(error){errorDialog(error);}}
showIptv=async function(){try{
  await api();
  const slots=state.slots;
  modal(slots.length===2?'Both IPTV connections are in use':'IPTV connection manager',`<p>${slots.length} of 2 local IPTV connections in use. Main and Lite share this manager on this PC.</p>${slots.map((s,i)=>`<div class="slot"><div><b>${escapeHtml(s.room)}</b><br><span>${escapeHtml(s.profile)} · ${escapeHtml(s.title)}</span></div><button class="secondary focusable" data-release="${i}">Stop</button></div>`).join('')||'<p>No active streams.</p>'}`,`<button class="secondary focusable" onclick="closeModal()">Back</button>${playing?'<button class="secondary focusable" onclick="stopPlayback()">Stop my playback</button>':''}`);
  $('modalBody').querySelectorAll('[data-release]').forEach(b=>b.onclick=async()=>{try{const target=slots[Number(b.dataset.release)].client;if(target===client){await stopPlayback();}else await api({action:'release',client:target});await showIptv();}catch(error){errorDialog(error);}});
}catch(error){errorDialog(error);}};
let cameraFocus;
showCamera=function(){cameraFocus=document.activeElement;$('camera').classList.remove('hidden');$('viewCam').focus();};
hideCamera=function(){$('camera').classList.add('hidden');if(cameraFocus?.isConnected)cameraFocus.focus();else focusFirst();};
$('dismissCam').onclick=hideCamera;
$('viewCam').onclick=()=>{hideCamera();modal('Driveway · simulated camera','<div class="camView" style="height:260px"><div class="live">SIMULATED CAMERA</div><div class="person"></div></div><p>No camera is connected. Tapo and Home Assistant adapters are reserved for later.</p>',`<button class="primary focusable" onclick="closeModal()">Back</button>`);};
$('camera').querySelector('.live').textContent='SIMULATED CAMERA';
$('camera').querySelector('.eyebrow').textContent='DEMO ALERT';
$('camera').querySelector('p').textContent='Simulated person detection.';
function showIptvSetup(){
  const saved=JSON.parse(localStorage.getItem('wolfe_xtream')||'{}');
  modal('Connect IPTV',`<p>Enter your Xtream Codes details on this PC. W.O.L.F.E will test the provider and import its on-demand catalogue.</p><div class="iptv-setup"><label>Server URL<input id="iptvUrl" class="focusable" inputmode="url" placeholder="http://provider.example:8080" value="${escapeHtml(saved.url||'')}"></label><label>Username<input id="iptvUser" class="focusable" autocomplete="username" value="${escapeHtml(saved.user||'')}"></label><label>Password<input id="iptvPassword" class="focusable" type="password" autocomplete="current-password"></label></div><p class="small">Use the server address only. Your catalogue and password stay on this PC.</p>`,`<button class="secondary focusable" onclick="closeModal()">Cancel</button><button class="primary focusable" id="saveIptvSetup">Connect and import</button>`);
  $('saveIptvSetup').onclick=async()=>{const url=$('iptvUrl').value.trim().replace(/\/$/,'');const user=$('iptvUser').value.trim();const password=$('iptvPassword').value;if(!/^https?:\/\//i.test(url)||!user||!password){modal('Check IPTV details','<p>Enter the full server URL, username, and password supplied by your provider.</p>',`<button class="primary focusable" onclick="showIptvSetup()">Back</button>`);return;}const button=$('saveIptvSetup');button.disabled=true;button.textContent='Connecting…';try{const result=await iptvApi('/api/iptv/config',{url,user,password});localStorage.removeItem('wolfe_xtream');modal('IPTV connected',`<p>Imported <b>${result.titleCount}</b> on-demand titles across <b>${result.categoryCount}</b> categories.</p>`,`<button class="primary focusable" onclick="openIptvPortal()">Open IPTV</button>`);}catch(error){errorDialog(error);}};
}
function back(){if(!$('modal').classList.contains('hidden'))closeModal();else if(!$('camera').classList.contains('hidden'))hideCamera();else if(!$('profileOverlay').classList.contains('hidden')){$('profileOverlay').classList.add('hidden');focusFirst();}else if(app.tab!=='home'){app.tab='home';render();}else showProfiles();}
function move(key){const all=focusables(),cur=document.activeElement;if(!all.includes(cur)){all[0]?.focus();return;}const r=cur.getBoundingClientRect();let best,score=Infinity;for(const el of all){if(el===cur)continue;const q=el.getBoundingClientRect(),dx=q.left+q.width/2-r.left-r.width/2,dy=q.top+q.height/2-r.top-r.height/2;const horizontal=key==='ArrowLeft'||key==='ArrowRight';if(!(key==='ArrowRight'?dx>12:key==='ArrowLeft'?dx<-12:key==='ArrowDown'?dy>12:dy<-12))continue;const candidate=(horizontal?Math.abs(dx):Math.abs(dy))+2*(horizontal?Math.abs(dy):Math.abs(dx));if(candidate<score){score=candidate;best=el;}}if(best){best.focus();best.scrollIntoView({block:'nearest',inline:'nearest'});}}
document.addEventListener('keydown',e=>{
  if(e.altKey||e.ctrlKey||e.metaKey)return;
  if(document.body.classList.contains('iptv-playing')&&typeof window.handleIptvPlayerKey==='function'&&window.handleIptvPlayerKey(e)){e.preventDefault();return;}
  if(e.key.startsWith('Arrow')){e.preventDefault();move(e.key);}
  else if(e.key==='Tab'){e.preventDefault();const all=focusables();all[(all.indexOf(document.activeElement)+(e.shiftKey?-1:1)+all.length)%all.length]?.focus();}
  else if(e.key==='Escape'||e.key==='Backspace'){e.preventDefault();back();}
  else if(e.key.toLowerCase()==='c'){if(scope()===$('shell'))showCamera();}
  else if(e.key.toLowerCase()==='i'){if(scope()===$('shell'))showIptv();}
  else if(e.key.toLowerCase()==='p'&&playing)playbackDialog();
});
let lastPadAction='',lastPadAt=0;
function controller(){const pad=[...(navigator.getGamepads?.()||[])].find(Boolean);if(pad){const b=pad.buttons;const action=b[0]?.pressed?'select':b[1]?.pressed?'back':b[12]?.pressed||pad.axes[1]<-.55?'ArrowUp':b[13]?.pressed||pad.axes[1]>.55?'ArrowDown':b[14]?.pressed||pad.axes[0]<-.55?'ArrowLeft':b[15]?.pressed||pad.axes[0]>.55?'ArrowRight':'';const now=performance.now();if(action&&(action!==lastPadAction||(action.startsWith('Arrow')&&now-lastPadAt>230))){if(document.body.classList.contains('iptv-playing')&&typeof window.handleIptvPlayerControl==='function'&&window.handleIptvPlayerControl(action)){}else if(action==='select')document.activeElement?.click();else if(action==='back')back();else move(action);lastPadAt=now;}lastPadAction=action;}requestAnimationFrame(controller);}
setInterval(async()=>{if(!playing)return;try{await api({action:'heartbeat'});if(!state.slots.some(s=>s.client===client)){clearInterval(timer);playing=null;modal('Playback stopped','<p>This connection was released by another local client.</p>',`<button class="primary focusable" onclick="closeModal()">Back</button>`);}}catch(error){clearInterval(timer);playing=null;errorDialog(error);}},10000);
window.addEventListener('pagehide',()=>{fetch('/api/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'release',client}),keepalive:true}).catch(()=>{});});
$('shell').querySelector('.footer').insertAdjacentHTML('beforeend','<span><b>P</b> Playback</span>');
api().then(async()=>{if(typeof migrateProfilePreferences==='function')await migrateProfilePreferences();if(mode!=='lite'||!localStorage.getItem(profileStorageKey)||app.profile==='Visitors')showProfiles();else await render();controller();}).catch(errorDialog);


