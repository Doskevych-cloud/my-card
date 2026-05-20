/* date-range.js — single-calendar date range picker (Flatpickr wrapper) */
(function () {
  var s = document.createElement('style');
  s.textContent = [
    '.flatpickr-calendar{background:var(--surface2)!important;border:1px solid var(--border)!important;border-radius:10px!important;box-shadow:0 8px 24px rgba(0,0,0,.4)!important;font-family:inherit!important;overflow:hidden}',
    '.flatpickr-months{background:var(--surface2)!important;border-radius:10px 10px 0 0}',
    '.flatpickr-months .flatpickr-month{background:var(--surface2)!important;color:var(--text)!important;height:36px!important}',
    '.flatpickr-current-month{color:var(--text)!important;font-weight:600!important;font-size:13px!important}',
    '.flatpickr-current-month .cur-month{color:var(--text)!important}',
    '.flatpickr-current-month input.cur-year{color:var(--text)!important;background:transparent!important}',
    '.flatpickr-months .flatpickr-prev-month,.flatpickr-months .flatpickr-next-month{fill:var(--text2)!important;color:var(--text2)!important;padding:6px 10px!important}',
    '.flatpickr-months .flatpickr-prev-month:hover,.flatpickr-months .flatpickr-next-month:hover{fill:var(--accent)!important;color:var(--accent)!important}',
    '.flatpickr-months .flatpickr-prev-month svg,.flatpickr-months .flatpickr-next-month svg{fill:inherit!important}',
    '.flatpickr-weekdays{background:var(--surface2)!important}',
    'span.flatpickr-weekday{color:var(--text3)!important;font-size:11px!important;font-weight:600!important}',
    '.flatpickr-days{border:none!important}',
    '.dayContainer{min-width:280px;max-width:280px}',
    '.flatpickr-day{color:var(--text)!important;border:none!important;border-radius:6px!important;font-size:12px!important;max-width:36px!important;height:34px!important;line-height:34px!important}',
    '.flatpickr-day:hover{background:var(--bg3)!important}',
    '.flatpickr-day.today{border:1px solid var(--text3)!important}',
    '.flatpickr-day.today:hover{background:var(--bg3)!important}',
    '.flatpickr-day.selected,.flatpickr-day.startRange,.flatpickr-day.endRange{background:var(--accent)!important;color:#fff!important;border:none!important}',
    '.flatpickr-day.startRange{border-radius:6px 0 0 6px!important}',
    '.flatpickr-day.endRange{border-radius:0 6px 6px 0!important}',
    '.flatpickr-day.startRange.endRange{border-radius:6px!important}',
    '.flatpickr-day.inRange{background:var(--accent-bg)!important;box-shadow:none!important;border-radius:0!important}',
    '.flatpickr-day.prevMonthDay,.flatpickr-day.nextMonthDay{color:var(--text3)!important}',
    '.flatpickr-day.flatpickr-disabled{color:var(--text3)!important;opacity:.3}',
    '.date-range-input{padding:7px 10px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px;outline:none;font-family:inherit;cursor:pointer;min-width:190px;text-align:center}',
    '.date-range-input:focus{border-color:var(--accent)}',
    ':root[data-theme="light"] .flatpickr-calendar{box-shadow:0 4px 16px rgba(0,0,0,.12)!important}',
  ].join('\n');
  document.head.appendChild(s);

  function _iso(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function _parse(s) {
    var p = s.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  window.initDateRange = function (opts) {
    var el = document.getElementById(opts.inputId);
    if (!el) return null;
    var uk = (typeof flatpickr !== 'undefined' && flatpickr.l10ns && flatpickr.l10ns.uk) || {};
    var locale = Object.assign({}, uk, { rangeSeparator: ' — ' });
    var fp = flatpickr(el, {
      mode: 'range',
      dateFormat: 'd.m.Y',
      locale: locale,
      defaultDate: [_parse(opts.from), _parse(opts.to)],
      allowInput: false,
      clickOpens: true,
      disableMobile: true,
      onChange: function (dates) {
        if (dates.length === 2 && opts.onChange) {
          opts.onChange(_iso(dates[0]), _iso(dates[1]));
        }
      },
    });
    return {
      setDates: function (from, to) { fp.setDate([_parse(from), _parse(to)], false); },
      instance: fp,
    };
  };
})();
