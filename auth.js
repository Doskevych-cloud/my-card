// ═════════════════════════════════════════════════════════════════
// Shared auth helpers — Google Sign-In + session + role gate
// Inject on every protected page BEFORE rendering.
//
// Usage (on each protected page):
//   <script src="auth.js"></script>
//   <script>Auth.require('forecast').then(user => { ... render app ... })</script>
// ═════════════════════════════════════════════════════════════════

(function (global) {
  const API = 'https://price-api.doskevich.workers.dev/';
  const TOKEN_KEY = 'session_token';
  const USER_CACHE_KEY = 'session_user';

  // ── Global fetch interceptor ──
  // Auto-attach Authorization: Bearer <token> to any fetch() call that
  // targets our worker. This way legacy pages (index.html, forecast.html,
  // warehouses.html, sales.html) that still use plain fetch() benefit from
  // the server-side auth wall without a full rewrite.
  if (!global.__authFetchPatched) {
    const _origFetch = global.fetch.bind(global);
    global.fetch = function (input, init) {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      if (url && url.includes('price-api.doskevich.workers.dev')) {
        init = init || {};
        const headers = new Headers(init.headers || (input && input.headers) || {});
        const token = localStorage.getItem(TOKEN_KEY) || '';
        if (token && !headers.has('Authorization')) {
          headers.set('Authorization', 'Bearer ' + token);
        }
        init.headers = headers;
      }
      return _origFetch(input, init);
    };
    global.__authFetchPatched = true;
  }

  const MODULE_LABEL = {
    dashboard: 'Дашборд',
    home: 'Порівняння цін',
    forecast: 'Прогноз кабелю',
    warehouses: 'Склад',
    sales: 'Продажі',
    finance: 'Фінанси',
    admin: 'Адмін-панель',
  };

  function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
  function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_CACHE_KEY);
  }
  function cachedUser() {
    try { return JSON.parse(localStorage.getItem(USER_CACHE_KEY) || 'null'); }
    catch { return null; }
  }
  function setCachedUser(u) {
    if (u) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_CACHE_KEY);
  }

  async function apiFetch(action, opts = {}) {
    const token = getToken();
    const headers = Object.assign({}, opts.headers || {});
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (opts.body && !(opts.body instanceof FormData) && typeof opts.body !== 'string') {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(opts.body);
    }
    const res = await fetch(API + '?action=' + action, Object.assign({}, opts, { headers }));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || ('HTTP ' + res.status));
      err.status = res.status;
      throw err;
    }
    return data;
  }

  async function fetchMe() {
    try {
      const r = await apiFetch('auth_me');
      setCachedUser(r.user);
      return r.user;
    } catch (e) {
      if (e.status === 401) clearToken();
      throw e;
    }
  }

  async function loginWithIdToken(idToken) {
    const r = await apiFetch('auth_google', { method: 'POST', body: { idToken } });
    setToken(r.token);
    setCachedUser(r.user);
    return r.user;
  }

  async function logout() {
    try { await apiFetch('auth_logout', { method: 'POST' }); } catch {}
    clearToken();
    location.href = 'login.html';
  }

  function loginRedirect() {
    const ret = encodeURIComponent(location.pathname + location.search + location.hash);
    location.href = 'login.html?return=' + ret;
  }

  // Block page with a full-screen deny overlay (no role or not logged in).
  function showDenyScreen(reason, module) {
    const user = cachedUser();
    const modLabel = MODULE_LABEL[module] || module;
    document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'dark');
    document.body.innerHTML = `
      <style>
        body { margin:0; font-family: Inter, -apple-system, Segoe UI, sans-serif;
               background: var(--bg, #0b0e11); color: var(--text, #eaecef);
               min-height: 100vh; display:flex; align-items:center; justify-content:center; }
        .deny { max-width: 460px; padding: 40px 32px; text-align:center;
                background: rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08);
                border-radius: 16px; }
        .deny h1 { margin:0 0 12px; font-size: 22px; }
        .deny p  { margin: 10px 0; color:#9aa4b2; line-height:1.5; }
        .deny .email { color:#ff8319; font-weight:600; }
        .deny button, .deny a.btn { display:inline-block; margin-top:18px; padding:10px 18px;
                background:#ff8319; color:#111; text-decoration:none; font-weight:600;
                border:0; border-radius:10px; cursor:pointer; font-size:14px; }
        .deny .muted { margin-top:14px; font-size:12px; color:#6b7280; }
        .deny .avatar { width:56px; height:56px; border-radius:50%; margin:0 auto 16px;
                background:#ff8319; color:#111; display:flex; align-items:center; justify-content:center;
                font-weight:700; font-size:22px; }
        .deny img.avatar { object-fit:cover; }
      </style>
      <div class="deny">
        ${user && user.picture
          ? `<img class="avatar" src="${user.picture}" referrerpolicy="no-referrer" alt="">`
          : `<div class="avatar">${user ? (user.name || user.email || '?').slice(0,1).toUpperCase() : '?'}</div>`}
        <h1>⛔ Немає доступу до модуля «${modLabel}»</h1>
        ${user ? `<p>Ви увійшли як <span class="email">${user.email}</span></p>` : ''}
        <p>${reason || 'Зверніться до адміністратора, щоб відкрити доступ.'}</p>
        <a class="btn" href="index.html">← На головну</a>
        ${user ? `<div class="muted"><a href="#" onclick="Auth.logout();return false" style="color:#6b7280">Вийти з акаунта</a></div>` : ''}
      </div>
    `;
  }

  // Full flow: checks session, fetches user, verifies role, or redirects/denies.
  // Returns the user on success.
  async function require(role) {
    if (!getToken()) { loginRedirect(); return new Promise(() => {}); }
    let user;
    try { user = await fetchMe(); }
    catch (e) {
      if (e.status === 401) { loginRedirect(); return new Promise(() => {}); }
      // network glitch — fall back to cache
      user = cachedUser();
      if (!user) { loginRedirect(); return new Promise(() => {}); }
    }
    if (!user.roles || !user.roles[role]) {
      showDenyScreen(`Адмін ще не відкрив вам доступ до цього модуля.`, role);
      return new Promise(() => {}); // halt caller
    }
    return user;
  }

  // Render user widget into top nav (small avatar + dropdown with logout).
  function mountUserWidget(user, opts = {}) {
    const host = document.querySelector(opts.selector || '.app-nav');
    if (!host || !user) return;
    const wrap = document.createElement('div');
    wrap.className = 'user-widget';
    wrap.style.cssText = 'position:relative;margin-left:auto;display:flex;align-items:center;gap:10px';
    const isAdmin = !!(user.roles && user.roles.admin);
    wrap.innerHTML = `
      ${isAdmin ? `<a class="nav-pill" href="admin.html" style="font-size:12px">⚙ Адмін</a>` : ''}
      <button id="authBtn" title="${user.email}"
        style="display:flex;align-items:center;gap:8px;background:transparent;border:1px solid var(--border,rgba(255,255,255,.1));color:var(--text,#eaecef);padding:4px 10px 4px 4px;border-radius:999px;cursor:pointer;font:inherit;font-size:13px">
        ${user.picture
          ? `<img src="${user.picture}" referrerpolicy="no-referrer" alt="" style="width:26px;height:26px;border-radius:50%;object-fit:cover">`
          : `<span style="width:26px;height:26px;border-radius:50%;background:#ff8319;color:#111;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:12px">${(user.name||user.email||'?').slice(0,1).toUpperCase()}</span>`}
        <span style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${user.name || user.email}</span>
      </button>
      <div id="authMenu" style="display:none;position:absolute;right:0;top:calc(100% + 6px);min-width:220px;background:var(--card,#1e2329);border:1px solid var(--border,rgba(255,255,255,.1));border-radius:12px;padding:8px;z-index:1000;box-shadow:0 10px 30px rgba(0,0,0,.4)">
        <div style="padding:8px 10px;color:var(--text3,#6b7280);font-size:12px;border-bottom:1px solid var(--border,rgba(255,255,255,.08));margin-bottom:6px">${user.email}</div>
        <button id="authLogout" style="width:100%;text-align:left;background:transparent;border:0;color:var(--text,#eaecef);padding:8px 10px;border-radius:8px;cursor:pointer;font:inherit">Вийти</button>
      </div>
    `;
    host.appendChild(wrap);
    const btn = wrap.querySelector('#authBtn');
    const menu = wrap.querySelector('#authMenu');
    btn.addEventListener('click', (e) => { e.stopPropagation(); menu.style.display = menu.style.display === 'none' ? 'block' : 'none'; });
    document.addEventListener('click', () => { menu.style.display = 'none'; });
    wrap.querySelector('#authLogout').addEventListener('click', (e) => { e.preventDefault(); logout(); });
    // hover styles
    const style = document.createElement('style');
    style.textContent = `#authMenu button:hover { background: rgba(255,255,255,.06) }`;
    document.head.appendChild(style);
  }

  global.Auth = {
    API,
    getToken, setToken, clearToken,
    fetchMe, loginWithIdToken, logout,
    apiFetch,
    require,
    mountUserWidget,
    cachedUser,
    MODULE_LABEL,
  };
})(window);
