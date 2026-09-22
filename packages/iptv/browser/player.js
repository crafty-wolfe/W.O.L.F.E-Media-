/* IPTV player: a self-contained full-screen presentation layer for the local VOD service. */
let wolfeIptvHls=null,playerHideTimer=null,lastPlayerProgressAt=0,stoppingIptvPlayback=false;
const standardCloseModal=closeModal;
const playerElement=id=>document.getElementById(id);
const playerIsOpen=()=>playerElement('modal')?.classList.contains('player-modal');
const playerTime=seconds=>{if(!Number.isFinite(seconds)||seconds<0)return '0:00';const minutes=Math.floor(seconds/60),hours=Math.floor(minutes/60);return hours?`${hours}:${String(minutes%60).padStart(2,'0')}:${String(Math.floor(seconds%60)).padStart(2,'0')}`:`${minutes}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;};

function setPlayerMessage(message,error=false){const label=playerElement('iptvPlayerMessage'),shell=playerElement('iptvPlayerShell');if(label)label.textContent=message;if(shell)shell.classList.toggle('is-error',error);}
function updatePlayerTimeline(){const video=playerElement('iptvVideo'),seek=playerElement('iptvSeek'),elapsed=playerElement('iptvElapsed'),remaining=playerElement('iptvRemaining');if(!video||!seek)return;const duration=Number(video.duration)||0,position=Math.min(Number(video.currentTime)||0,duration);seek.max=Math.floor(duration)||0;seek.value=Math.floor(position);seek.style.setProperty('--played',duration?`${(position/duration)*100}%`:'0%');if(elapsed)elapsed.textContent=playerTime(position);if(remaining)remaining.textContent=duration?`-${playerTime(Math.max(duration-position,0))}`:'--:--';if(playing?.iptv&&duration)playing.percent=Math.min(100,Math.round((position/duration)*100));}
function showPlayerControls(keepVisible=false){const shell=playerElement('iptvPlayerShell');if(!shell)return;shell.classList.remove('controls-hidden');clearTimeout(playerHideTimer);if(!keepVisible&&shell.classList.contains('is-playing'))playerHideTimer=setTimeout(()=>shell.classList.add('controls-hidden'),3600);}
function toggleIptvPlayback(){const video=playerElement('iptvVideo');if(!video)return;showPlayerControls(true);if(video.paused)video.play().catch(()=>setPlayerMessage('Playback could not start. Press Play to try again.',true));else video.pause();}
function seekIptvBy(seconds){const video=playerElement('iptvVideo');if(!video||!Number.isFinite(video.duration))return;video.currentTime=Math.max(0,Math.min(video.duration,video.currentTime+seconds));updatePlayerTimeline();showPlayerControls();}
function changeIptvVolume(delta){const video=playerElement('iptvVideo');if(!video)return;video.muted=false;video.volume=Math.max(0,Math.min(1,video.volume+delta));const volume=playerElement('iptvVolume');if(volume)volume.textContent=`${Math.round(video.volume*100)}%`;showPlayerControls();}
function toggleIptvMute(){const video=playerElement('iptvVideo');if(!video)return;video.muted=!video.muted;const volume=playerElement('iptvVolume');if(volume)volume.textContent=video.muted?'Muted':`${Math.round(video.volume*100)}%`;showPlayerControls(true);}
async function toggleIptvFullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await playerElement('modal')?.requestFullscreen();}catch{}showPlayerControls(true);}
function saveIptvProgress(force=false){if(!playing?.iptv)return;const now=Date.now();if(!force&&now-lastPlayerProgressAt<5000)return;lastPlayerProgressAt=now;api({action:'progress',profile:playing.profile,title:playing.title,percent:playing.percent||0}).catch(()=>{});}
function cleanUpPlayerSurface(){clearTimeout(playerHideTimer);wolfeIptvHls?.destroy();wolfeIptvHls=null;document.body.classList.remove('iptv-playing');playerElement('modal')?.classList.remove('player-modal');}

async function stopIptvPlayback(){
  if(stoppingIptvPlayback)return;
  stoppingIptvPlayback=true;
  const video=playerElement('iptvVideo'),session=playing;
  updatePlayerTimeline();
  /* Stop the media pipeline before changing screens. HLS keeps fetching until destroyed. */
  wolfeIptvHls?.destroy();wolfeIptvHls=null;
  if(video){video.onended=null;video.pause();video.removeAttribute('src');video.src='';try{video.load();}catch{}}
  document.body.classList.remove('iptv-playing');playerElement('modal')?.classList.remove('player-modal');standardCloseModal();
  playing=null;
  try{
    if(session?.iptv){await api({action:'progress',profile:session.profile,title:session.title,percent:session.percent||0});await api({action:'release'});}
  }catch{}finally{stoppingIptvPlayback=false;}
}

function renderIptvPlayer(item){
  const isLive=item.kind==='live',title=escapeHtml(item.title),category=escapeHtml(item.categoryName||'On Demand'),details=escapeHtml([item.year,item.rating&&`★ ${item.rating}`].filter(Boolean).join(' · ')||'On demand');
  modal(item.title,`<div id="iptvPlayerShell" class="wolf-player is-loading" aria-label="W.O.L.F.E player"><video id="iptvVideo" class="iptv-video" autoplay playsinline></video><div class="wolf-player-ui"><div class="player-top-shade"></div><div class="player-bottom-shade"></div><header class="player-header"><button id="iptvExit" class="player-back focusable" aria-label="Back to library">‹</button><div class="player-title-block"><span class="player-kicker">W.O.L.F.E MEDIA · IPTV</span><strong>${title}</strong><small>${category}${details?' · '+details:''}</small></div><span class="player-source">${isLive?'LIVE TV':'ON DEMAND'}</span></header><div class="player-stage"><button id="iptvPlayToggle" class="player-stage-button focusable"><b>▶</b><span>Play</span></button><p id="iptvPlayerMessage" class="player-stage-status">Connecting to your provider…</p></div><footer class="player-controls"><div class="player-timeline ${isLive?'live-timeline':''}"><span id="iptvElapsed">${isLive?'LIVE':'0:00'}</span><input id="iptvSeek" class="player-seek focusable" type="range" min="0" max="0" value="0" step="1" aria-label="Playback position" ${isLive?'disabled':''}><span id="iptvRemaining">${isLive?'':'--:--'}</span></div><div class="player-command-row"><button id="iptvPause" class="player-control wide focusable"><span>▶</span><span>Play</span></button><button id="iptvRewind" class="player-control focusable" aria-label="Back 10 seconds" ${isLive?'disabled':''}>↶ 10</button><button id="iptvForward" class="player-control focusable" aria-label="Forward 10 seconds" ${isLive?'disabled':''}>10 ↷</button><button id="iptvMute" class="player-control focusable" aria-label="Mute">🔊</button><span id="iptvVolume" class="player-help">100%</span><span class="player-help">${isLive?'Esc back':'← → seek · ↑ ↓ volume · Esc back'}</span><button id="iptvFullscreen" class="player-control focusable" aria-label="Toggle full screen">⛶</button></div></footer></div></div>`,``);
  playerElement('modal').classList.add('player-modal');document.body.classList.add('iptv-playing');
  setTimeout(()=>playerElement('iptvPlayToggle')?.focus(),30);
}

function wireIptvPlayer(item){
  const isLive=item.kind==='live',video=playerElement('iptvVideo'),shell=playerElement('iptvPlayerShell'),stream=`/api/iptv/stream?id=${encodeURIComponent(item.id)}${isLive?'&format=hls':''}`;let recordedWatch=false;
  const setPauseButton=playingNow=>{const button=playerElement('iptvPause'),stage=playerElement('iptvPlayToggle');if(button)button.innerHTML=playingNow?'<span>Ⅱ</span><span>Pause</span>':'<span>▶</span><span>Play</span>';if(stage)stage.innerHTML=playingNow?'<b>Ⅱ</b><span>Pause</span>':'<b>▶</b><span>Play</span>';};
  playerElement('iptvExit').onclick=()=>stopIptvPlayback();playerElement('iptvPlayToggle').onclick=toggleIptvPlayback;playerElement('iptvPause').onclick=toggleIptvPlayback;playerElement('iptvRewind').onclick=()=>seekIptvBy(-10);playerElement('iptvForward').onclick=()=>seekIptvBy(10);playerElement('iptvMute').onclick=toggleIptvMute;playerElement('iptvFullscreen').onclick=toggleIptvFullscreen;
  playerElement('iptvSeek').oninput=event=>{video.currentTime=Number(event.target.value)||0;updatePlayerTimeline();showPlayerControls(true);};
  shell.onmousemove=()=>showPlayerControls();shell.ontouchstart=()=>showPlayerControls();
  video.onloadedmetadata=()=>{shell.classList.remove('is-loading');updatePlayerTimeline();setPlayerMessage('Ready to play.');};
  video.onplaying=()=>{shell.classList.remove('is-loading','is-error');shell.classList.add('is-playing');setPauseButton(true);setPlayerMessage(isLive?'Live from your IPTV provider.':'Playing from your IPTV provider.');if(!recordedWatch&&!isLive){recordedWatch=true;api({action:'watch',profile:app.profile,title:item.seriesTitle||item.title}).catch(()=>{});}showPlayerControls();};
  video.onpause=()=>{if(video.ended)return;shell.classList.remove('is-playing');setPauseButton(false);setPlayerMessage('Paused.');showPlayerControls(true);saveIptvProgress(true);};
  video.ontimeupdate=()=>{updatePlayerTimeline();saveIptvProgress();};
  video.onended=()=>stopIptvPlayback();
  video.onerror=()=>{shell.classList.remove('is-playing');setPauseButton(false);setPlayerMessage(`The provider sent a ${item.extension||'video'} stream that this browser could not play.`,true);showPlayerControls(true);};
  if((item.extension==='m3u8'||isLive)&&window.Hls&&Hls.isSupported()){wolfeIptvHls=new Hls();wolfeIptvHls.on(Hls.Events.ERROR,(_,data)=>{if(data.fatal){shell.classList.remove('is-playing');setPlayerMessage(isLive?'This live channel could not be started. Try another channel.':'This HLS stream could not be played. Try another title.',true);showPlayerControls(true);}});wolfeIptvHls.loadSource(stream);wolfeIptvHls.attachMedia(video);}else{video.src=stream;video.play().catch(()=>{setPauseButton(false);setPlayerMessage('Press Play to start this title.');});}
}

playIptvTitle=async function(item){
  if(!item)return;
  if(item.kind==='series'){openSeriesDetails(item);return;}
  try{
    if(playing){modal('IPTV already playing',`<p><b>${escapeHtml(playing.title)}</b> is already using this window’s IPTV connection.</p>`,`<button class="primary focusable" onclick="closeModal()">Back</button>`);return;}
    const isLive=item.kind==='live';
    const readiness=await iptvApi(`/api/iptv/playback-check?id=${encodeURIComponent(item.id)}${isLive?'&format=hls':''}`);
    if(!readiness.playable&&!isLive){const message=readiness.reason==='network_blocked'?'This network is blocking the video server before W.O.L.F.E can reach it. Your catalogue remains available because it uses a separate provider address.':readiness.reason==='unexpected_response'?'Your provider returned a web page instead of a video stream for this title. Try another title or check the provider service.':readiness.reason==='unreachable'?'W.O.L.F.E could not reach the provider’s video server. Check the local network connection and try again.':'Your provider did not make this title available for playback. Try another title or check the provider service.';modal('Playback unavailable',`<p>${message}</p>`,`<button class="primary focusable" onclick="closeModal()">Back to library</button>`);return;}
    const result=await api({action:'acquire',profile:app.profile,title:item.title,mode});if(result.blocked){demoIptvManager();return;}
    playing={title:item.title,profile:app.profile,percent:0,iptv:true};lastPlayerProgressAt=0;renderIptvPlayer(item);wireIptvPlayer(item);
  }catch(error){cleanUpPlayerSurface();errorDialog(error);}
};

const standardBack=back;
back=function(){if(playerIsOpen()){stopIptvPlayback();return;}standardBack();};
closeModal=function(){if(playerIsOpen()){stopIptvPlayback();return;}standardCloseModal();};
window.addEventListener('pagehide',()=>{if(playerIsOpen())stopIptvPlayback();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playerIsOpen())stopIptvPlayback();});
window.handleIptvPlayerKey=function(event){if(!playerIsOpen())return false;const key=event.key;if(key==='Escape'||key==='Backspace'){stopIptvPlayback();return true;}if(key===' '){toggleIptvPlayback();return true;}if(key==='ArrowLeft'){seekIptvBy(-10);return true;}if(key==='ArrowRight'){seekIptvBy(10);return true;}if(key==='ArrowUp'){changeIptvVolume(.05);return true;}if(key==='ArrowDown'){changeIptvVolume(-.05);return true;}if(key.toLowerCase()==='m'){toggleIptvMute();return true;}if(key.toLowerCase()==='f'){toggleIptvFullscreen();return true;}return false;};
window.handleIptvPlayerControl=function(action){if(!playerIsOpen())return false;if(action==='back'){stopIptvPlayback();return true;}if(action==='ArrowLeft'){seekIptvBy(-10);return true;}if(action==='ArrowRight'){seekIptvBy(10);return true;}if(action==='ArrowUp'){changeIptvVolume(.05);return true;}if(action==='ArrowDown'){changeIptvVolume(-.05);return true;}return false;};
