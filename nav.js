// ============ nav.js 全站导航 + 柔光转场（全站共享） ============
// 引入：各页面 <script type="module" src="nav.js"></script>
// 右上角 ♡ 悬浮钮展开页面导航；点击链接时柔光淡出后再跳转。
const PAGES = [
  { href: 'index.html', label: '开场 · 心事', icon: '♡' },
  { href: 'wheel.html', label: '今天吃什么', icon: '🍜' },
  { href: 'gallery.html', label: '时光相册', icon: '✧' },
  { href: 'letters.html', label: '情书珍藏', icon: '✉' },
  { href: 'report.html', label: '年度报告', icon: '✦' },
];

const style = document.createElement('style');
style.textContent = `
#romanticNav { position: fixed; top: 16px; right: 16px; z-index: 88; font-family: "Microsoft YaHei", sans-serif; }
#romanticNav .rn-btn { width: 44px; height: 44px; border-radius: 50%; border: 1px solid rgba(255,255,255,.65); background: rgba(255,250,252,.82); color: #bd879e; font-size: 19px; cursor: pointer; box-shadow: 0 10px 26px rgba(118,78,113,.22); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); display: grid; place-items: center; transition: transform .3s ease, background .3s; }
#romanticNav .rn-btn:hover { transform: scale(1.08) rotate(-6deg); background: rgba(255,255,255,.95); }
#romanticNav .rn-btn .rn-heart { display: block; animation: rn-beat 2.6s ease-in-out infinite; }
@keyframes rn-beat { 50% { transform: scale(1.18); } }
#romanticNav .rn-menu { position: absolute; top: 52px; right: 0; min-width: 148px; padding: 8px; border-radius: 17px; background: rgba(255,250,252,.92); border: 1px solid rgba(255,255,255,.7); box-shadow: 0 18px 48px rgba(118,78,113,.24); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); opacity: 0; visibility: hidden; transform: translateY(-6px) scale(.96); transform-origin: 100% 0; transition: opacity .28s ease, transform .28s cubic-bezier(.2,.8,.2,1), visibility .28s; }
#romanticNav.is-open .rn-menu { opacity: 1; visibility: visible; transform: none; }
#romanticNav .rn-menu a { display: flex; align-items: center; gap: 9px; padding: 9px 12px; border-radius: 11px; text-decoration: none; color: #8b7381; font-size: .84rem; letter-spacing: .05em; transition: background .2s, color .2s; }
#romanticNav .rn-menu a:hover { background: rgba(232,183,203,.2); color: #9b5f7d; }
#romanticNav .rn-menu a.rn-current { background: rgba(232,183,203,.32); color: #9b5f7d; font-weight: 600; }
#romanticNav .rn-menu a .rn-ico { color: #bd879e; font-style: normal; }
/* 柔光转场：换页时整页淡出/淡入 */
body { transition: opacity .38s ease; }
body.rn-leaving { opacity: 0 !important; }
@media (prefers-color-scheme: dark) {
  #romanticNav .rn-btn { background: rgba(52,42,58,.85); border-color: rgba(255,255,255,.14); color: #d5a0b8; }
  #romanticNav .rn-menu { background: rgba(52,42,58,.94); border-color: rgba(255,255,255,.14); }
  #romanticNav .rn-menu a { color: #b49cae; }
  #romanticNav .rn-menu a:hover { background: rgba(232,183,203,.12); color: #d5a0b8; }
  #romanticNav .rn-menu a.rn-current { background: rgba(232,183,203,.2); color: #d5a0b8; }
}
@media (max-width: 560px) { #romanticNav { top: 10px; right: 10px; } #romanticNav .rn-btn { width: 40px; height: 40px; } }
@media (prefers-reduced-motion: reduce) { #romanticNav .rn-heart { animation: none !important; } }
`;
document.head.appendChild(style);
style.setAttribute('data-rn-keep', '');

const nav = document.createElement('div');
nav.id = 'romanticNav';
const here = location.pathname.split('/').pop() || 'index.html';
nav.innerHTML = `
  <button type="button" class="rn-btn" aria-expanded="false" aria-label="打开页面导航"><span class="rn-heart">♡</span></button>
  <nav class="rn-menu" aria-label="全站导航">
    ${PAGES.map(p => `<a href="${p.href}" class="${p.href === here ? 'rn-current' : ''}" ${p.href === here ? 'aria-current="page"' : ''}><i class="rn-ico">${p.icon}</i>${p.label}</a>`).join('')}
  </nav>
`;
document.body.appendChild(nav);
nav.setAttribute('data-rn-keep', '');

const navBtn = nav.querySelector('.rn-btn');
navBtn.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  navBtn.setAttribute('aria-expanded', String(open));
});

// 点击外部收起
document.addEventListener('pointerdown', (event) => {
  if (nav.classList.contains('is-open') && !nav.contains(event.target)) {
    nav.classList.remove('is-open');
    navBtn.setAttribute('aria-expanded', 'false');
  }
});

// ============ SPA 无刷新换页：站内跳转不重新加载文档，音乐得以连续播放 ============
// 原理：拦截站内链接 → 拉取目标页 HTML → 整体替换"页面级 body 节点"与页面样式 → 执行页面脚本。
// #romanticNav / #romanticPlayer / #hearts 等常驻组件（带 data-rn-keep）与 <script> 不参与切换。
const pageCache = new Map();          // 规范化路径 -> { nodes, title, init }
let currentPath = normPath(location.href);
let navBusy = false;
let pendingNav = null;

// 入口页 HTML 里自带的 #hearts（如 index.html）也标记为常驻，避免被换走
document.querySelectorAll('#hearts').forEach(el => el.setAttribute('data-rn-keep', ''));

// 页面级节点：不是 <script>、也没有 data-rn-keep 标记的 body 直接子元素
const isPageOwned = node => node && node.tagName !== 'SCRIPT' && !node.hasAttribute('data-rn-keep');

function normPath(href) {
  try {
    const u = new URL(href, location.href);
    return u.pathname.endsWith('/') ? u.pathname + 'index.html' : u.pathname;
  } catch { return href; }
}

function isInternalNav(link, event) {
  if (event.defaultPrevented) return false;
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (link.hasAttribute('download') || (link.target && link.target !== '_self')) return false;
  const raw = link.getAttribute('href');
  if (!raw || /^(https?:|#|mailto:|tel:|data:)/i.test(raw)) return false;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin) return false;
  const p = normPath(url.href);
  return p.endsWith('.html') || p.endsWith('/');
}

function closeMenu() {
  nav.classList.remove('is-open');
  navBtn.setAttribute('aria-expanded', 'false');
}

function updateCurrentNav(path) {
  nav.querySelectorAll('.rn-menu a').forEach(a => {
    const cur = normPath(a.getAttribute('href')) === path;
    a.classList.toggle('rn-current', cur);
    if (cur) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

async function navigate(href, { push = true } = {}) {
  const url = new URL(href, location.href);
  const path = normPath(url.href);
  if (navBusy) { pendingNav = { href, push }; return; }
  navBusy = true;
  try {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // 点击前进时：把离开页的滚动位置存进当前历史条目（popstate 时恢复目标页滚动）
    if (push) {
      try { history.replaceState({ ...(history.state || {}), rnScroll: window.scrollY }, ''); } catch { /* 忽略 */ }
    }
    // 拉取目标页（no-store 保证拿到最新；失败则退回整页跳转）
    const startedAt = Date.now();
    let doc;
    try {
      const res = await fetch(url.href, { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      if (!doc.querySelector('main')) throw new Error('no main');
    } catch {
      location.href = url.href;
      return;
    }
    // 淡出（预留动画时间；fetch 已耗时则补齐到 380ms）
    if (!reduce) {
      document.body.classList.add('rn-leaving');
      const wait = Math.max(0, 380 - (Date.now() - startedAt));
      if (wait) await new Promise(r => setTimeout(r, wait));
    }
    // 缓存当前页的全部页面级节点（含已绑定事件的 DOM，如线条人物/小猫/灯箱等）
    const oldNodes = Array.from(document.body.children).filter(isPageOwned);
    pageCache.set(currentPath, { nodes: oldNodes, title: document.title, init: true });
    // 目标页：优先用缓存（返回/前进时原样恢复，零闪烁）
    let entry = pageCache.get(path);
    if (!entry) {
      const freshNodes = Array.from(doc.body.children)
        .filter(n => n.tagName !== 'SCRIPT' && !n.hasAttribute('data-rn-keep') && n.id !== 'hearts')
        .map(n => document.importNode(n, true));
      entry = { nodes: freshNodes, title: doc.title, init: false };
      pageCache.set(path, entry);
    }
    // 换页面样式（运行时注入的样式带 data-rn-keep，保留）
    document.head.querySelectorAll('style:not([data-rn-keep])').forEach(s => s.remove());
    doc.head.querySelectorAll('style').forEach(s => document.head.appendChild(document.importNode(s, true)));
    // 整体替换页面级 body 节点（常驻组件不动，音乐/粒子/导航不受影响）
    oldNodes.forEach(n => n.remove());
    entry.nodes.forEach(n => document.body.appendChild(n));
    document.title = entry.title;
    if (push) { try { history.pushState({ rnScroll: 0 }, '', url.href); } catch { /* 忽略 */ } }
    // 首次进入该页：执行其内联模块脚本（页面专属逻辑；带 src 的共享脚本已加载，跳过）。
    // 用 body 上的令牌确认脚本运行时目标页仍挂载；用户快速切走时待执行脚本自动放弃，避免 null 报错。
    if (!entry.init) {
      entry.init = true;
      const token = 'rn-' + Math.random().toString(36).slice(2);
      document.body.dataset.rnToken = token;
      doc.body.querySelectorAll('script[type="module"]:not([src])').forEach(s => {
        const el = document.createElement('script');
        el.type = 'module';
        el.textContent =
          `{ let __ok = false;\n` +
          `  for (let i = 0; i < 100; i++) { if (document.body.dataset.rnToken === '${token}') { __ok = true; break; } await new Promise(r => setTimeout(r, 50)); }\n` +
          `  if (!__ok) throw new Error('[nav] 页面已切换，跳过本页脚本');\n` +
          `}\n` + s.textContent;
        document.body.appendChild(el);
      });
    } else {
      // 恢复缓存页：更新令牌（不会触发脚本，仅用于一致性）
      document.body.dataset.rnToken = 'rn-cache-' + Math.random().toString(36).slice(2);
    }
    currentPath = path;
    updateCurrentNav(path);
    // 滚动：前进回顶部；后退恢复离开时位置
    window.scrollTo(0, push ? 0 : ((history.state && history.state.rnScroll) || 0));
    document.body.classList.remove('rn-leaving');
  } finally {
    navBusy = false;
    if (pendingNav) { const p = pendingNav; pendingNav = null; navigate(p.href, { push: p.push }); }
  }
}

// 站内链接点击 → 无刷新换页
document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href]');
  if (!link || !isInternalNav(link, event)) return;
  event.preventDefault();
  closeMenu();
  const target = normPath(link.href);
  if (target === currentPath) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  navigate(link.href, { push: true });
});

// 浏览器后退/前进：恢复对应页面（音乐继续，不重载文档）
window.addEventListener('popstate', () => {
  const p = normPath(location.href);
  if (p === currentPath) return;
  navigate(location.href, { push: false });
});

// 滚动时把位置记入当前历史条目（供后退恢复）
let scrollSaveTimer = 0;
window.addEventListener('scroll', () => {
  clearTimeout(scrollSaveTimer);
  scrollSaveTimer = setTimeout(() => {
    try { history.replaceState({ ...(history.state || {}), rnScroll: window.scrollY }, ''); } catch { /* 忽略 */ }
  }, 200);
}, { passive: true });

// 从浏览器"后退缓存(bfcache)"返回时，清除残留的淡出状态，
// 否则上一页会带着 rn-leaving（opacity:0）被恢复，看起来像白屏。
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    document.body.classList.remove('rn-leaving');
    document.body.style.opacity = '';
    document.body.style.transition = '';
    // 返回时也收起可能展开的导航菜单
    nav.classList.remove('is-open');
    navBtn.setAttribute('aria-expanded', 'false');
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && nav.classList.contains('is-open')) {
    nav.classList.remove('is-open');
    navBtn.setAttribute('aria-expanded', 'false');
  }
});
