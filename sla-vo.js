/* sla-vo.js — обчислення «Час відповіді» (ВО) менеджера у РОБОЧИХ хвилинах.
 *
 * Реалізує алгоритм таймера зі скріна (KPI «Середній час відповіді»).
 * Чисті функції, без залежностей. Працює і в браузері (window.SlaVO),
 * і в Node (module.exports) — щоб ту саму логіку юзав і звіт, і тести.
 *
 * Ядро: сценарії 1–7 згортаються в одну формулу —
 *   ВО = сума робочих хвилин (09:00–18:00, Пн–Пт, без свят)
 *        між request_at і response_at.
 * Час поза робочим вікном (до 09:00, після 18:00, ніч, вихідні, свята)
 * просто не додається. Це автоматично дає:
 *   • старт о 09:00, якщо клієнт написав до початку дня (сц. 2)
 *   • перенос на наступний робочий день (сц. 3, 4, 5)
 *   • нічну паузу — підсумовуються лише робочі хвилини (сц. 6)
 *   • кеп о 18:00: відповідь о 18:01 на питання о 17:45 = 15 хв (сц. 7)
 *
 * Сценарії 8–12 (чи створювати/закривати подію взагалі) — це рівень даних
 * (бот react-bot), а не обчислення ВО. Див. SLA_VO_ALGORITHM.md.
 */
(function (root) {
  'use strict';

  // Дефолтний конфіг. Свята — Kyiv-local дати 'YYYY-MM-DD'.
  // Перелік держсвят України 2026; відкоригуй під реальні робочі дні компанії.
  var DEFAULT_CONFIG = {
    tz: 'Europe/Kyiv',
    workStartMin: 9 * 60,   // 09:00
    workEndMin: 18 * 60,    // 18:00
    workDays: [1, 2, 3, 4, 5], // Пн..Пт (0 = Нд, 6 = Сб)
    holidays: [
      '2026-01-01', // Новий рік
      '2026-03-08', // Міжнародний жіночий день
      '2026-04-12', // Великдень
      '2026-05-01', // День праці
      '2026-05-31', // Трійця
      '2026-06-28', // День Конституції
      '2026-08-24', // День Незалежності
      '2026-10-01', // День захисників і захисниць
      '2026-12-25'  // Різдво
    ]
  };

  // Розклад Kyiv-local компонент інстанта (UTC Date) у потрібному tz.
  function localParts(date, tz) {
    var fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      weekday: 'short', hour12: false
    });
    var o = {};
    fmt.formatToParts(date).forEach(function (p) { o[p.type] = p.value; });
    // en-CA hour може віддати '24' опівночі — нормалізуємо
    if (o.hour === '24') o.hour = '00';
    return o;
  }

  var WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  // Локальний wall-clock (рік/міс/день + год/хв у tz) → UTC-мілісекунди.
  // Стандартний трюк з обчисленням offset на потрібну дату (DST-safe для 09/18:00).
  function wallToUTC(y, m, d, hh, mm, tz) {
    var guess = Date.UTC(y, m - 1, d, hh, mm, 0);
    var p = localParts(new Date(guess), tz);
    var asLocal = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    var offset = asLocal - guess; // на скільки локальний час попереду UTC
    return guess - offset;
  }

  function dateKey(p) { return p.year + '-' + p.month + '-' + p.day; }

  // ── Головна: робочі хвилини між двома інстантами ──────────────────
  // requestAt / responseAt: Date | ISO-рядок | мс. Повертає число хвилин (2 знаки).
  function businessMinutes(requestAt, responseAt, config) {
    var cfg = Object.assign({}, DEFAULT_CONFIG, config || {});
    var holidays = new Set(cfg.holidays || []);
    var reqMs = toMs(requestAt);
    var resMs = toMs(responseAt);
    if (resMs == null || reqMs == null || resMs <= reqMs) return 0;

    var workDays = new Set(cfg.workDays);
    var total = 0; // мс

    // Ітеруємо локальні дати від дня запиту до дня відповіді (включно).
    // Курсор — UTC-полудень, щоб крок +24h не "перестрибнув" день через DST.
    var startKey = dateKey(localParts(new Date(reqMs), cfg.tz));
    var endKey = dateKey(localParts(new Date(resMs), cfg.tz));
    var cursor = new Date(reqMs);
    // Вирівнюємо курсор на полудень локального дня запиту
    var sp = localParts(cursor, cfg.tz);
    var cur = new Date(wallToUTC(+sp.year, +sp.month, +sp.day, 12, 0, cfg.tz));

    for (var guard = 0; guard < 400; guard++) {
      var p = localParts(cur, cfg.tz);
      var key = dateKey(p);
      if (key > endKey) break;

      var dow = WD[p.weekday];
      if (key >= startKey && workDays.has(dow) && !holidays.has(key)) {
        var open = wallToUTC(+p.year, +p.month, +p.day,
          Math.floor(cfg.workStartMin / 60), cfg.workStartMin % 60, cfg.tz);
        var close = wallToUTC(+p.year, +p.month, +p.day,
          Math.floor(cfg.workEndMin / 60), cfg.workEndMin % 60, cfg.tz);
        var s = Math.max(open, reqMs);
        var e = Math.min(close, resMs);
        if (e > s) total += (e - s);
      }
      // наступний день: +24h від полудня (DST зсуне на ±1h, але полудень лишиться в тому ж дні)
      cur = new Date(cur.getTime() + 24 * 3600 * 1000);
    }
    return Math.round((total / 60000) * 100) / 100;
  }

  function toMs(v) {
    if (v == null) return null;
    if (typeof v === 'number') return v;
    if (v instanceof Date) return v.getTime();
    var t = Date.parse(v);
    return isNaN(t) ? null : t;
  }

  // Чи був запит у робочий час (для діагностики / сценарій 1 vs 2/3/4/5)
  function isWithinWorkWindow(at, config) {
    var cfg = Object.assign({}, DEFAULT_CONFIG, config || {});
    var holidays = new Set(cfg.holidays || []);
    var ms = toMs(at);
    var p = localParts(new Date(ms), cfg.tz);
    var key = dateKey(p);
    var dow = WD[p.weekday];
    if (!new Set(cfg.workDays).has(dow) || holidays.has(key)) return false;
    var minOfDay = (+p.hour) * 60 + (+p.minute);
    return minOfDay >= cfg.workStartMin && minOfDay < cfg.workEndMin;
  }

  // ── ВО всього звіту: wall-clock → робочі хвилини, мінус паузи й дні відсутності ──
  // Одна реалізація для сторінки SLA (sla.html) і денного зведення бота
  // (react-bot/src/sla-vo.js — копія цього файла, action _admin_sla_digest), щоб цифри
  // в ERP і в щоденному звіті Степана не розходились.
  // report — відповідь sla_report: { managers: [{ counterparties: [{ events }] }], pauses, absences }.
  // Паузи (кнопка в DM зі Степаном) і дні відсутності («SLA вимкнено на день») — того, ХТО ВІДПОВІВ:
  //  • запит у день відсутності → замір не рахується (ev.absent), як виключений;
  //  • робочі хвилини пауз і днів відсутності всередині заміру у ВО не йдуть
  //    (перетини злито — без подвійного віднімання).
  // День відсутності = доба UTC [00:00, 24:00): вміщує все робоче вікно київської доби
  // (07–16 / 06–15 UTC) і нічого з сусідніх.
  // Мутує report: ev.reaction_min = ВО, ev.wall_min (значення з бекенду), ev.pause_min, ev.absent,
  // ev.absent_days; середні й кількості — без виключених (КВП) і замірів у день відсутності.
  function applyVO(report, config) {
    var cfg = Object.assign({}, DEFAULT_CONFIG, config || {});
    var pauses = (report.pauses || []).map(function (p) {
      return { tg: p.tg, a: Date.parse(p.from), b: Date.parse(p.to) };
    });
    var absent = (report.absences || []).map(function (x) {
      var a = Date.parse(x.day + 'T00:00:00Z');
      return { tg: x.tg, day: x.day, a: a, b: a + 864e5 };
    });
    var absKey = new Set(absent.map(function (x) { return x.tg + '|' + x.day; }));
    var totalSum = 0, totalCnt = 0;
    (report.managers || []).forEach(function (mgr) {
      var mSum = 0, mCnt = 0;
      (mgr.counterparties || []).forEach(function (cp) {
        var cpSum = 0, cpCnt = 0;
        (cp.events || []).forEach(function (ev) {
          if (ev.wall_min == null) ev.wall_min = ev.reaction_min; // значення з бекенду — для довідки
          var reqMs = Date.parse(ev.request_at), resMs = Date.parse(ev.response_at);
          var iv = [], pz = 0;
          pauses.forEach(function (p) {
            if (p.tg !== ev.mgr_tg) return;
            var a = Math.max(reqMs, p.a), b = Math.min(resMs, p.b);
            if (b > a) { pz += businessMinutes(a, b, cfg); iv.push([a, b]); }
          });
          ev.absent = absKey.has(ev.mgr_tg + '|' + dateKey(localParts(new Date(reqMs), cfg.tz)));
          ev.absent_days = [];
          absent.forEach(function (x) {
            if (x.tg !== ev.mgr_tg) return;
            var a = Math.max(reqMs, x.a), b = Math.min(resMs, x.b);
            if (b > a && businessMinutes(a, b, cfg) > 0) { iv.push([a, b]); ev.absent_days.push(x.day); }
          });
          iv.sort(function (u, v) { return u[0] - v[0]; });
          var sub = 0, cur = null;
          iv.forEach(function (r) {
            if (cur && r[0] <= cur[1]) cur[1] = Math.max(cur[1], r[1]);
            else { if (cur) sub += businessMinutes(cur[0], cur[1], cfg); cur = [r[0], r[1]]; }
          });
          if (cur) sub += businessMinutes(cur[0], cur[1], cfg);
          ev.pause_min = Math.round(pz * 100) / 100;
          ev.reaction_min = Math.max(0, Math.round((businessMinutes(ev.request_at, ev.response_at, cfg) - sub) * 100) / 100);
          if (!ev.excluded && !ev.absent) { cpSum += ev.reaction_min; cpCnt++; } // виключені (КВП) і дні відсутності не рахуємо
        });
        cp.avg_min = cpCnt ? Math.round((cpSum / cpCnt) * 100) / 100 : null;
        cp.count = cpCnt;
        mSum += cpSum; mCnt += cpCnt;
      });
      mgr.avg_min = mCnt ? Math.round((mSum / mCnt) * 100) / 100 : null;
      mgr.count = mCnt;
      totalSum += mSum; totalCnt += mCnt;
    });
    report.overall_avg_min = totalCnt ? Math.round((totalSum / totalCnt) * 100) / 100 : 0;
    report.total_events = totalCnt;
    return report;
  }

  var api = {
    DEFAULT_CONFIG: DEFAULT_CONFIG,
    businessMinutes: businessMinutes, // ← ВО (сценарії 1–7)
    applyVO: applyVO,                 // ← ВО всього звіту з паузами й днями відсутності
    isWithinWorkWindow: isWithinWorkWindow,
    _localParts: localParts,
    _wallToUTC: wallToUTC
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SlaVO = api;
})(typeof window !== 'undefined' ? window : globalThis);
