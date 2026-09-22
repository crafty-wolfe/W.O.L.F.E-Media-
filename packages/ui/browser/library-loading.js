/* Hold every library render behind an accessible loading scene until real data is ready. */
const libraryLoader=document.createElement('section');
libraryLoader.id='libraryLoader';libraryLoader.hidden=true;
libraryLoader.setAttribute('role','dialog');libraryLoader.setAttribute('aria-modal','true');libraryLoader.setAttribute('aria-label','Loading your W.O.L.F.E library');
libraryLoader.innerHTML='<div class="loading-nebula"></div><div class="loading-stars"></div><div class="loading-orbit"><div class="loading-brand"><img src="assets/wolfe-mark-v4.png" alt="" width="130" height="130"><h1>W.O.L.F.E</h1><p class="loading-profile"></p><div class="loading-track"><span></span></div><p class="loading-status" role="status" aria-live="polite">Preparing your library…</p></div></div><div class="loading-controls" hidden><button class="primary focusable" data-retry>Try again</button><button class="secondary focusable" data-settings>Settings</button><button class="secondary focusable" data-profiles>Change profile</button></div><span class="loading-tagline">ENTERTAINMENT FOR REAL LIFE</span>';
document.body.appendChild(libraryLoader);
let libraryLoadVersion=0;
function setLibraryLoading(active){
  libraryLoader.hidden=!active;document.body.classList.toggle('library-loading',active);
  for(const el of document.body.children)if(el!==libraryLoader&&el.tagName!=='SCRIPT')el.inert=active;
  $('content').setAttribute('aria-busy',String(active));
}
function libraryLoadError(error){
  libraryLoader.querySelector('.loading-status').textContent=error.message||'Your library could not be loaded. Please try again.';
  libraryLoader.querySelector('.loading-controls').hidden=false;
  libraryLoader.classList.add('load-error');libraryLoader.querySelector('[data-retry]').focus();
}
libraryLoader.querySelector('[data-retry]').onclick=()=>render();
libraryLoader.querySelector('[data-settings]').onclick=()=>{++libraryLoadVersion;setLibraryLoading(false);app.tab='settings';render();};
libraryLoader.querySelector('[data-profiles]').onclick=()=>{++libraryLoadVersion;setLibraryLoading(false);$('content').replaceChildren();showProfiles();};
document.addEventListener('keydown',event=>{
  if(libraryLoader.hidden)return;
  if(event.key==='Tab'){
    const buttons=[...libraryLoader.querySelectorAll('button')].filter(button=>button.offsetParent);
    if(buttons.length){const current=buttons.indexOf(document.activeElement);buttons[(current+(event.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}
    event.preventDefault();event.stopImmediatePropagation();
  }else if(!event.target.closest('.loading-controls')){event.preventDefault();event.stopImmediatePropagation();}
},true);
async function settleLibraryArtwork(){
  const images=[...$('content').querySelectorAll('img')].slice(0,24);
  await Promise.all(images.map(img=>new Promise(resolve=>{
    if(img.complete){if(!img.naturalWidth)img.style.visibility='hidden';resolve();return;}
    const done=()=>{clearTimeout(timer);img.removeEventListener('load',done);img.removeEventListener('error',done);if(!img.naturalWidth)img.style.visibility='hidden';resolve();};
    const timer=setTimeout(done,5000);img.addEventListener('load',done);img.addEventListener('error',done);
  })));
}
const renderBehindLibraryLoader=render;
render=async function(){
  const version=++libraryLoadVersion;
  if(!['home','ondemand','movies','series','kids'].includes(app.tab)){setLibraryLoading(false);renderBehindLibraryLoader();return;}
  setLibraryLoading(true);libraryLoader.classList.remove('load-error');
  libraryLoader.querySelector('.loading-controls').hidden=true;
  libraryLoader.querySelector('.loading-profile').textContent='Welcome, '+app.profile;
  libraryLoader.querySelector('.loading-status').textContent='Loading your library…';
  // Paint the overlay before doing any work on the library DOM.
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  if(version!==libraryLoadVersion)return;
  renderBehindLibraryLoader();
  // Remove sample media immediately; these nodes must never become fallback content.
  $('content').querySelectorAll('.v3-row .cards,.split-rows,.autonomous-home-rails').forEach(el=>el.replaceChildren());
  try{
    await Promise.race([
      app.tab==='home'?refreshAutonomousHome():refreshProviderPage(app.tab),
      new Promise((_,reject)=>setTimeout(()=>reject(new Error('The provider is taking too long to respond. Please try again.')),30000))
    ]);
    if(version!==libraryLoadVersion)return;
    libraryLoader.querySelector('.loading-status').textContent='Preparing your artwork…';
    await settleLibraryArtwork();
    if(version!==libraryLoadVersion)return;
    setLibraryLoading(false);focusFirst();
  }catch(error){if(version===libraryLoadVersion)libraryLoadError(error);}
};
