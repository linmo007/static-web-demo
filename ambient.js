// ============ ambient.js 全站氛围层（四季粒子 + 点击爱心彩蛋） ============
// 引入：各页面 <script type="module" src="ambient.js"></script>（依赖 #hearts 容器，缺失时自动创建）
// 季节：3-5月春樱 / 6-8月夏萤 / 9-11月秋叶 / 12-2月冬雪；纪念日(4.20)、520、情人节当天为爱心。
import { sfx } from './sfx.js';

const nowDate = new Date();
const mm = nowDate.getMonth(), dd = nowDate.getDate();
export const isSpecialDay = (mm === 3 && dd === 20) || (mm === 4 && dd === 20) || (mm === 1 && dd === 14);
export const season = isSpecialDay ? 'heart'
  : (mm >= 2 && mm <= 4 ? 'spring' : mm >= 5 && mm <= 7 ? 'summer' : mm >= 8 && mm <= 10 ? 'autumn' : 'winter');

const heartBox = document.querySelector('#hearts') || (() => {
  const box = document.createElement('div');
  box.id = 'hearts';
  box.setAttribute('aria-hidden', 'true');
  box.style.cssText = 'position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:-1';
  document.body.prepend(box);
  return box;
})();

const isMobile = window.matchMedia('(max-width: 560px)').matches;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 注入粒子动画样式（index.html 已有同名样式也不冲突，后加载覆盖相同规则）
if (!document.getElementById('ambient-style')) {
  const style = document.createElement('style');
  style.id = 'ambient-style';
  style.textContent = `
    .particle-heart { position: absolute; bottom: -40px; color: #c994ad; opacity: 0; animation: ambFloatUp linear forwards; will-change: transform, opacity; }
    @keyframes ambFloatUp { 0% { transform: translate3d(0,0,0) rotate(0) scale(.7); opacity: 0; } 14%,76% { opacity: .32; } 100% { transform: translate3d(var(--drift),-112vh,0) rotate(28deg) scale(1.15); opacity: 0; } }
    .p-fall { position: absolute; top: -8vh; animation: ambPetalFall linear forwards; will-change: transform, opacity; }
    .p-fall i { display: block; font-style: normal; animation: ambSway ease-in-out infinite alternate; will-change: transform; }
    @keyframes ambPetalFall { 0% { transform: translate3d(0,-2vh,0); opacity: 0; } 10% { opacity: .85; } 88% { opacity: .55; } 100% { transform: translate3d(var(--drift,6vw),110vh,0); opacity: 0; } }
    @keyframes ambSway { from { transform: translateX(calc(var(--sway,26px) * -1)) rotate(calc(var(--rot,240deg) * .3)); } to { transform: translateX(var(--sway,26px)) rotate(var(--rot,240deg)); } }
    .p-fire { position: absolute; color: #ffe9a8; text-shadow: 0 0 10px #ffdf80, 0 0 24px rgba(255,214,110,.75); animation: ambFirefly ease-in-out forwards; will-change: transform, opacity; }
    @keyframes ambFirefly { 0% { transform: translate3d(0,0,0); opacity: 0; } 14% { opacity: .9; } 32% { transform: translate3d(3vw,-9vh,0); opacity: .25; } 54% { opacity: .85; } 78% { transform: translate3d(-2vw,-17vh,0); opacity: .22; } 100% { transform: translate3d(1.2vw,-26vh,0); opacity: 0; } }
    .click-heart { position: fixed; z-index: 5; pointer-events: none; color: #bd7794; font-size: 18px; transform: translate(-50%,-50%); animation: ambClickPop .85s ease-out forwards; text-shadow: 0 5px 18px rgba(190,105,139,.3); }
    @keyframes ambClickPop { 0% { opacity: 0; transform: translate(-50%,-50%) scale(.25); } 25% { opacity: .9; } 100% { opacity: 0; transform: translate(-50%,-85%) scale(3); } }
    @media (prefers-color-scheme: dark) { .particle-heart { color: #9c6b86; } .p-fire { color: #f3d98d; text-shadow: 0 0 10px #d9b45c, 0 0 24px rgba(217,180,92,.6); } }
  `;
  document.head.appendChild(style);
  style.setAttribute('data-rn-keep', '');
}

function createHeart() {
  const heart = document.createElement('span');
  heart.className = 'particle-heart';
  heart.textContent = '♥';
  heart.style.left = `${Math.random() * 100}%`;
  heart.style.fontSize = `${8 + Math.random() * 13}px`;
  heart.style.setProperty('--drift', `${-40 + Math.random() * 80}px`);
  heart.style.animationDuration = `${11 + Math.random() * 10}s`;
  heartBox.appendChild(heart);
  heart.addEventListener('animationend', () => heart.remove());
}

function createFaller(char, palette) {
  const el = document.createElement('span');
  el.className = 'p-fall';
  const inner = document.createElement('i');
  inner.textContent = char;
  el.appendChild(inner);
  el.style.left = `${Math.random() * 100}%`;
  el.style.fontSize = `${10 + Math.random() * 12}px`;
  el.style.color = palette[Math.floor(Math.random() * palette.length)];
  el.style.setProperty('--drift', `${(Math.random() * 14 - 3).toFixed(1)}vw`);
  el.style.setProperty('--sway', `${16 + Math.random() * 30}px`);
  el.style.setProperty('--rot', `${160 + Math.random() * 200}deg`);
  el.style.animationDuration = `${season === 'winter' ? 9 + Math.random() * 7 : 11 + Math.random() * 9}s`;
  inner.style.animationDuration = `${2.2 + Math.random() * 2.6}s`;
  heartBox.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

function createFirefly() {
  const el = document.createElement('span');
  el.className = 'p-fire';
  el.textContent = '✦';
  el.style.left = `${Math.random() * 100}%`;
  el.style.bottom = '-3vh';
  el.style.fontSize = `${7 + Math.random() * 7}px`;
  el.style.animationDuration = `${9 + Math.random() * 8}s`;
  heartBox.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

function spawnParticle() {
  if (season === 'heart') createHeart();
  else if (season === 'spring') createFaller('🌸', ['#f3b6cf', '#e89bbd', '#d9a1c8']);
  else if (season === 'autumn') createFaller('🍂', ['#d98c5f', '#c9763f', '#b8864d']);
  else if (season === 'winter') createFaller('❄', ['rgba(255,255,255,.95)', '#e7e0f5', '#dceef7']);
  else createFirefly();
}

if (!reduceMotion) {
  const initialCount = isMobile ? 5 : 8;
  for (let i = 0; i < initialCount; i++) setTimeout(spawnParticle, i * (isMobile ? 1400 : 900));
  setInterval(spawnParticle, isMobile ? 3200 : season === 'summer' ? 2600 : 2100);

  // 点击任意处绽放小爱心 + 轻柔"啵"声
  document.addEventListener('click', event => {
    if (event.target.closest('input, textarea, button, a')) return;
    sfx.pop();
    const heart = document.createElement('span');
    heart.className = 'click-heart';
    heart.textContent = '♥';
    heart.style.left = `${event.clientX}px`;
    heart.style.top = `${event.clientY}px`;
    document.body.appendChild(heart);
    heart.addEventListener('animationend', () => heart.remove());
  });
}

/* ============ Service Worker：注册 + 新版本就绪后自动刷新一次（全站共享） ============ */
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  let swRefreshing = false;
  // 新 SW 接管页面时自动重载，用户下次打开即为最新版本，无需手动清缓存
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (swRefreshing) return;
    swRefreshing = true;
    location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* 注册失败不影响页面 */ });
  });
}
