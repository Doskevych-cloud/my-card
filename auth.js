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

  // ── Dev token bootstrap ──
  // If page is opened with ?token=XXX, save it to localStorage and strip
  // from URL immediately so it doesn't leak via browser history / Referer.
  // Intended for moving a valid session from dev.generacia.energy to a
  // local preview. Requires the caller to own the token already.
  try {
    const u = new URL(location.href);
    const tok = u.searchParams.get('token');
    if (tok) {
      localStorage.setItem(TOKEN_KEY, tok);
      u.searchParams.delete('token');
      history.replaceState(null, '', u.toString());
    }
  } catch (_) {}

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

  // ── DEV-MODE: Finance is admin-only while module is being stabilized.
  // To open Finance for general users, change to: const FINANCE_ADMIN_ONLY = false;
  const FINANCE_ADMIN_ONLY = true;

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
    // DEV gate: finance available only to admins until module is stable
    if (FINANCE_ADMIN_ONLY && role === 'finance' && !user.roles.admin) {
      showDenyScreen(
        'Розділ «Фінанси» тимчасово доступний лише адміністраторам — модуль ще в активній розробці.',
        'finance'
      );
      return new Promise(() => {});
    }
    return user;
  }

  global.Auth = {
    API,
    getToken, setToken, clearToken,
    fetchMe, loginWithIdToken, logout,
    apiFetch,
    require,
    cachedUser,
    MODULE_LABEL,
  };
})(window);
