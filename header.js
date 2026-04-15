// ═════════════════════════════════════════════════════════════════
// Shared top bar — identical on every page.
// Usage on any page:
//   <body>
//     <div id="appHeader"></div>
//     ...page content...
//     <script src="auth.js"></script>
//     <script src="header.js"></script>
//     <script>
//       Auth.require('home').then(user => {
//         AppHeader.mount({ active: 'home', user });
//         // ...render the page...
//       });
//     </script>
//
// Contract:
//   - Left: orange logo + "REACT" wordmark (never changes).
//   - Right: nav pills (active = current page) + theme toggle
//            + ⚙ Адмін link (only if user.roles.admin)
//            + user avatar / dropdown (logout).
//   - Theme is shared via localStorage['theme']. Early-init script in
//     <head> sets data-theme before paint (no FOUC).
//
// Module-specific widgets (date banners, page titles, settings cogs)
// must live in the page body — NEVER in the header.
// ═════════════════════════════════════════════════════════════════

(function (global) {
  const STYLE_ID = 'app-header-style';
  const CSS = `
    #appHeader { --hdr-bg: color-mix(in srgb, var(--bg, #0b0e11) 80%, transparent); }
    .app-topbar{
      position:sticky; top:0; z-index:50;
      display:flex; align-items:center; gap:16px;
      padding:12px 20px;
      background: var(--hdr-bg);
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      border-bottom:1px solid var(--border, rgba(255,255,255,.08));
      font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    }
    .app-topbar .brand{
      display:inline-flex; align-items:center; gap:10px;
      color: var(--text, #eaecef); text-decoration:none;
      font-weight:700; letter-spacing:-.3px;
    }
    .app-topbar .brand .logo{
      width:34px; height:34px; border-radius:9px;
      background: linear-gradient(135deg,#ff8319 0%, #ff5a2e 100%);
      display:flex; align-items:center; justify-content:center;
      color:#fff; font-weight:800; font-size:16px;
      box-shadow:0 4px 12px rgba(255,131,25,.35);
    }
    .app-topbar .brand .name{ font-size:16px; line-height:1 }
    .app-topbar .spacer{ flex:1 }

    .app-topbar .nav{
      display:inline-flex; align-items:center; gap:3px;
      padding:3px;
      border:1px solid var(--border, rgba(255,255,255,.08));
      border-radius:10px;
      background: var(--bg2, rgba(255,255,255,.02));
    }
    .app-topbar .nav a{
      display:inline-flex; align-items:center; gap:5px;
      font-size:12px; font-weight:500;
      color: var(--text2, #9aa4b2); text-decoration:none;
      padding:6px 11px; border-radius:7px;
      transition: background .15s, color .15s;
      white-space:nowrap;
    }
    .app-topbar .nav a:hover{ background: var(--bg3, rgba(255,255,255,.05)); color: var(--text, #eaecef) }
    .app-topbar .nav a.active{
      background: rgba(255,131,25,.12); color:#ff8319; font-weight:600;
    }

    .app-topbar .theme-btn{
      width:36px; height:36px; padding:0;
      border-radius:8px; cursor:pointer;
      color: var(--text2, #9aa4b2);
      background: var(--bg2, rgba(255,255,255,.03));
      border:1px solid var(--border, rgba(255,255,255,.08));
      display:inline-flex; align-items:center; justify-content:center;
      transition: border-color .15s, color .15s;
    }
    .app-topbar .theme-btn:hover{ border-color:#ff8319; color:#ff8319 }
    .app-topbar .theme-btn svg{ width:16px; height:16px; fill:currentColor }

    .app-topbar .admin-link{
      font-size:12px; font-weight:500;
      color: var(--text2, #9aa4b2);
      text-decoration:underline; text-underline-offset:3px;
      padding:6px 4px;
    }
    .app-topbar .admin-link:hover{ color:#ff8319 }

    .app-topbar .user-btn{
      display:inline-flex; align-items:center; gap:8px;
      background:transparent;
      border:1px solid var(--border, rgba(255,255,255,.08));
      color: var(--text, #eaecef);
      padding:4px 12px 4px 4px;
      border-radius:999px; cursor:pointer;
      font:inherit; font-size:13px;
    }
    .app-topbar .user-btn:hover{ border-color: var(--border2, rgba(255,255,255,.15)) }
    .app-topbar .user-btn .avatar{
      width:26px; height:26px; border-radius:50%;
      background:#ff8319; color:#111;
      display:inline-flex; align-items:center; justify-content:center;
      font-weight:700; font-size:12px; object-fit:cover;
    }
    .app-topbar .user-btn .uname{
      max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
    }
    .app-topbar .user-wrap{ position:relative }
    .app-topbar .user-menu{
      display:none; position:absolute; right:0; top:calc(100% + 6px);
      min-width:220px; padding:8px;
      background: var(--card, var(--bg2, #1e2026));
      border:1px solid var(--border, rgba(255,255,255,.08));
      border-radius:12px;
      box-shadow:0 10px 30px rgba(0,0,0,.4);
      z-index:1000;
    }
    .app-topbar .user-menu.open{ display:block }
    .app-topbar .user-menu .mu-email{
      padding:8px 10px;
      color: var(--text3, #6b7280); font-size:12px;
      border-bottom:1px solid var(--border, rgba(255,255,255,.08));
      margin-bottom:6px;
      overflow:hidden; text-overflow:ellipsis;
    }
    .app-topbar .user-menu button{
      width:100%; text-align:left;
      background:transparent; border:0;
      color: var(--text, #eaecef);
      padding:8px 10px; border-radius:8px;
      cursor:pointer; font:inherit;
    }
    .app-topbar .user-menu button:hover{ background: rgba(255,131,25,.10); color:#ff8319 }

    @media (max-width:720px){
      .app-topbar{ padding:10px 12px; gap:10px }
      .app-topbar .brand .name{ display:none }
      .app-topbar .nav a{ padding:5px 8px; font-size:11px }
      .app-topbar .user-btn .uname{ display:none }
    }
  `;

  const THEME_KEY = 'theme';

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
    // update theme button icon (sun ⇄ moon)
    const sun = document.getElementById('hdrIconSun');
    const moon = document.getElementById('hdrIconMoon');
    if (sun && moon) {
      sun.style.display  = theme === 'dark' ? 'none' : '';
      moon.style.display = theme === 'dark' ? '' : 'none';
    }
  }
  function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function userButtonHtml(user) {
    if (!user) return '';
    const initials = (user.name || user.email || '?').slice(0, 1).toUpperCase();
    const avatar = user.picture
      ? `<img class="avatar" src="${esc(user.picture)}" referrerpolicy="no-referrer" alt="">`
      : `<span class="avatar">${esc(initials)}</span>`;
    return `
      <div class="user-wrap">
        <button class="user-btn" id="hdrUserBtn" title="${esc(user.email)}">
          ${avatar}
          <span class="uname">${esc(user.name || user.email)}</span>
        </button>
        <div class="user-menu" id="hdrUserMenu">
          <div class="mu-email">${esc(user.email)}</div>
          <button id="hdrLogout">Вийти</button>
        </div>
      </div>
    `;
  }

  function mount(opts = {}) {
    injectStyle();
    const active = opts.active || '';
    const user = opts.user || (global.Auth && global.Auth.cachedUser && global.Auth.cachedUser()) || null;
    const isAdmin = !!(user && user.roles && user.roles.admin);

    let host = document.getElementById('appHeader');
    if (!host) {
      host = document.createElement('div');
      host.id = 'appHeader';
      document.body.insertBefore(host, document.body.firstChild);
    }

    host.innerHTML = `
      <header class="app-topbar">
        <a class="brand" href="/" title="REACT">
          <span class="logo">R</span>
          <span class="name">REACT</span>
        </a>
        <nav class="nav">
          <a href="/"                class="${active==='home'       ? 'active' : ''}">🏠 Порівняння цін</a>
          <a href="/forecast.html"   class="${active==='forecast'   ? 'active' : ''}">📊 Закупівлі</a>
          <a href="/warehouses.html" class="${active==='warehouses' ? 'active' : ''}">📦 Склад</a>
        </nav>
        <div class="spacer"></div>
        <button class="theme-btn" onclick="AppHeader.toggleTheme()" title="Переключити тему">
          <svg id="hdrIconSun"  viewBox="0 0 24 24" style="display:none"><circle cx="12" cy="12" r="4"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="7" y2="7"/><line x1="17" y1="17" x2="19.1" y2="19.1"/><line x1="4.9" y1="19.1" x2="7" y2="17"/><line x1="17" y1="7" x2="19.1" y2="4.9"/></g></svg>
          <svg id="hdrIconMoon" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        </button>
        ${isAdmin ? `<a class="admin-link" href="/admin.html">⚙ Адмін</a>` : ''}
        ${userButtonHtml(user)}
      </header>
    `;

    // Initialize theme icon (data-theme already set by inline head script).
    const curTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(curTheme);

    // User dropdown behaviour
    const btn  = host.querySelector('#hdrUserBtn');
    const menu = host.querySelector('#hdrUserMenu');
    const lo   = host.querySelector('#hdrLogout');
    if (btn && menu) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('open');
      });
      document.addEventListener('click', () => menu.classList.remove('open'));
    }
    if (lo) {
      lo.addEventListener('click', (e) => {
        e.preventDefault();
        if (global.Auth && global.Auth.logout) global.Auth.logout();
      });
    }
  }

  global.AppHeader = { mount, toggleTheme, applyTheme };
})(window);
