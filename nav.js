// ============ nav.js 全站导航 + 柔光转场（全站共享） ============
// 引入：各页面 <script type="module" src="nav.js"></script>
// 右上角 ♡ 悬浮钮展开页面导航；点击链接时柔光淡出后再跳转。
const PAGES = [
  { href: 'index.html', label: '开场 · 心事', icon: '♡' },
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
/* 柔光转场：点击导航后整页淡出 */
body.rn-leaving { opacity: 0 !important; transition: opacity .38s ease; }
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

// 柔光转场：站内链接点击后淡出再跳转
document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href]');
  if (!link) return;
  const href = link.getAttribute('href');
  if (!href || /^(https?:|#|mailto:)/i.test(href)) return;
  if (href.split('#')[0] === here) return;
  event.preventDefault();
  document.body.classList.add('rn-leaving');
  setTimeout(() => { location.href = href; }, 380);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && nav.classList.contains('is-open')) {
    nav.classList.remove('is-open');
    navBtn.setAttribute('aria-expanded', 'false');
  }
});
