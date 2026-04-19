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
  // ── Impersonation (admin тимчасово переходить у сесію іншого користувача) ──
  // Стратегія: при старті — backup поточного токену+юзера у *_bak ключі,
  // поверх пишемо токен/юзера цільового. Stop — повертаємо бекап. У всіх
  // запитах Auth.apiFetch/fetch-interceptor далі використовуються поточні
  // TOKEN_KEY/USER_CACHE_KEY — ніяких розгалужень в логіці доступу не треба.
  const ADMIN_TOKEN_BAK = 'admin_token_bak';
  const ADMIN_USER_BAK = 'admin_user_bak';
  const IMPERSONATED_BY_KEY = 'impersonated_by';

  // ── Dev token bootstrap ── (REMOVED 2026-04-18)
  // The previous ?token=XXX bootstrap was a session-fixation gadget on the
  // public domain — an attacker could plant their token via a link and tie
  // the victim's actions to the attacker's session (and vice versa).
  // If you need to move a session to local preview, copy the token manually
  // into localStorage.session_token in DevTools.

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
    reports: 'Звіти',
    suppliers: 'Постачальники',
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
    // Чистимо і бекап імперсонації — повний logout
    localStorage.removeItem(ADMIN_TOKEN_BAK);
    localStorage.removeItem(ADMIN_USER_BAK);
    localStorage.removeItem(IMPERSONATED_BY_KEY);
    location.href = 'login.html';
  }

  // ── Impersonation helpers ──
  function isImpersonating() {
    return !!localStorage.getItem(ADMIN_TOKEN_BAK);
  }
  function impersonatedBy() {
    return localStorage.getItem(IMPERSONATED_BY_KEY) || '';
  }
  async function startImpersonate(email) {
    // Бекап поточної адмін-сесії
    const curTok = getToken();
    const curUser = cachedUser();
    if (!curTok || !curUser) throw new Error('Не авторизовано');
    if (!(curUser.roles && curUser.roles.admin)) throw new Error('Не адмін');
    const r = await apiFetch('admin_impersonate', { method: 'POST', body: { email } });
    localStorage.setItem(ADMIN_TOKEN_BAK, curTok);
    localStorage.setItem(ADMIN_USER_BAK, JSON.stringify(curUser));
    localStorage.setItem(IMPERSONATED_BY_KEY, curUser.email);
    setToken(r.token);
    setCachedUser(r.user);
    return r.user;
  }
  async function stopImpersonate() {
    const bakTok = localStorage.getItem(ADMIN_TOKEN_BAK);
    const bakUser = localStorage.getItem(ADMIN_USER_BAK);
    if (!bakTok || !bakUser) return null;
    // Знищуємо тимчасову імперсоновану сесію на сервері
    try { await apiFetch('auth_logout', { method: 'POST' }); } catch {}
    setToken(bakTok);
    try { setCachedUser(JSON.parse(bakUser)); } catch { setCachedUser(null); }
    localStorage.removeItem(ADMIN_TOKEN_BAK);
    localStorage.removeItem(ADMIN_USER_BAK);
    localStorage.removeItem(IMPERSONATED_BY_KEY);
    return cachedUser();
  }

  function loginRedirect() {
    const ret = encodeURIComponent(location.pathname + location.search + location.hash);
    location.href = 'login.html?return=' + ret;
  }

  // HTML escape (used by showDenyScreen). Tiny duplicate of header.js/esc().
  function _dEsc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // Block page with a deny overlay. Preserves the shared #appHeader and
  // the impersonation banner so admin can always "Return as admin" even
  // if the impersonated user has no access to the landing page.
  function showDenyScreen(reason, module) {
    const user = cachedUser();
    const modLabel = MODULE_LABEL[module] || module;
    const imp = isImpersonating();
    const impAdmin = imp ? impersonatedBy() : '';
    document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'dark');

    // Якщо ми в імперсонації — монтуємо шапку з банером "Повернутись",
    // щоб адмін не застряг на заблокованій сторінці.
    if (imp && global.AppHeader && global.AppHeader.mount) {
      try { global.AppHeader.mount({ active: '', user }); } catch {}
    }

    // Стилі + deny-картка додаються ПІСЛЯ існуючого appHeader, не перетираючи body.
    const headerEl = document.getElementById('appHeader');
    const denyHtml = `
      <style>
        body { margin:0; font-family: Inter, -apple-system, Segoe UI, sans-serif;
               background: var(--bg, #0b0e11); color: var(--text, #eaecef); min-height: 100vh; }
        #__denyWrap { display:flex; align-items:center; justify-content:center; padding: 60px 20px; min-height: calc(100vh - 80px); }
        .deny { max-width: 460px; padding: 40px 32px; text-align:center;
                background: rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08);
                border-radius: 16px; }
        .deny h1 { margin:0 0 12px; font-size: 22px; }
        .deny p  { margin: 10px 0; color:#9aa4b2; line-height:1.5; }
        .deny .email { color:#ff8319; font-weight:600; }
        .deny .btns { display:flex; gap: 10px; justify-content:center; flex-wrap:wrap; margin-top:18px }
        .deny button, .deny a.btn { display:inline-block; padding:10px 18px;
                background:#ff8319; color:#111; text-decoration:none; font-weight:600;
                border:0; border-radius:10px; cursor:pointer; font-size:14px; font-family:inherit }
        .deny a.btn.ghost { background: transparent; color: #eaecef; border: 1px solid rgba(255,255,255,.12) }
        .deny button.imp-back { background:#f0b90b }
        .deny button.imp-back:hover { background:#ffcc33 }
        .deny .muted { margin-top:14px; font-size:12px; color:#6b7280; }
        .deny .avatar { width:56px; height:56px; border-radius:50%; margin:0 auto 16px;
                background:#ff8319; color:#111; display:flex; align-items:center; justify-content:center;
                font-weight:700; font-size:22px; }
        .deny img.avatar { object-fit:cover; }
      </style>
      <div id="__denyWrap">
        <div class="deny">
          ${user && user.picture
            ? `<img class="avatar" src="${_dEsc(user.picture)}" referrerpolicy="no-referrer" alt="">`
            : `<div class="avatar">${_dEsc(user ? (user.name || user.email || '?').slice(0,1).toUpperCase() : '?')}</div>`}
          <h1>⛔ Немає доступу до модуля «${_dEsc(modLabel)}»</h1>
          ${user ? `<p>Ви увійшли як <span class="email">${_dEsc(user.email)}</span>${imp ? ` (адмін ${_dEsc(impAdmin)})` : ''}</p>` : ''}
          <p>${_dEsc(reason || 'Зверніться до адміністратора, щоб відкрити доступ.')}</p>
          <div class="btns">
            ${imp
              ? `<button class="imp-back" onclick="AppHeader && AppHeader.stopImpersonate && AppHeader.stopImpersonate()">← Повернутись як адмін</button>
                 <a class="btn ghost" href="/admin.html">До адмін-панелі</a>`
              : `<a class="btn" href="index.html">← На головну</a>`}
          </div>
          ${user && !imp ? `<div class="muted"><a href="#" onclick="Auth.logout();return false" style="color:#6b7280">Вийти з акаунта</a></div>` : ''}
        </div>
      </div>
    `;

    // Замість body.innerHTML = ... щоб не знести вже змонтовану шапку,
    // чистимо все КРІМ #appHeader і додаємо deny після нього.
    const kids = Array.from(document.body.children);
    for (const el of kids) {
      if (el.id !== 'appHeader') el.remove();
    }
    const tpl = document.createElement('div');
    tpl.innerHTML = denyHtml;
    while (tpl.firstChild) document.body.appendChild(tpl.firstChild);
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
    const roles = user.roles || {};
    // Admin bypasses all per-module role checks — except special DEV gates below.
    const isAdmin = !!roles.admin;
    if (!isAdmin && !roles[role]) {
      showDenyScreen(`Адмін ще не відкрив вам доступ до цього модуля.`, role);
      return new Promise(() => {}); // halt caller
    }
    // DEV gate: finance available only to admins until module is stable
    if (FINANCE_ADMIN_ONLY && role === 'finance' && !isAdmin) {
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
    // Impersonation
    isImpersonating, impersonatedBy,
    startImpersonate, stopImpersonate,
  };
})(window);
