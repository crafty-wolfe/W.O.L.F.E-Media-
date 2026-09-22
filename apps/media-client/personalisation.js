/* Local profile preferences. They tailor presentation only and never leave this PC. */
const preferenceKey='wolfe_profile_preferences_v1';
const visitorPreferenceKey='wolfe_visitor_preferences_session';
const bedroomDeviceKey='wolfe_lite_device_id';
const profileAvatars={wolf:'Wolf',orbit:'Orbit',sunset:'Sunset',forest:'Forest',violet:'Violet',cloud:'Cloud'};
const defaultPreference={completed:false,age:'Adult',genres:['Sci-Fi'],moods:['New releases'],avatar:'orbit'};
const preferenceStore=()=>{try{return JSON.parse(localStorage.getItem(preferenceKey)||'{}');}catch{return {};}};
const visitorPreference=()=>{try{return JSON.parse(sessionStorage.getItem(visitorPreferenceKey)||'{}');}catch{return {};}};
function preferenceFor(name=app.profile){const stored=name==='Visitors'?visitorPreference():(state.profilePreferences?.[name]||preferenceStore()[name]||{});return {...defaultPreference,avatar:name==='Mike'?'wolf':'orbit',...stored};}
function needsProfileSetup(name=app.profile){return name==='Visitors'||!preferenceFor(name).completed;}
async function savePreference(name,value){const next={...defaultPreference,...value,completed:true};if(name==='Visitors'){sessionStorage.setItem(visitorPreferenceKey,JSON.stringify(next));return next;}const saved=preferenceStore();saved[name]=next;localStorage.setItem(preferenceKey,JSON.stringify(saved));await api({action:'saveProfilePreferences',profile:name,preferences:next});return next;}
async function migrateProfilePreferences(){
  const local=preferenceStore(),remote=state.profilePreferences||{};
  for(const [name,preference] of Object.entries(local))if(name!=='Visitors'&&preference?.completed&&!remote[name]?.completed)await api({action:'saveProfilePreferences',profile:name,preferences:preference});
  if(!state.profilePreferences?.Mike?.completed)await api({action:'saveProfilePreferences',profile:'Mike',preferences:{...defaultPreference,completed:true,avatar:'wolf'}});
}
function avatarMarkup(avatar,label,large=false){
  const suffix=large?' profile-avatar-large':'';
  return avatar==='wolf'?`<span class="profile-avatar avatar-wolf${suffix}"><img src="assets/wolfe-mark-v4.png" alt=""></span>`:`<span class="profile-avatar avatar-${avatar}${suffix}">${escapeHtml(label).slice(0,2)}</span>`;
}
function applyProfileAppearance(){
  const pref=preferenceFor();
  const chip=$('profileInitial');
  if(!chip)return;
  chip.className=`avatar profile-chip-avatar avatar-${pref.avatar}`;
  chip.innerHTML=pref.avatar==='wolf'?'<img src="assets/wolfe-mark-v4.png" alt="">':escapeHtml((profiles.find(p=>p[0]===app.profile)||['?','?'])[1]);
}
function profileCanUseKids(profile=app.profile){return ['Alfie','Brooke','Elsie-Joan'].includes(profile);}
function applyProfileNavigation(){const kidsButton=nav.querySelector('[data-tab="kids"]');if(kidsButton)kidsButton.hidden=!profileCanUseKids();}
function profileAvatarChoices(selected){
  const permitted=app.profile==='Mike'?Object.keys(profileAvatars):Object.keys(profileAvatars).filter(key=>key!=='wolf');
  return permitted.map(key=>`<button type="button" class="avatar-choice focusable ${key===selected?'selected':''}" data-avatar="${key}" aria-pressed="${key===selected}">${avatarMarkup(key,profileAvatars[key],true)}<span>${profileAvatars[key]}</span></button>`).join('');
}
function showProfileSetup(editing=false){
  const preference=preferenceFor();
  const selectedGenres=preference.genres||[];
  const selectedMoods=preference.moods||[];
  const genreChoices=['Sci-Fi','Action','Drama','Comedy','Crime','Documentaries','Family','Animation','Fantasy','Reality'];
  const moodChoices=['New releases','Easy watch','Big adventures','Feel-good','Mystery nights','Family nights'];
  const chips=(items,selected,group)=>items.map(item=>`<button type="button" class="choice-pill focusable ${selected.includes(item)?'selected':''}" data-choice-group="${group}" data-choice="${item}" aria-pressed="${selected.includes(item)}">${item}</button>`).join('');
  modal(editing?`Personalise ${app.profile}`:`Welcome, ${app.profile}`,`<div class="profile-setup"><p>${editing?'Update the choices that shape your home screen.':'Choose a few things you enjoy. W.O.L.F.E will use them for your recommendations.'}</p><section><h3>Age group</h3><div class="choice-row" id="ageChoices">${['3–7','8–12','13–17','Adult'].map(age=>`<button type="button" class="choice-pill focusable ${preference.age===age?'selected':''}" data-age="${age}" aria-pressed="${preference.age===age}">${age}</button>`).join('')}</div></section><section><h3>What do you like to watch?</h3><p class="setup-hint">Choose up to three.</p><div class="choice-row" id="genreChoices">${chips(genreChoices,selectedGenres,'genre')}</div></section><section><h3>Your usual mood</h3><div class="choice-row" id="moodChoices">${chips(moodChoices,selectedMoods,'mood')}</div></section><section><h3>Choose a profile picture</h3><div class="avatar-choice-row" id="avatarChoices">${profileAvatarChoices(preference.avatar)}</div>${app.profile==='Mike'?'<p class="setup-hint">The neon W.O.L.F.E mark is exclusive to Mike’s profile.</p>':''}</section></div>`,`<button class="secondary focusable" onclick="closeModal()">${editing?'Cancel':'Not now'}</button><button class="primary focusable" id="saveProfileSetup">${editing?'Save changes':'Save my profile'}</button>`);
  let age=preference.age,genres=[...selectedGenres],moods=[...selectedMoods],avatar=preference.avatar;
  $('ageChoices').querySelectorAll('[data-age]').forEach(button=>button.onclick=()=>{age=button.dataset.age;$('ageChoices').querySelectorAll('[data-age]').forEach(item=>{const active=item===button;item.classList.toggle('selected',active);item.setAttribute('aria-pressed',active);});});
  const choose=(group,limit,values,setValues)=>{
    $(group).querySelectorAll('[data-choice]').forEach(button=>button.onclick=()=>{
      const value=button.dataset.choice,exists=values.includes(value);
      if(!exists&&values.length>=limit)return;
      values=exists?values.filter(item=>item!==value):[...values,value];
      setValues(values);
      $(group).querySelectorAll('[data-choice]').forEach(item=>{const active=values.includes(item.dataset.choice);item.classList.toggle('selected',active);item.setAttribute('aria-pressed',active);});
    });
  };
  choose('genreChoices',3,genres,value=>genres=value);
  choose('moodChoices',2,moods,value=>moods=value);
  $('avatarChoices').querySelectorAll('[data-avatar]').forEach(button=>button.onclick=()=>{avatar=button.dataset.avatar;$('avatarChoices').querySelectorAll('[data-avatar]').forEach(item=>{const active=item===button;item.classList.toggle('selected',active);item.setAttribute('aria-pressed',active);});});
  $('saveProfileSetup').onclick=async()=>{const button=$('saveProfileSetup');button.disabled=true;button.textContent='Saving…';try{await savePreference(app.profile,{age,genres:genres.length?genres:['Family'],moods:moods.length?moods:['Easy watch'],avatar});closeModal();render();}catch(error){button.disabled=false;button.textContent=editing?'Save changes':'Save my profile';errorDialog(error);}};
}
function personalisedRecommendationRows(){
  const preference=preferenceFor();
  if(!preference.completed)return `${v3Row('Recommended for You',homeRecommended,true)}${v3Row('Popular Box Sets',boxSets,true)}`;
  const genre=(preference.genres||[])[0]||'Family';
  const selections={
    'Sci-Fi':[homeRecommended[0],homeRecommended[2],homeRecommended[4],boxSets[0],boxSets[3]],
    Action:[homeRecommended[2],homeRecommended[4],boxSets[4],onDemandTrending[3],onDemandTrending[4]],
    Drama:[homeRecommended[1],homeRecommended[2],homeRecommended[5],boxSets[1],boxSets[5]],
    Comedy:[homeRecommended[1],homeRecommended[3],homeRecommended[5],onDemandTrending[0],onDemandTrending[6]],
    Crime:[homeRecommended[2],homeRecommended[4],boxSets[4],boxSets[5],onDemandTrending[1]],
    Documentaries:[boxSets[3],onDemandTrending[2],onDemandTrending[6],homeRecommended[3],homeRecommended[0]],
    Family:[homeRecommended[3],homeRecommended[5],onDemandTrending[5],onDemandTrending[6],boxSets[3]],
    Animation:[homeRecommended[3],homeRecommended[5],onDemandTrending[0],onDemandTrending[5],onDemandTrending[6]],
    Fantasy:[homeRecommended[0],homeRecommended[3],boxSets[0],boxSets[3],onDemandTrending[4]],
    Reality:[homeRecommended[1],homeRecommended[5],onDemandTrending[2],onDemandTrending[6],boxSets[1]]
  };
  const watched=(watch[app.profile]||[])[0]?.[0]||'your recent picks';
  return `${v3Row(`Picked for ${app.profile} · ${genre}`,selections[genre]||selections.Family,true)}${v3Row(`Because you watched ${watched}`,[homeRecommended[2],homeRecommended[4],boxSets[4],onDemandTrending[1],onDemandTrending[3]],true)}${v3Row('Popular Box Sets',boxSets,true)}`;
}
const renderWithPersonalisation=render;
render=function(){if(app.tab==='kids'&&!profileCanUseKids())app.tab='home';renderWithPersonalisation();applyProfileAppearance();applyProfileNavigation();};
const profilesWithAvatars=showProfiles;
showProfiles=function(){
  profilesWithAvatars();
  $('profileGrid').querySelectorAll('.profile').forEach((button,index)=>{
    const [name,,description]=profiles[index];
    const avatar=preferenceFor(name).avatar;
    button.classList.add('profile-personalised');
    button.innerHTML=`${avatarMarkup(avatar,name,true)}<h3>${escapeHtml(name)}</h3><small>${escapeHtml(description)}</small>`;
    button.onclick=async()=>{saveActiveProfile(name);$('profileOverlay').classList.add('hidden');app.tab='home';await render();if(needsProfileSetup(name)&&!document.body.classList.contains('library-loading'))showProfileSetup(false);};
  });
};
$('profileChip').onclick=showProfiles;
$('profileChip').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showProfiles();}};
applyProfileAppearance();
const onDemandNav=nav.querySelector('[data-tab="ondemand"]');
if(onDemandNav)onDemandNav.onclick=()=>openIptvPortal();

function bedroomDevice(){
  let device=localStorage.getItem(bedroomDeviceKey);
  if(!device){device=crypto.randomUUID();localStorage.setItem(bedroomDeviceKey,device);}
  return device;
}
async function requestBedroomProfile(profile){
  try{
    await api({action:'requestProfileChange',device:bedroomDevice(),profile,mode:'lite'});
    modal('Request sent',`<p>The Main screen has been notified that this bedroom is requesting the <b>${escapeHtml(profile)}</b> profile. It will stay on ${escapeHtml(app.profile)} until Mike approves the change.</p>`,`<button class="primary focusable" onclick="closeModal()">Done</button>`);
  }catch(error){errorDialog(error);}
}
function showBedroomProfileRequest(){
  if(mode!=='lite'){showProfiles();return;}
  const choices=profiles.map(([name,,description])=>`<button class="profile-request focusable" data-request-profile="${name}">${avatarMarkup(preferenceFor(name).avatar,name)}<span><b>${escapeHtml(name)}</b><small>${escapeHtml(description)}</small></span><em>Request ›</em></button>`).join('');
  modal('Change my profile',`<div class="bedroom-request"><p>Choose the profile for this bedroom. Mike must approve the request from Main Settings before it changes here.</p>${choices}</div>`,`<button class="secondary focusable" onclick="closeModal()">Cancel</button>`);
  $('modalBody').querySelectorAll('[data-request-profile]').forEach(button=>button.onclick=()=>requestBedroomProfile(button.dataset.requestProfile));
}
async function hashPin(pin){
  const bytes=new TextEncoder().encode(`wolfe-media-center:${pin}`);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');
}
function showMikePinSetup(onComplete){
  modal('Set your Mike PIN',`<div class="pin-setup"><p>Set one six-digit PIN for protected IPTV controls and bedroom profile approvals on this PC.</p><label>Six-digit PIN<input id="newMikePin" class="focusable" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></label><label>Confirm PIN<input id="confirmMikePin" class="focusable" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></label></div>`,`<button class="secondary focusable" onclick="closeModal()">Cancel</button><button class="primary focusable" id="saveMikePin">Save PIN</button>`);
  $('saveMikePin').onclick=async()=>{const first=$('newMikePin').value,second=$('confirmMikePin').value;if(!/^\d{6}$/.test(first)||first!==second){modal('Check your PIN','<p>Enter the same six-digit PIN twice.</p>','<button class="primary focusable" id="retryMikePin">Back</button>');$('retryMikePin').onclick=()=>showMikePinSetup(onComplete);return;}localStorage.setItem('wolfe_mike_pin_hash_v1',await hashPin(first));onComplete();};
}
function requireMikePin(onComplete){
  if(app.profile!=='Mike'){modal('Mike profile required','<p>Only Mike can approve bedroom changes or change IPTV information.</p>',`<button class="primary focusable" onclick="closeModal()">Back</button>`);return;}
  if(!localStorage.getItem('wolfe_mike_pin_hash_v1')){showMikePinSetup(onComplete);return;}
  modal('Enter Mike PIN',`<div class="pin-setup"><p>Enter your six-digit PIN to continue.</p><label>PIN<input id="mikePin" class="focusable" type="password" inputmode="numeric" maxlength="6" autocomplete="current-password"></label></div>`,`<button class="secondary focusable" onclick="closeModal()">Cancel</button><button class="primary focusable" id="verifyMikePin">Continue</button>`);
  $('verifyMikePin').onclick=async()=>{const pin=$('mikePin').value;if(!/^\d{6}$/.test(pin)||(await hashPin(pin))!==localStorage.getItem('wolfe_mike_pin_hash_v1')){modal('Incorrect PIN','<p>That PIN did not match.</p>',`<button class="primary focusable" onclick="closeModal()">Back</button>`);return;}onComplete();};
}
function openMikeIptvControls(){modal('IPTV controls','<p>Provider details, category visibility, service shelves and the connection manager are protected by your Mike PIN.</p>','<button class="secondary focusable" onclick="closeModal()">Back</button><button class="secondary focusable" onclick="openIptvConnectionManager()">Connections</button><button class="secondary focusable" onclick="openIptvCategoryManager()">Categories</button><button class="secondary focusable" onclick="openIptvCategoryManager(\'services\')">Series services</button><button class="primary focusable" onclick="openIptvProviderSetup()">Provider details</button>');}
function showMikeIptvControls(){requireMikePin(openMikeIptvControls);}
const demoIptvManager=showIptv;
const rawIptvSetup=showIptvSetup;
function openIptvConnectionManager(){demoIptvManager();}
function openIptvProviderSetup(){rawIptvSetup();}
showIptv=function(){if(app.profile!=='Mike'){openIptvPortal();return;}requireMikePin(openIptvConnectionManager);};
showIptvSetup=function(){if(app.profile!=='Mike'){modal('Mike profile required','<p>Only Mike can change IPTV provider information.</p>',`<button class="primary focusable" onclick="closeModal()">Back</button>`);return;}requireMikePin(openIptvProviderSetup);};
let activeIptvCategory='',iptvHls;
async function openIptvPortal(category=''){
  activeIptvCategory=category;
  $('content').innerHTML=`<div class="v3-page iptv-v3"><section class="iptv-loading"><span></span><b>Loading your IPTV library…</b></section></div>`;
  try{
    let status=await iptvApi('/api/iptv/status');
    const legacy=(()=>{try{return JSON.parse(localStorage.getItem('wolfe_xtream')||'{}');}catch{return {};}})();
    if(!status.configured&&legacy.url&&legacy.user&&legacy.password){status=await iptvApi('/api/iptv/config',legacy);localStorage.removeItem('wolfe_xtream');}
    if(!status.configured){renderIptvPortal(status,[],[]);return;}
    const catalogue=await iptvApi(`/api/iptv/catalog?category=${encodeURIComponent(category)}&kind=movie&limit=120`);
    status=await iptvApi('/api/iptv/status');
    renderIptvPortal(status,catalogue.categories,catalogue.items);
  }catch(error){$('content').innerHTML=`<div class="v3-page iptv-v3"><section class="iptv-banner"><div><div class="eyebrow">W.O.L.F.E IPTV</div><h1>CONNECTION ISSUE</h1><p>${escapeHtml(error.message)}</p><div class="actions"><button class="secondary focusable" onclick="closeIptvPortal()">Back to Apps</button>${app.profile==='Mike'?'<button class="primary focusable" onclick="showMikeIptvControls()">Check IPTV controls</button>':''}</div></div></section></div>`;focusFirst();}
}
function renderIptvPortal(status,categories,items){
  const configured=Boolean(status.configured), connected=Boolean(status.connected);
  const categoryButtons=categories.slice(0,20).map(category=>`<button class="filter focusable ${activeIptvCategory===category.id?'active':''}" data-iptv-category="${escapeHtml(category.id)}">${escapeHtml(category.name)}</button>`).join('');
  const titles=items.map(item=>`<button class="iptv-title-card focusable" data-iptv-title="${escapeHtml(item.id)}">${item.poster?`<img class="iptv-card-art" src="${escapeHtml(item.poster)}" alt="">`:'<span class="iptv-card-art">▶</span>'}<span><b>${escapeHtml(item.title)}</b><small>${escapeHtml([item.year,item.rating&&`★ ${item.rating}`].filter(Boolean).join(' · ')||'On demand')}</small></span></button>`).join('');
  $('content').innerHTML=`<div class="v3-page iptv-v3"><section class="iptv-banner"><div><div class="eyebrow">W.O.L.F.E IPTV</div><h1>ON DEMAND</h1><p>${connected?`${status.titleCount.toLocaleString()} titles imported from your provider. Browse a category or select a title to play.`:'Your provider details are saved. Importing the on-demand library now.'}</p><div class="actions"><button class="secondary focusable" onclick="closeIptvPortal()">Back to Apps</button>${app.profile==='Mike'?'<button class="primary focusable" onclick="showMikeIptvControls()">IPTV controls</button>':''}</div></div><div class="iptv-status ${connected?'connected':''}"><b>${connected?'●':'○'}</b><strong>${connected?'Provider connected':'Provider not connected'}</strong><small>${connected?`${status.categoryCount} categories imported`:'Set up from Mike’s profile'}</small></div></section>${connected?`<div class="filter-row iptv-filters"><button class="filter focusable ${!activeIptvCategory?'active':''}" data-iptv-category="">All</button>${categoryButtons}</div><section class="iptv-library"><h2>${activeIptvCategory?(categories.find(category=>category.id===activeIptvCategory)?.name||'On demand'):'All on demand'}</h2><div class="iptv-title-grid">${titles||'<p class="empty-library">No titles were returned for this category.</p>'}</div></section>`:'<div class="iptv-guidance"><div><b>On-demand first</b><span>Films and series appear here before live television.</span></div><div><b>Family profiles</b><span>Suggestions and progress stay with the chosen profile.</span></div><div><b>Two connections</b><span>The protected manager remains available to Mike.</span></div></div>'}</div>`;
  $('content').querySelectorAll('[data-iptv-category]').forEach(button=>button.onclick=()=>openIptvPortal(button.dataset.iptvCategory));
  $('content').querySelectorAll('[data-iptv-title]').forEach(button=>{const item=items.find(title=>title.id===button.dataset.iptvTitle);button.onclick=()=>playIptvTitle(item);});
  document.querySelectorAll('.nav').forEach(button=>button.classList.toggle('active',button.dataset.tab==='apps'));
  focusFirst();
}
async function playIptvTitle(item){
  if(!item)return;
  if(item.kind==='series'){showIptvTitleDetails(item);return;}
  try{
    if(playing){modal('IPTV already playing',`<p><b>${escapeHtml(playing.title)}</b> is already using this window’s IPTV connection.</p>`,`<button class="primary focusable" onclick="closeModal()">Back</button>`);return;}
    const readiness=await iptvApi(`/api/iptv/playback-check?id=${encodeURIComponent(item.id)}`);
    if(!readiness.playable){
      const message=readiness.reason==='network_blocked'
        ? 'This network is blocking the video server before W.O.L.F.E can reach it. Your catalogue is still available because it uses a separate provider address. Try playback from a personal or home network that permits your provider.'
        : readiness.reason==='unexpected_response'
          ? 'Your provider returned a web page instead of a video stream for this title. Try another title or check the provider service.'
          : readiness.reason==='unreachable'
            ? 'W.O.L.F.E could not reach the provider’s video server. Check the local network connection and try again.'
            : 'Your provider did not make this title available for playback. Try another title or check the provider service.';
      modal('Playback unavailable',`<p>${message}</p>`,`<button class="primary focusable" onclick="closeModal()">Back to library</button>`);
      return;
    }
    const result=await api({action:'acquire',profile:app.profile,title:item.title,mode});
    if(result.blocked){demoIptvManager();return;}
    await api({action:'watch',profile:app.profile,title:item.title});
    playing={title:item.title,profile:app.profile,percent:0,iptv:true};
    modal(item.title,`<div class="iptv-player"><video id="iptvVideo" class="iptv-video" controls autoplay playsinline></video><p id="iptvPlayerMessage">Connecting to your provider…</p></div>`,`<button class="secondary focusable" onclick="stopIptvPlayback()">Stop</button>`);
    const video=$('iptvVideo'),stream=`/api/iptv/stream?id=${encodeURIComponent(item.id)}`;
    video.onplaying=()=>{$('iptvPlayerMessage').textContent='Playing from your IPTV provider.';};
    video.onerror=()=>{$('iptvPlayerMessage').textContent=`The provider sent a ${item.extension||'video'} stream that this browser could not play. Try another title or check your provider.`;};
    if(item.extension==='m3u8'&&window.Hls&&Hls.isSupported()){iptvHls=new Hls();iptvHls.loadSource(stream);iptvHls.attachMedia(video);}else{video.src=stream;video.play().catch(()=>{});}
  }catch(error){errorDialog(error);}
}
async function stopIptvPlayback(){try{iptvHls?.destroy();iptvHls=null;await api({action:'release'});playing=null;closeModal();}catch(error){errorDialog(error);}}
function closeIptvPortal(){app.tab='apps';render();focusFirst();}
function approveBedroomRequest(requestId){requireMikePin(async()=>{try{await api({action:'approveProfileChange',requestId});render();showMainProfileRequests();}catch(error){errorDialog(error);}});}
function showMainProfileRequests(){
  const requests=state.profileRequests||[];
  if(!requests.length){modal('Bedroom profile requests','<p>There are no pending bedroom profile requests.</p>',`<button class="primary focusable" onclick="closeModal()">Done</button>`);return;}
  const rows=requests.map(request=>`<div class="profile-request"><span>${avatarMarkup(preferenceFor(request.profile).avatar,request.profile)}</span><span><b>${escapeHtml(request.profile)}</b><small>Bedroom request · awaiting approval</small></span><button class="primary focusable" data-approve-request="${request.id}">Approve</button></div>`).join('');
  modal('Bedroom profile requests',`<div class="bedroom-request"><p>Approve a request with your Mike PIN. The chosen bedroom will then open using that profile.</p>${rows}</div>`,`<button class="secondary focusable" onclick="closeModal()">Back</button>`);
  $('modalBody').querySelectorAll('[data-approve-request]').forEach(button=>button.onclick=()=>approveBedroomRequest(button.dataset.approveRequest));
}
function renderPersonalSettings(){
  const requests=(state.profileRequests||[]).length;
  const heading=`<div class="library-heading"><div class="eyebrow">W.O.L.F.E MEDIA</div><h1>Settings</h1><p>${mode==='lite'?'This bedroom stays with its approved profile.':'Choose who is watching or manage this local media centre.'}</p></div>`;
  const cards=mode==='lite'
    ?`<button class="setting focusable" onclick="showProfileSetup(true)"><b>✦</b><span>Personalise ${escapeHtml(app.profile)}<small>Likes, age group and profile picture</small></span></button><button class="setting focusable" onclick="showBedroomProfileRequest()"><b>⇄</b><span>Change my profile<small>Send a request to Main for Mike to approve</small></span></button>`
    :`<button class="setting focusable" onclick="showProfiles()"><b>◉</b><span>Choose a profile<small>${escapeHtml(app.profile)} selected</small></span></button><button class="setting focusable" onclick="showProfileSetup(true)"><b>✦</b><span>Personalise ${escapeHtml(app.profile)}<small>Likes, age group and profile picture</small></span></button>${app.profile==='Mike'?`<button class="setting focusable" onclick="showMikeIptvControls()"><b>▣</b><span>IPTV controls<small>Protected with your six-digit Mike PIN</small></span></button><button class="setting focusable ${requests?'setting-notification':''}" onclick="showMainProfileRequests()"><b>⇄</b><span>Bedroom requests<small>${requests?`${requests} waiting for approval`:'No pending requests'}</small></span></button>`:`<button class="setting focusable" onclick="details('IPTV')"><b>▣</b><span>IPTV controls<small>Available from Mike’s profile</small></span></button><button class="setting focusable ${requests?'setting-notification':''}" onclick="details('Bedroom requests')"><b>⇄</b><span>Bedroom requests<small>${requests?'Waiting for Mike’s approval':'Managed from Mike’s profile'}</small></span></button>`}<button class="setting focusable" onclick="details('Integrations')"><b>⌁</b><span>Integrations<small>Home Assistant, Tapo and Alexa inactive</small></span></button>`;
  $('content').innerHTML=`<div class="v3-page settings-v3">${heading}<div class="settings-grid">${cards}</div></div>`;
}
settings=renderPersonalSettings;
if(mode==='lite'){
  setInterval(async()=>{try{await api();const assignment=state.profileAssignments?.[bedroomDevice()];if(assignment&&assignment.profile!==app.profile){saveActiveProfile(assignment.profile);render();if(needsProfileSetup())setTimeout(()=>showProfileSetup(false),120);}}catch{}} ,5000);
}else{
  setInterval(async()=>{try{await api();if(app.tab==='settings'&&$('modal').classList.contains('hidden'))render();}catch{}} ,5000);
}

function preferenceTerms(genre){return ({
  'Sci-Fi':['sci-fi','science fiction','sci fi','space'],Action:['action','adventure','war'],Drama:['drama','romance'],Comedy:['comedy'],Crime:['crime','thriller','mystery'],Documentaries:['documentary','factual','nature'],Family:['family','kids','animation'],Animation:['animation','cartoon','anime'],Fantasy:['fantasy'],Reality:['reality','tv shows']
}[genre]||[genre.toLowerCase()]);}
function catalogueKey(item){return String(item?.title||'').trim().toLocaleLowerCase();}
function uniqueTitles(items){const known=new Set();return items.filter(item=>{const key=catalogueKey(item);if(!key||known.has(key))return false;known.add(key);return true;});}
function takeUnused(items,used,limit){const result=[];for(const item of items){const key=catalogueKey(item);if(!key||used.has(key))continue;used.add(key);result.push(item);if(result.length===limit)break;}return result;}
async function resolveContinueWatching(history,page,seededItems=[]){
  const titles=Object.entries(history||{}).sort(([,left],[,right])=>right.watchedAt-left.watchedAt).map(([title])=>title).slice(0,8);
  if(!titles.length)return [];
  const direct=new Map(seededItems.map(item=>[catalogueKey(item),item]));
  const missing=titles.filter(title=>!direct.has(catalogueKey({title})));
  const searchTitle=title=>String(title).replace(/\s*-\s*S\d{1,3}\s*E\d{1,3}(?:\s*-.*)?$/i,'').trim()||title;
  const found=await Promise.all(missing.map(async title=>{
    try{const response=await iptvApi(`/api/iptv/search?q=${encodeURIComponent(searchTitle(title))}&limit=12`);return response.items||[];}catch{return []}
  }));
  for(let index=0;index<missing.length;index++){
    const key=catalogueKey({title:missing[index]});
    const candidates=titlesForProviderPage(page,found[index]).filter(item=>item.kind!=='live');
    const match=candidates.find(item=>catalogueKey(item)===key)||candidates[0];
    if(match)direct.set(key,match);
  }
  return titles.map(title=>direct.get(catalogueKey({title}))).filter(Boolean);
}
function displayCategory(category){return String(category||'On demand').replace(/\b(?:19|20)\d{2}\b/g,'').replace(/\bvod\b/gi,'').replace(/[|_]+/g,' · ').replace(/\s*·\s*·\s*/g,' · ').replace(/^\s*[·\-]+|[·\-]+\s*$/g,'').replace(/\s{2,}/g,' ').trim()||'On demand';}
function titleMeta(item){return [item.kind==='live'?'Live TV':displayCategory(item.categoryName),item.kind==='live'?displayCategory(item.categoryName):item.year,item.rating&&`★ ${item.rating}`].filter(Boolean).join(' · ');}
function openCatalogueTitle(item){if(!item)return;if(item.kind==='series'){openSeriesDetails(item);return;}playIptvTitle(item);}
function homeIptvCard(item){return `<button class="card v3-media-card provider-v3-card home-provider-card focusable" data-home-iptv-title="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.title)}, ${escapeHtml(titleMeta(item))}">${item.poster?`<img src="${escapeHtml(item.poster)}" alt="">`:'<span class="provider-art">▶</span>'}<span class="shade"></span><span class="meta"><b>${escapeHtml(item.title)}</b><small>${escapeHtml(titleMeta(item))}</small></span></button>`;}
function autonomousRail(title,items){return `<section class="row autonomous-rail"><h2 class="rowTitle">${escapeHtml(title)} <span>›</span></h2><div class="cards">${items.map(homeIptvCard).join('')}</div></section>`;}
function featuredPosterUrl(item){
  const poster=String(item?.poster||'');
  return /^https?:\/\//i.test(poster)?poster:'';
}
function featuredMeta(item){
  const values=[item.year||'On demand',displayCategory(item.categoryName)].filter(Boolean);
  const badges=[];
  if(item.rating)badges.push(`★ ${escapeHtml(item.rating)}`);
  badges.push('IPTV');
  return `${values.map(value=>escapeHtml(value)).join(' <i></i> ')}${badges.map(value=>`<b>${value}</b>`).join('')}`;
}
function showIptvTitleDetails(item){
  const poster=featuredPosterUrl(item);
  const detail=[displayCategory(item.categoryName),item.year,item.rating&&`★ ${item.rating}`].filter(Boolean).join(' · ')||'On demand';
  const isSeries=item.kind==='series';
  if(isSeries){openSeriesDetails(item);return;}
  modal(item.title,`<div class="iptv-title-details">${poster?`<img src="${escapeHtml(poster)}" alt="">`:''}<div><div class="eyebrow">${isSeries?'IPTV SERIES':'IPTV ON DEMAND'}</div><p>${escapeHtml(detail)}</p><p>${isSeries?'This box set is in your IPTV Series library.':'This title is available from your connected IPTV library.'}</p></div></div>`,isSeries?`<button class="primary focusable" onclick="closeModal()">Back to series</button>`:`<button class="secondary focusable" onclick="closeModal()">Back</button><button id="watchIptvDetail" class="primary focusable">▶ &nbsp; Watch now</button>`);
  if(!isSeries)$('watchIptvDetail').onclick=()=>playIptvTitle(item);
}
function seriesEpisodeCard(episode){
  const meta=[`S${episode.season} · E${episode.episode}`,episode.duration,episode.rating&&`★ ${episode.rating}`].filter(Boolean).join(' · ');
  return `<button class="series-episode focusable" data-series-episode="${escapeHtml(episode.id)}">${episode.poster?`<img src="${escapeHtml(episode.poster)}" alt="">`:'<span class="episode-placeholder">▶</span>'}<span><b>${escapeHtml(episode.title)}</b><small>${escapeHtml(meta)}</small>${episode.description?`<p>${escapeHtml(episode.description)}</p>`:'<p>No episode description was supplied by the provider.</p>'}</span><em>Play</em></button>`;
}
async function openSeriesDetails(item){
  modal(item.title,`<div class="series-detail-loading"><span></span><p>Loading series details and episodes…</p></div>`,`<button class="secondary focusable" onclick="closeModal()">Back to series</button>`);
  try{
    const data=await iptvApi(`/api/iptv/series?id=${encodeURIComponent(item.id)}`);
    const series=data.series||item;let activeSeason=data.seasons?.[0]||'';
    const renderSeason=season=>{
      activeSeason=season;
      const episodes=(data.episodes||[]).filter(episode=>episode.season===activeSeason);
      const facts=[series.year,series.genre,series.rating&&`★ ${series.rating}`].filter(Boolean).join(' · ');
      $('modalBody').innerHTML=`<div class="series-detail">${series.backdrop?`<img class="series-backdrop" src="${escapeHtml(series.backdrop)}" alt="">`:''}<div class="series-summary">${series.poster?`<img class="series-poster" src="${escapeHtml(series.poster)}" alt="">`:''}<div><div class="eyebrow">IPTV SERIES</div><h3>${escapeHtml(series.title)}</h3><small>${escapeHtml(facts||'Series')}</small><p>${escapeHtml(series.description||'No series description was supplied by the provider.')}</p>${series.director?`<p class="series-credit"><b>Director</b> ${escapeHtml(series.director)}</p>`:''}${series.cast?`<p class="series-credit"><b>Cast</b> ${escapeHtml(series.cast)}</p>`:''}</div></div><div class="season-picker">${(data.seasons||[]).map(value=>`<button class="filter focusable ${value===activeSeason?'active':''}" data-series-season="${escapeHtml(value)}">Season ${escapeHtml(value)}</button>`).join('')}</div><div class="episode-list">${episodes.length?episodes.map(seriesEpisodeCard).join(''):'<p class="empty-provider-rail">No episodes were returned for this season.</p>'}</div></div>`;
      $('modalBody').querySelectorAll('[data-series-season]').forEach(button=>button.onclick=()=>renderSeason(button.dataset.seriesSeason));
      $('modalBody').querySelectorAll('[data-series-episode]').forEach(button=>{const episode=episodes.find(entry=>entry.id===button.dataset.seriesEpisode);button.onclick=()=>playIptvTitle(episode);});
    };
    renderSeason(activeSeason);
  }catch(error){$('modalBody').innerHTML=`<div class="series-detail-error"><p>${escapeHtml(error.message||'Series details could not be loaded.')}</p></div>`;}
}
function setIptvFeaturedTitle(hero,item){
  if(!hero||!item)return;
  const poster=featuredPosterUrl(item);
  hero.classList.add('iptv-feature');
  hero.querySelector('.iptv-feature-art')?.remove();
  if(poster){
    hero.style.backgroundImage='linear-gradient(135deg,#071a2f,#020913 68%)';
    const artwork=document.createElement('img');
    artwork.className='iptv-feature-art';artwork.src=poster;artwork.alt='';artwork.decoding='async';
    hero.prepend(artwork);
  }
  const eyebrow=hero.querySelector('.eyebrow'),title=hero.querySelector('h1'),subtitle=hero.querySelector('h3'),description=hero.querySelector('p'),meta=hero.querySelector('.feature-meta');
  if(eyebrow)eyebrow.textContent='FEATURED ON DEMAND';
  if(title)title.textContent=item.title;
  if(subtitle)subtitle.textContent='IPTV ON DEMAND';
  if(description)description.textContent=`Available now from your connected IPTV library${item.year?` · ${item.year}`:''}${item.rating?` · Rated ${item.rating}`:''}.`;
  if(meta)meta.innerHTML=featuredMeta(item);
  const watch=hero.querySelector('.primary');
  if(watch){watch.innerHTML=item.kind==='series'?'ⓘ &nbsp; View episodes':'▶ &nbsp; Watch now';watch.onclick=()=>openCatalogueTitle(item);}
  const info=hero.querySelector('.secondary');
  if(info){info.innerHTML='ⓘ &nbsp; More info';info.onclick=()=>showIptvTitleDetails(item);}
  hero.querySelectorAll('.actions .secondary').forEach((button,index)=>{if(index>0)button.remove();});
}
async function refreshAutonomousHome(){
  if(app.tab!=='home'||!$('content').querySelector('.home-v3'))return;
  const home=$('content').querySelector('.home-v3');
  try{
    await api();
    const status=await iptvApi('/api/iptv/status');
    if(!status.configured)throw new Error('IPTV is not connected. Mike can connect it in Settings.');
    const catalogue=await iptvApi('/api/iptv/catalog?limit=180');
    if(app.tab!=='home'||!home.isConnected)return;
    if(!catalogue.items?.length){home.innerHTML='<div class="library-empty"><h1>Your library is empty</h1><p>No visible titles were returned. Check category visibility in IPTV Settings.</p></div>';return;}
    const preference=preferenceFor(), genre=(preference.genres||['Family'])[0], terms=preferenceTerms(genre);
    const seen=state.watchHistory?.[app.profile]||{}, trending=state.trending||{};
    const available=uniqueTitles(catalogue.items);
    const unseen=available.filter(item=>!seen[item.title]);
    const matched=unseen.filter(item=>terms.some(term=>String(item.categoryName||'').toLowerCase().includes(term)||item.title.toLowerCase().includes(term)));
    const sortPopular=(left,right)=>(trending[right.title]?.count||0)-(trending[left.title]?.count||0)||Number(right.rating||0)-Number(left.rating||0)||right.added-left.added;
    const used=new Set();
    const picks=takeUnused((matched.length?matched:unseen).sort(sortPopular),used,8);
    const lastTitle=Object.entries(seen).sort(([,left],[,right])=>right.watchedAt-left.watchedAt)[0]?.[0];
    const source=available.find(item=>item.title===lastTitle);
    const because=source?takeUnused(available.filter(item=>item.id!==source.id&&item.categoryId===source.categoryId).sort(sortPopular),used,8):[];
    const popular=takeUnused(available.slice().sort(sortPopular),used,8);
    const featured=[...picks,...because,...popular,...available].find(item=>featuredPosterUrl(item))||picks[0]||because[0]||popular[0];
    setIptvFeaturedTitle(home.querySelector('.home-feature'),featured);
    home.querySelectorAll('.v3-row,.split-rows').forEach(row=>row.remove());
    const continueWatching=await resolveContinueWatching(seen,'ondemand',available);
    const rails=document.createElement('div');rails.className='autonomous-home-rails';rails.innerHTML=`${continueWatching.length?autonomousRail('Continue Watching',continueWatching):''}${autonomousRail(`Picked for ${app.profile} · ${genre}`,picks)}${because.length?autonomousRail(`Because you watched ${lastTitle}`,because):''}${autonomousRail('Trending in your home',popular)}`;
    home.appendChild(rails);
    home.querySelectorAll('[data-home-iptv-title]').forEach(button=>{const item=catalogue.items.find(title=>title.id===button.dataset.homeIptvTitle);button.onclick=()=>openCatalogueTitle(item);});
  }catch(error){throw error;}
}
const renderWithAutonomousHome=render;
render=function(){renderWithAutonomousHome();};
setInterval(()=>{if(app.tab==='home'&&$('modal').classList.contains('hidden'))refreshAutonomousHome().catch(()=>{});},300000);

const providerCategorySelection={ondemand:'',movies:'',series:'',kids:''};
function providerV3Card(item,compact=false){return `<button class="card v3-media-card provider-v3-card ${item.kind==='live'?'live-search-card':''} ${compact?'v3-compact':''} focusable" data-provider-title="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.title)}, ${escapeHtml(titleMeta(item))}">${item.poster?`<img src="${escapeHtml(item.poster)}" alt="">`:'<span class="provider-art">▶</span>'}${item.kind==='live'?'<span class="live-search-label">● LIVE TV</span>':''}<span class="shade"></span><span class="meta"><b>${escapeHtml(item.title)}</b><small>${escapeHtml(titleMeta(item))}</small></span></button>`;}
function serviceCategoryInfo(name){const text=String(name||'').toLowerCase();if(text.includes('netflix'))return {name:'Netflix',glyph:'N',style:'netflix'};if(text.includes('apple'))return {name:'Apple TV+',glyph:'tv+',style:'apple'};if(text.includes('paramount'))return {name:'Paramount+',glyph:'P+',style:'paramount'};if(text.includes('disney'))return {name:'Disney+',glyph:'D+',style:'disney'};if(text.includes('prime')||text.includes('amazon'))return {name:'Prime Video',glyph:'prime',style:'prime'};if(text.includes('hbo')||text.includes('max'))return {name:'Max',glyph:'max',style:'max'};if(text.includes('bbc'))return {name:'BBC',glyph:'BBC',style:'bbc'};if(text.includes('sky'))return {name:'Sky',glyph:'sky',style:'sky'};return null;}
function serviceIconMarkup(service){const local=['apple','paramount','netflix','prime','max','sky'].includes(service.style);return local?'<img class="service-logo" src="assets/services/'+service.style+'.svg" alt="'+escapeHtml(service.name||service.style)+'">':escapeHtml(service.name||'Series');}
function collectionArtwork(category,page){const art=(category.artwork?.length?category.artwork:[category.poster]).filter(Boolean).slice(0,3);return art.length?'<span class="collection-artwork '+(page==='movies'?'collection-montage':'')+'">'+art.map(url=>'<img src="'+escapeHtml(url)+'" alt="" loading="lazy">').join('')+'</span>':'<span class="provider-art">▦</span>';}
function providerCategoryCard(page,category){const service=page==='series'?(serviceCategoryInfo(category.name)||{name:'Series',glyph:'▦',style:'generic'}):null;const label=displayCategory(category.name);const subtitle=service?`${service.name} series`:category.titleCount?`${category.titleCount} titles`:'Collection';return `<button class="card v3-media-card provider-v3-card provider-category-card focusable" data-provider-collection="${escapeHtml(category.id)}" aria-label="${escapeHtml(label)}, ${escapeHtml(subtitle)}">${collectionArtwork(category,page)}<span class="shade"></span><span class="meta">${service?`<span class="provider-service-icon provider-service-${service.style}">${serviceIconMarkup(service)}</span>`:''}<b>${escapeHtml(label)}</b><small>${escapeHtml(subtitle)}</small></span></button>`;}
function renderProviderCollections(root,page,categories){
  root.querySelector('.provider-collection-rail')?.remove();
  if(!['movies','series'].includes(page)||providerCategorySelection[page])return;
  const collections=page==='movies'?categories.filter(WolfeCollections.isMovieCollection):categories;
  if(!collections.length)return;
  const rail=document.createElement('section');rail.className='row v3-row provider-collection-rail';
  rail.innerHTML='<h2 class="rowTitle">'+(page==='movies'?'Movie collections':'Series by service')+' <span>›</span></h2><div class="cards">'+collections.map(category=>providerCategoryCard(page,category)).join('')+'</div>';
  {
    const recent=[...root.querySelectorAll('.v3-row:not(.provider-collection-rail)')].find(row=>/recently added/i.test(row.querySelector('.rowTitle')?.textContent||''));
    if(recent)recent.insertAdjacentElement('afterend',rail);else root.appendChild(rail);
  }
  rail.querySelectorAll('[data-provider-collection]').forEach(button=>button.onclick=()=>{providerCategorySelection[page]=button.dataset.providerCollection;refreshProviderPage(page);});
}
function titlesForProviderPage(page,items){
  return WolfeCatalogueFilters.titlesForPage(page,items);
}
function relevantProviderCategories(page,categories){
  return WolfeCatalogueFilters.categoriesForPage(page,categories);
}
function byLatest(left,right){return right.added-left.added||Number(right.rating||0)-Number(left.rating||0);}
function attachProviderTiles(root,items){root.querySelectorAll('[data-provider-title]').forEach(button=>{const item=items.find(title=>title.id===button.dataset.providerTitle);button.onclick=()=>openCatalogueTitle(item);});}
async function refreshProviderPage(page){
  const root=page==='ondemand'?$('content').querySelector('.ondemand-v3'):$('content').querySelector('.library-v3');
  if(!root||app.tab!==page)return;
  try{
    await api();
    const status=await iptvApi('/api/iptv/status');
    if(!status.configured)throw new Error('IPTV is not connected. Mike can connect it in Settings.');
    const contentKind=page==='movies'||page==='ondemand'?'movie':page==='series'?'series':'';
    const catalogue=await iptvApi(`/api/iptv/catalog?category=${encodeURIComponent(providerCategorySelection[page]||'')}&kind=${contentKind}&limit=180`);
    if(!root.isConnected||app.tab!==page)return;
    const visibleCategories=relevantProviderCategories(page,catalogue.categories);
    let pageItems=catalogue.items;
    if(!providerCategorySelection[page]&&['kids','series'].includes(page)&&visibleCategories.length){
      const responses=await Promise.all(visibleCategories.slice(0,12).map(category=>iptvApi(`/api/iptv/catalog?category=${encodeURIComponent(category.id)}&kind=${contentKind}&limit=180`)));
      pageItems=[...new Map(responses.flatMap(response=>response.items).map(item=>[item.id,item])).values()];
    }
    const items=uniqueTitles(titlesForProviderPage(page,pageItems)).sort((left,right)=>(state.trending?.[right.title]?.count||0)-(state.trending?.[left.title]?.count||0)||Number(right.rating||0)-Number(left.rating||0)||right.added-left.added);
    const filter=root.querySelector('.filter-row');
    if(page==='series'&&filter){filter.hidden=!providerCategorySelection[page];filter.innerHTML=providerCategorySelection[page]?'<button class="filter focusable" id="backToSeriesServices">← All series</button>':'';filter.querySelector('button')?.addEventListener('click',()=>{providerCategorySelection[page]='';refreshProviderPage(page);});}
    if(filter&&page!=='series'){filter.hidden=false;filter.classList.add('provider-category-row');filter.innerHTML=`<button class="filter focusable ${!providerCategorySelection[page]?'active':''}" data-provider-category="">All</button>${visibleCategories.filter(category=>page!=='movies'||!WolfeCollections.isMovieCollection(category)).map(category=>`<button class="filter focusable ${providerCategorySelection[page]===category.id?'active':''}" data-provider-category="${escapeHtml(category.id)}">${escapeHtml(category.name)}</button>`).join('')}`;filter.querySelectorAll('[data-provider-category]').forEach(button=>button.onclick=()=>{providerCategorySelection[page]=button.dataset.providerCategory;refreshProviderPage(page);});}
    const history=state.watchHistory?.[app.profile]||{};
    const watched=await resolveContinueWatching(history,page,items);
    const family=uniqueTitles(titlesForProviderPage('kids',pageItems)).sort(byLatest);
    const rows=[...root.querySelectorAll('.v3-row:not(.provider-collection-rail)')];
    const labels=page==='ondemand'?['Continue Watching','Trending on W.O.L.F.E','Top rated on demand','Recently added','Family picks']:page==='movies'?['Continue Watching','Recommended movies','Popular movies','Recently added']:page==='series'?['Continue Watching','Recommended series','Popular series','Recently added']:['Continue Watching','Kids picks','Popular with families','Recently added'];
    const railUsed=new Set();
    const fills=[takeUnused(watched,railUsed,6),takeUnused(items,railUsed,9),takeUnused(items.slice().sort((left,right)=>Number(right.rating||0)-Number(left.rating||0)),railUsed,9),takeUnused(items.slice().sort(byLatest),railUsed,9),takeUnused(family,railUsed,9)];
    rows.forEach((row,index)=>{const fill=fills[index]||[];const heading=row.querySelector('.rowTitle');if(heading)heading.innerHTML=`${escapeHtml(labels[index]||'On demand')} <span>›</span>`;const cards=row.querySelector('.cards');if(cards){const empty=index===0?'Nothing to continue yet. Start a title to see it here.':page==='kids'?'No more child or family titles were returned by this provider.':'No more matching titles were returned by this provider.';cards.innerHTML=fill.length?fill.map(item=>providerV3Card(item,index>0)).join(''):`<p class="empty-provider-rail">${empty}</p>`;attachProviderTiles(cards,fill);}});
    if(providerCategorySelection[page]){const selected=visibleCategories.find(category=>category.id===providerCategorySelection[page]);rows.forEach((row,index)=>{row.hidden=index!==0;});if(rows[0]){rows[0].querySelector('.rowTitle').textContent=selected?.name||'Titles';const cards=rows[0].querySelector('.cards');cards.innerHTML=items.length?items.map(item=>providerV3Card(item)).join(''):'<p class="empty-provider-rail">No titles in this category.</p>';attachProviderTiles(cards,items);}}else rows.forEach(row=>{row.hidden=false;});
    renderProviderCollections(root,page,visibleCategories);
    const feature=items.find(item=>featuredPosterUrl(item))||items[0];
    if(page==='ondemand'){if(feature)setIptvFeaturedTitle(root.querySelector('.v3-feature'),feature);else root.querySelector('.v3-feature')?.remove();}
  }catch(error){throw error;}
}
async function openIptvCategoryManager(initialTab='library'){
  try{
    const catalogue=await iptvApi('/api/iptv/catalog?includeHidden=1&limit=1');
    const hidden=new Set(catalogue.hiddenCategories||[]);
    const renderTab=tab=>{
      const serviceCategories=catalogue.categories.filter(category=>category.kind==='series');
      const shown=tab==='services'?serviceCategories:catalogue.categories.filter(category=>category.kind==='movie');
      const rows=shown.map(category=>{const service=serviceCategoryInfo(category.name)||{name:'Series',glyph:'▦',style:'generic'};return `<button class="category-toggle focusable ${hidden.has(category.id)?'hidden-category':''}" data-category-toggle="${escapeHtml(category.id)}">${tab==='services'?`<b class="provider-service-icon provider-service-${service.style}">${serviceIconMarkup(service)}</b>`:''}<span><b>${escapeHtml(category.name)}</b><small>${hidden.has(category.id)?'Hidden from the family library':'Visible in the family library'}</small></span><em>${hidden.has(category.id)?'Show':'Hide'}</em></button>`;}).join('')||'<p class="category-manager-empty">No series service categories were returned by this provider.</p>';
      const copy=tab==='services'?'Choose which provider service shelves appear in Series. For example, Netflix, Apple TV+, Paramount+ and other services returned by your supplier.':'Choose which provider categories appear across On Demand, Movies, Series and Kids. Hidden categories stay saved locally and can be restored here.';
      modal('IPTV visibility',`<div class="manager-tabs"><button class="filter focusable ${tab==='library'?'active':''}" data-manager-tab="library">Movie categories</button><button class="filter focusable ${tab==='services'?'active':''}" data-manager-tab="services">Series services</button></div><div class="category-manager"><p>${copy}</p>${rows}</div>`,`<button class="secondary focusable" onclick="closeModal()">Cancel</button><button class="primary focusable" id="saveCategoryVisibility">Save changes</button>`);
      $('modalBody').querySelectorAll('[data-manager-tab]').forEach(button=>button.onclick=()=>renderTab(button.dataset.managerTab));
      $('modalBody').querySelectorAll('[data-category-toggle]').forEach(button=>button.onclick=()=>{const id=button.dataset.categoryToggle;if(hidden.has(id))hidden.delete(id);else hidden.add(id);const active=hidden.has(id);button.classList.toggle('hidden-category',active);button.querySelector('small').textContent=active?'Hidden from the family library':'Visible in the family library';button.querySelector('em').textContent=active?'Show':'Hide';});
      $('saveCategoryVisibility').onclick=async()=>{try{await iptvApi('/api/iptv/categories',{hiddenCategories:[...hidden]});closeModal();if(['ondemand','movies','series','kids'].includes(app.tab))refreshProviderPage(app.tab);else render();}catch(error){errorDialog(error);}};
    };
    renderTab(initialTab);
  }catch(error){errorDialog(error);}
}
function showIptvCategoryManager(){requireMikePin(openIptvCategoryManager);}
function openIptvPortal(){app.tab='ondemand';render();focusFirst();}
const renderWithProviderPages=render;
render=function(){renderWithProviderPages();};

/* Universal search covers the local Xtream VOD, series and live-channel cache. Other services are added only when a legal catalogue source is connected. */
let universalSearchQuery='',searchReturnTab='home',searchDebounce;
function searchResultsMarkup(query,items,total){
  if(!query)return `<div class="search-empty"><div><b>Find something to watch</b>Search films, series, live channels, genres, or the categories imported from your IPTV provider.</div></div>`;
  if(!items.length)return `<div class="search-empty"><div><b>No matches for “${escapeHtml(query)}”</b>Try a shorter title, a genre, or a different spelling.</div></div>`;
  const liveCount=items.filter(item=>item.kind==='live').length;
  return `<div class="search-results-heading"><h2>Results for “${escapeHtml(query)}”</h2><span>${total} ${total===1?'result':'results'} found${liveCount?` · ${liveCount} live ${liveCount===1?'channel':'channels'}`:''}</span></div><div class="search-results-grid">${items.map(item=>providerV3Card(item)).join('')}</div>`;
}
async function runUniversalSearch(query){
  const value=String(query||'').trim();
  universalSearchQuery=value;
  const results=$('universalSearchResults');
  if(!results||app.tab!=='search')return;
  if(value.length<2){results.innerHTML=searchResultsMarkup('',[],0);return;}
  results.innerHTML=`<div class="search-empty"><div><b>Searching your library…</b>Looking through films, series and available live channels.</div></div>`;
  try{
    const status=await iptvApi('/api/iptv/status');
    if(!status.configured){results.innerHTML=`<div class="search-empty"><div><b>Connect IPTV to search</b>Search will include your real on-demand library once Mike has connected the provider.</div></div>`;return;}
    const response=await iptvApi(`/api/iptv/search?q=${encodeURIComponent(value)}&limit=80`);
    if(app.tab!=='search'||universalSearchQuery!==value||!$('universalSearchResults'))return;
    results.innerHTML=searchResultsMarkup(response.query,response.items,response.total);
    results.querySelectorAll('[data-provider-title]').forEach(button=>{const item=response.items.find(title=>title.id===button.dataset.providerTitle);button.onclick=()=>openCatalogueTitle(item);});
  }catch(error){if(results.isConnected)results.innerHTML=`<div class="search-empty"><div><b>Search is unavailable</b>${escapeHtml(error.message)}</div></div>`;}
}
function renderUniversalSearch(){
  $('content').innerHTML=`<div class="v3-page search-v3"><section class="library-heading"><div class="eyebrow">W.O.L.F.E MEDIA</div><h1>Search</h1><p>Find films, series and available live channels from your connected IPTV library.</p><form id="universalSearchForm" class="search-entry"><input id="universalSearchInput" class="focusable" type="search" minlength="2" autocomplete="off" placeholder="Search NASCAR, F1, documentaries, films or series" value="${escapeHtml(universalSearchQuery)}" aria-label="Search your media library"><button class="primary focusable" type="submit">Search</button></form><p class="search-hint">Searches titles and provider categories across on demand, box sets and available Live TV. Live TV remains search-only, with no separate tab.</p><div class="search-suggestions">${['NASCAR','F1','Space','Documentary','Family','Sci-Fi'].map(term=>`<button class="search-suggestion focusable" data-search-suggestion="${term}">${term}</button>`).join('')}</div></section><section id="universalSearchResults">${searchResultsMarkup(universalSearchQuery,[],0)}</section></div>`;
  const form=$('universalSearchForm'),input=$('universalSearchInput');
  form.onsubmit=event=>{event.preventDefault();runUniversalSearch(input.value);};
  input.oninput=()=>{clearTimeout(searchDebounce);searchDebounce=setTimeout(()=>runUniversalSearch(input.value),300);};
  $('content').querySelectorAll('[data-search-suggestion]').forEach(button=>button.onclick=()=>{input.value=button.dataset.searchSuggestion;runUniversalSearch(input.value);input.focus();});
  if(universalSearchQuery.length>=2)setTimeout(()=>runUniversalSearch(universalSearchQuery),0);
}
function openUniversalSearch(origin=app.tab){
  if(origin!=='search')searchReturnTab=origin;
  app.tab='search';render();setTimeout(()=>$('universalSearchInput')?.focus(),30);
}
const searchBack=back;
back=function(){if($('modal').classList.contains('hidden')&&app.tab==='search'){app.tab=searchReturnTab||'home';render();focusFirst();return;}searchBack();};
const renderWithUniversalSearch=render;
render=function(){if(app.tab==='search'){profileUI();document.querySelectorAll('.nav').forEach(button=>button.classList.toggle('active',button.dataset.tab==='search'));renderUniversalSearch();focusFirst();return;}renderWithUniversalSearch();};
