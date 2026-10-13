// ============ player.js 背景音乐播放器（黑胶唱片组件，全站共享） ============
// 引入：各页面 <script type="module" src="player.js"></script>
// 曲目：把 mp3 放进 music/ 目录，并在 music/playlist.json 中登记。
// 功能：播放/暂停、切歌、音量滑条、记忆断点（切页/刷新续播）、跨标签页同步、音效开关。
import { sfx, playArpeggioOnce } from './sfx.js';

const LS = { vol: 'rp-volume', on: 'rp-enabled', idx: 'rp-index', time: 'rp-time', timeTs: 'rp-time-ts' };
const ls = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* 忽略 */ } },
};

let tracks = [];
let curIndex = Math.max(0, parseInt(ls.get(LS.idx, '0'), 10) || 0);
let wantPlay = ls.get(LS.on, 'on') !== 'off';   // 默认开：进入页面即尝试播放（被拦截则在首次交互时续播）
let panelOpen = false;
let audio = null;
let bc = null;
try { bc = new BroadcastChannel('romantic-music'); } catch { bc = null; }

/* ---------- 注入样式 ---------- */
const style = document.createElement('style');
style.textContent = `
#romanticPlayer { position: fixed; right: 18px; bottom: 18px; z-index: 90; font-family: "Microsoft YaHei", sans-serif; }
#romanticPlayer .rp-disc { position: relative; width: 52px; height: 52px; border-radius: 50%; border: 1px solid rgba(255,255,255,.65); cursor: pointer; background: radial-gradient(circle at 50% 50%, #4a3a48 0 18%, #241c26 19% 58%, #352a38 59% 100%); box-shadow: 0 10px 26px rgba(118,78,113,.3), inset 0 1px 0 rgba(255,255,255,.2); display: grid; place-items: center; transition: transform .3s ease; }
#romanticPlayer .rp-disc:hover { transform: scale(1.07); }
#romanticPlayer .rp-label { position: absolute; width: 22px; height: 22px; border-radius: 50%; background: radial-gradient(circle, #e8b7cb, #bd879e); border: 1px solid rgba(255,255,255,.5); }
#romanticPlayer .rp-label::after { content: ""; position: absolute; inset: 8px; border-radius: 50%; background: #3a2c3e; }
#romanticPlayer .rp-note { position: relative; color: #fff2f7; font-size: 15px; z-index: 1; text-shadow: 0 1px 4px rgba(0,0,0,.4); pointer-events: none; }
#romanticPlayer.is-playing .rp-disc { animation: rp-spin 3.2s linear infinite; }
#romanticPlayer.is-playing .rp-label { animation: rp-spin 3.2s linear infinite reverse; }
@keyframes rp-spin { to { transform: rotate(360deg); } }
#romanticPlayer .rp-panel { position: absolute; right: 0; bottom: 64px; width: 264px; padding: 15px 16px 13px; border-radius: 17px; background: rgba(255,250,252,.9); border: 1px solid rgba(255,255,255,.7); box-shadow: 0 18px 48px rgba(118,78,113,.24); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); opacity: 0; visibility: hidden; transform: translateY(8px) scale(.97); transform-origin: 100% 100%; transition: opacity .3s ease, transform .3s cubic-bezier(.2,.8,.2,1), visibility .3s; }
#romanticPlayer.is-open .rp-panel { opacity: 1; visibility: visible; transform: none; }
#romanticPlayer .rp-title { margin: 0 0 10px; font-size: .84rem; color: #9b5f7d; letter-spacing: .04em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#romanticPlayer .rp-progress { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; font-size: .68rem; color: #a9909e; }
#romanticPlayer .rp-bar { flex: 1; height: 4px; border-radius: 4px; background: rgba(189,135,158,.22); overflow: hidden; cursor: pointer; }
#romanticPlayer .rp-bar i { display: block; width: 0%; height: 100%; border-radius: 4px; background: linear-gradient(90deg, #d9a1ba, #bd879e); transition: width .2s linear; }
#romanticPlayer .rp-ctrl { display: flex; align-items: center; gap: 7px; }
#romanticPlayer .rp-ctrl button { border: 1px solid rgba(189,135,158,.35); background: rgba(255,255,255,.5); color: #9b5f7d; border-radius: 10px; width: 30px; height: 30px; cursor: pointer; font-size: .78rem; line-height: 1; transition: background .25s, transform .2s; }
#romanticPlayer .rp-ctrl button:hover { background: rgba(255,255,255,.85); transform: translateY(-1px); }
#romanticPlayer .rp-ctrl button[data-act="toggle"] { width: 36px; background: linear-gradient(135deg, #e8b7cb, #bd879e); color: #fff; border-color: transparent; }
#romanticPlayer .rp-ctrl input[type="range"] { flex: 1; min-width: 0; height: 4px; accent-color: #bd879e; cursor: pointer; }
#romanticPlayer .rp-ctrl button.rp-sfx-on { background: rgba(232,183,203,.4); }
#romanticPlayer .rp-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 11px; }
#romanticPlayer .rp-list-btn { border: none; background: none; cursor: pointer; font: .72rem "Microsoft YaHei", sans-serif; color: #a9909e; letter-spacing: .06em; padding: 2px 4px; }
#romanticPlayer .rp-list-btn:hover { color: #9b5f7d; }
#romanticPlayer .rp-sfx { border: 1px solid rgba(189,135,158,.35); border-radius: 99px; background: rgba(255,255,255,.5); color: #a17187; font: .72rem "Microsoft YaHei", sans-serif; padding: 3px 10px; cursor: pointer; transition: opacity .2s; }
#romanticPlayer .rp-sfx.rp-sfx-off { opacity: .45; }
#romanticPlayer .rp-list { list-style: none; margin: 9px 0 0; padding: 6px 4px 2px; border-top: 1px dashed rgba(189,135,158,.3); max-height: 132px; overflow: auto; }
#romanticPlayer .rp-list li { padding: 5px 8px; border-radius: 8px; font-size: .76rem; color: #8b7381; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#romanticPlayer .rp-list li:hover { background: rgba(232,183,203,.18); }
#romanticPlayer .rp-list li.rp-current { color: #bd5f8a; font-weight: 600; }
#romanticPlayer .rp-empty { margin: 10px 0 0; padding: 9px 10px; border: 1px dashed rgba(189,135,158,.4); border-radius: 11px; font-size: .72rem; line-height: 1.7; color: #a9909e; background: rgba(255,255,255,.3); }
@media (prefers-color-scheme: dark) {
  #romanticPlayer .rp-panel { background: rgba(52,42,58,.92); border-color: rgba(255,255,255,.14); }
  #romanticPlayer .rp-title { color: #d5a0b8; }
  #romanticPlayer .rp-progress { color: #8d7386; }
  #romanticPlayer .rp-ctrl button { background: rgba(255,255,255,.08); border-color: rgba(209,145,173,.3); color: #cf9db6; }
  #romanticPlayer .rp-ctrl button:hover { background: rgba(255,255,255,.16); }
  #romanticPlayer .rp-ctrl button[data-act="toggle"] { color: #fff; }
  #romanticPlayer .rp-list-btn { color: #8d7386; }
  #romanticPlayer .rp-sfx { background: rgba(255,255,255,.08); color: #cf9db6; border-color: rgba(209,145,173,.3); }
  #romanticPlayer .rp-list li { color: #b49cae; }
  #romanticPlayer .rp-list li:hover { background: rgba(232,183,203,.1); }
  #romanticPlayer .rp-empty { background: rgba(255,255,255,.05); color: #8d7386; }
}
@media (max-width: 560px) { #romanticPlayer { right: 12px; bottom: 12px; } #romanticPlayer .rp-disc { width: 46px; height: 46px; } #romanticPlayer .rp-panel { width: min(78vw, 264px); } }
@media (prefers-reduced-motion: reduce) { #romanticPlayer .rp-disc, #romanticPlayer .rp-label { animation: none !important; } }
`;
document.head.appendChild(style);
style.setAttribute('data-rn-keep', '');

/* ---------- 注入 DOM ---------- */
const root = document.createElement('div');
root.id = 'romanticPlayer';
root.innerHTML = `
  <div class="rp-panel" role="dialog" aria-label="音乐播放器">
    <p class="rp-title">— 未播放 —</p>
    <div class="rp-progress"><span class="rp-cur">0:00</span><div class="rp-bar" role="slider" aria-label="播放进度"><i></i></div><span class="rp-dur">0:00</span></div>
    <div class="rp-ctrl">
      <button type="button" data-act="prev" aria-label="上一曲">⏮</button>
      <button type="button" data-act="toggle" aria-label="播放或暂停">▶</button>
      <button type="button" data-act="next" aria-label="下一曲">⏭</button>
      <input type="range" min="0" max="1" step="0.01" aria-label="音量">
    </div>
    <div class="rp-foot">
      <button type="button" class="rp-list-btn">播放列表 ▾</button>
      <button type="button" class="rp-sfx" aria-pressed="true" title="交互音效 开/关">音效 ♪</button>
    </div>
    <ul class="rp-list" hidden></ul>
    <p class="rp-empty" hidden>这里还没有歌 ♪<br>把 mp3 文件放进 music/ 目录，<br>再在 music/playlist.json 里登记曲目。</p>
  </div>
  <button type="button" class="rp-disc" aria-label="打开音乐播放器" aria-expanded="false"><span class="rp-label"></span><span class="rp-note">♪</span></button>
`;
document.body.appendChild(root);

const panel = root.querySelector('.rp-panel');
const titleEl = root.querySelector('.rp-title');
const curEl = root.querySelector('.rp-cur');
const durEl = root.querySelector('.rp-dur');
const barEl = root.querySelector('.rp-bar');
const barFill = root.querySelector('.rp-bar i');
const toggleBtn = root.querySelector('[data-act="toggle"]');
const volumeInput = root.querySelector('input[type="range"]');
const listBtn = root.querySelector('.rp-list-btn');
const listEl = root.querySelector('.rp-list');
const emptyEl = root.querySelector('.rp-empty');
const sfxBtn = root.querySelector('.rp-sfx');
const discBtn = root.querySelector('.rp-disc');

const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/* ---------- 音频核心 ---------- */
function ensureAudio() {
  if (audio) return audio;
  audio = new Audio();
  audio.volume = parseFloat(ls.get(LS.vol, '0.65')) || 0.65;
  volumeInput.value = audio.volume;
  audio.addEventListener('loadedmetadata', () => { durEl.textContent = fmt(audio.duration || 0); });
  audio.addEventListener('timeupdate', () => {
    const p = audio.duration ? audio.currentTime / audio.duration : 0;
    barFill.style.width = `${(p * 100).toFixed(1)}%`;
    curEl.textContent = fmt(audio.currentTime);
  });
  // 记忆断点：播放中每 2 秒存一次进度 + 时间戳，用于跨页续播时按流逝时间推进
  let lastSave = 0;
  audio.addEventListener('timeupdate', () => {
    const now = Date.now();
    if (now - lastSave > 2000) {
      lastSave = now;
      ls.set(LS.time, String(audio.currentTime || 0));
      ls.set(LS.timeTs, String(now));
    }
  });
  audio.addEventListener('ended', () => { nextTrack(1, true); });
  return audio;
}

function srcOf(t) {
  const s = (t.src || '').trim();
  return /^([a-z]+:)?\//i.test(s) || s.startsWith('music/') ? s : `music/${s}`;
}

function loadTrack(i, { autoplay = false, resume = 0 } = {}) {
  if (!tracks.length) return;
  curIndex = ((i % tracks.length) + tracks.length) % tracks.length;
  ls.set(LS.idx, String(curIndex));
  const t = tracks[curIndex];
  titleEl.textContent = `♪ ${t.title || '未命名'}${t.artist ? ' — ' + t.artist : ''}`;
  const a = ensureAudio();
  a.src = srcOf(t);
  renderList();
  const start = () => {
    if (resume > 0) { try { a.currentTime = Math.min(resume, a.duration || resume); } catch { /* 忽略 */ } }
    if (autoplay) play();
  };
  if (a.readyState >= 1) start();
  else a.addEventListener('loadedmetadata', start, { once: true });
}

function play() {
  if (!tracks.length) return;
  const a = ensureAudio();
  a.play().then(() => {
    root.classList.add('is-playing');
    toggleBtn.textContent = '⏸';
    ls.set(LS.on, 'on');
    wantPlay = true;
    broadcast({ type: 'play', index: curIndex, time: a.currentTime });
  }).catch(() => { /* 自动播放被拦截，等待用户点击 */ });
}

function pause({ remember = true } = {}) {
  if (!audio) return;
  if (remember) {
    ls.set(LS.time, String(audio.currentTime || 0));
    ls.set(LS.timeTs, String(Date.now()));
  }
  audio.pause();
  root.classList.remove('is-playing');
  toggleBtn.textContent = '▶';
  ls.set(LS.on, 'off');
  wantPlay = false;
  broadcast({ type: 'pause', index: curIndex, time: audio.currentTime || 0 });
}

function nextTrack(step, autoPlay = false) {
  loadTrack(curIndex + step, { autoplay: autoPlay || wantPlay, resume: 0 });
}

function broadcast(msg) { try { bc && bc.postMessage(msg); } catch { /* 忽略 */ } }

/* ---------- 跨标签页同步：别处播放时本页静音跟随 ---------- */
if (bc) bc.onmessage = (event) => {
  const msg = event.data || {};
  if (msg.type === 'play' && audio && !audio.paused) {
    pause(); // 防止双开重叠出声
  }
  if (msg.type === 'pause' && audio && tracks[msg.index]) {
    curIndex = msg.index;
    titleEl.textContent = `♪ ${tracks[curIndex].title || '未命名'}${tracks[curIndex].artist ? ' — ' + tracks[curIndex].artist : ''}`;
  }
};

/* ---------- 控件事件 ---------- */
discBtn.addEventListener('click', () => {
  panelOpen = !panelOpen;
  root.classList.toggle('is-open', panelOpen);
  discBtn.setAttribute('aria-expanded', String(panelOpen));
  discBtn.setAttribute('aria-label', panelOpen ? '收起音乐播放器' : '打开音乐播放器');
});

toggleBtn.addEventListener('click', () => {
  if (!tracks.length) { sfx.ding(); return; }
  if (!audio || audio.paused) {
    if (!audio || !audio.src) loadTrack(curIndex, { resume: parseFloat(ls.get(LS.time, '0')) || 0 });
    play();
  } else pause();
});

root.querySelector('[data-act="prev"]').addEventListener('click', () => nextTrack(-1));
root.querySelector('[data-act="next"]').addEventListener('click', () => nextTrack(1));

volumeInput.addEventListener('input', () => {
  const a = ensureAudio();
  a.volume = parseFloat(volumeInput.value);
  ls.set(LS.vol, String(a.volume));
});

// 点击进度条跳转
barEl.addEventListener('click', (event) => {
  if (!audio || !audio.duration) return;
  const rect = barEl.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  audio.currentTime = ratio * audio.duration;
  ls.set(LS.time, String(audio.currentTime));
});

listBtn.addEventListener('click', () => { listEl.hidden = !listEl.hidden; listBtn.textContent = listEl.hidden ? '播放列表 ▾' : '播放列表 ▴'; });

sfxBtn.addEventListener('click', () => {
  const on = sfx.toggle();
  sfxBtn.classList.toggle('rp-sfx-off', !on);
  sfxBtn.setAttribute('aria-pressed', String(on));
  if (on) sfx.pop();
});

function renderList() {
  listEl.innerHTML = '';
  tracks.forEach((t, i) => {
    const li = document.createElement('li');
    li.textContent = `♪ ${t.title || '未命名'}${t.artist ? ' — ' + t.artist : ''}`;
    if (i === curIndex) li.classList.add('rp-current');
    li.addEventListener('click', () => loadTrack(i, { autoplay: true, resume: 0 }));
    listEl.appendChild(li);
  });
}

function renderSfxBtn() {
  const on = sfx.enabled;
  sfxBtn.classList.toggle('rp-sfx-off', !on);
  sfxBtn.setAttribute('aria-pressed', String(on));
}
renderSfxBtn();

/* ---------- 加载播放列表 ---------- */
function applyTracks(list) {
  tracks = Array.isArray(list) ? list : (list.tracks || []);
  if (tracks.length) {
    emptyEl.hidden = true;
    listEl.hidden = false;
    // 跨页续播：按上次保存的进度 + 页面切换期间流逝的时间，恢复到"像是没断过"的位置
    const savedTime = parseFloat(ls.get(LS.time, '0')) || 0;
    const savedTs = parseInt(ls.get(LS.timeTs, '0'), 10) || Date.now();
    const resumePos = Math.max(0, savedTime + (Date.now() - savedTs) / 1000);
    loadTrack(curIndex, { autoplay: false, resume: resumePos });
    // 进入页面即尝试自动播放；若被浏览器拦截，则在用户首次交互（点/滑/按）时自动续播
    if (wantPlay) tryAutoPlay();
  } else {
    emptyEl.hidden = false;
    titleEl.textContent = '— 暂无曲目 —';
  }
}

async function loadPlaylist() {
  // 优先用 sessionStorage 缓存的曲目立即初始化，
  // 这样跨页跳转时能在浏览器"用户激活窗口期"内立刻续播，避免被自动播放策略拦截。
  let cached = null;
  try { cached = JSON.parse(sessionStorage.getItem('rp-tracks-cache') || 'null'); } catch { /* 忽略 */ }
  if (cached && cached.length) applyTracks(cached);

  // 后台从网络刷新曲目（更新后下次加载生效）
  try {
    const res = await fetch('music/playlist.json', { cache: 'no-store' });
    const data = await res.json();
    const fresh = Array.isArray(data) ? data : (data.tracks || []);
    if (fresh.length) {
      try { sessionStorage.setItem('rp-tracks-cache', JSON.stringify(fresh)); } catch { /* 忽略 */ }
      if (!tracks.length) applyTracks(fresh);
      else renderList();
    }
  } catch { /* 离线时沿用缓存 */ }
}

// 自动播放：先直接 play()，失败则挂一次性手势监听
let gestureBound = false;
function tryAutoPlay() {
  play();
  if (gestureBound) return;
  gestureBound = true;
  const onGesture = () => {
    if (audio && audio.paused && wantPlay) play();
  };
  ['pointerdown', 'touchstart', 'keydown'].forEach(ev =>
    window.addEventListener(ev, onGesture, { once: true, passive: true })
  );
}

// 切页/刷新前把最新进度存下，保证跨页续播位置准确
window.addEventListener('pagehide', () => {
  if (audio) {
    ls.set(LS.time, String(audio.currentTime || 0));
    ls.set(LS.timeTs, String(Date.now()));
  }
});

loadPlaylist();

// 开场琶音彩蛋（仅首次访问）
playArpeggioOnce();
