/**
 * Reusable monthly bar/line chart for report pages.
 *
 * Usage:
 *   <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
 *   <script src="monthly-chart.js"></script>
 *
 *   // у HTML, одразу після toolbar:
 *   <div class="mc-block">
 *     <div class="mc-head"><span class="mc-title">Виторг по місяцях</span>
 *       <span class="mc-sub" id="mcSub"></span></div>
 *     <canvas id="mcCanvas" height="120"></canvas>
 *   </div>
 *
 *   const mc = MonthlyChart.mount('mcCanvas', {
 *     label: 'Виторг (опл.)',
 *     unit: '$',                    // '$' | '%' | ''
 *     color: 'var(--green)',        // primary line/bar color
 *     type: 'bar',                  // 'bar' | 'line'
 *     fetchValue: async (from, to) => { ... return number },
 *     n: 12,                        // months
 *   });
 *   mc.reload({ org: 'Реакт' });    // re-fetches all months
 */
(function (g) {
  'use strict';

  const MONTHS_UK = ['Січ','Лют','Бер','Кві','Тра','Чер','Лип','Сер','Вер','Жов','Лис','Гру'];

  function _iso(d) { return d.toISOString().slice(0, 10); }
  function _monthLabel(d) {
    const yy = String(d.getFullYear()).slice(2);
    return `${MONTHS_UK[d.getMonth()]} '${yy}`;
  }
  function buildMonthBuckets(n) {
    const out = [];
    const today = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      out.push({ from: _iso(d), to: _iso(last), label: _monthLabel(d) });
    }
    return out;
  }

  function fmtMoney(v, unit) {
    if (v == null || !isFinite(v)) return '—';
    const abs = Math.abs(v);
    let s;
    if (abs >= 1_000_000) s = (v / 1_000_000).toFixed(1).replace('.', ',') + ' M';
    else if (abs >= 1_000) s = (v / 1_000).toFixed(1).replace('.', ',') + ' k';
    else s = Math.round(v).toString();
    return unit === '$' ? s + ' $' : (unit === '%' ? v.toFixed(1) + '%' : s);
  }

  // Read CSS var → real color (Chart.js doesn't accept var(...) in canvas)
  function _resolveColor(c) {
    if (!c || typeof c !== 'string') return '#22c55e';
    if (c.startsWith('var(')) {
      const name = c.slice(4, -1).trim();
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || '#22c55e';
    }
    return c;
  }

  function ensureStyles() {
    if (document.getElementById('mcStyles')) return;
    const css = `
      .mc-block{padding:14px 16px;background:var(--surface2,#1c1c1c);border:1px solid var(--border,#262626);border-radius:12px;margin-bottom:12px}
      .mc-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:10px}
      .mc-title{font-size:11px;color:var(--text3,#737373);text-transform:uppercase;letter-spacing:.5px;font-weight:700}
      .mc-sub{font-size:11px;color:var(--text3,#737373);font-variant-numeric:tabular-nums}
      .mc-canvas-wrap{position:relative;height:140px}
      @media(max-width:640px){.mc-canvas-wrap{height:120px}}
    `;
    const s = document.createElement('style');
    s.id = 'mcStyles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function mount(canvasId, opts) {
    if (typeof Chart === 'undefined') {
      console.warn('MonthlyChart: Chart.js не завантажено');
      return { reload: () => {}, destroy: () => {} };
    }
    ensureStyles();
    const canvas = document.getElementById(canvasId);
    if (!canvas) { console.warn('MonthlyChart: canvas not found:', canvasId); return { reload: () => {}, destroy: () => {} }; }
    const subEl = opts.subId ? document.getElementById(opts.subId) : null;

    const unit = opts.unit || '';
    const color = _resolveColor(opts.color || 'var(--green)');
    const type = opts.type === 'line' ? 'line' : 'bar';
    const n = opts.n || 12;

    const ctx = canvas.getContext('2d');
    const isBar = type === 'bar';
    const cfg = {
      type,
      data: { labels: [], datasets: [{
        label: opts.label || '',
        data: [],
        backgroundColor: isBar ? color : 'transparent',
        borderColor: color,
        borderWidth: isBar ? 0 : 2,
        borderRadius: isBar ? 4 : 0,
        tension: 0.25,
        pointRadius: isBar ? 0 : 2,
        pointHoverRadius: 4,
        fill: false,
      }]},
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 220 },
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            backgroundColor: 'rgba(0,0,0,.85)',
            titleColor: '#fff',
            bodyColor: '#fff',
            padding: 8,
            callbacks: {
              label: c => fmtMoney(c.parsed.y, unit),
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: 'rgba(128,128,128,.7)', font: { size: 10 } },
          },
          y: {
            grid: { color: 'rgba(128,128,128,.12)', drawBorder: false },
            ticks: {
              color: 'rgba(128,128,128,.7)',
              font: { size: 10 },
              callback: v => unit === '$' ? fmtMoney(v, '$') : (unit === '%' ? v.toFixed(0) + '%' : v),
            },
          },
        },
      },
    };
    const chart = new Chart(ctx, cfg);

    let lastFilters = {};
    async function reload(filters) {
      lastFilters = Object.assign({}, lastFilters, filters || {});
      const buckets = buildMonthBuckets(n);
      if (subEl) subEl.textContent = 'завантаження…';
      const values = await Promise.all(buckets.map(b => {
        try { return Promise.resolve(opts.fetchValue(b.from, b.to, lastFilters)).catch(() => null); }
        catch (e) { return Promise.resolve(null); }
      }));
      const cleaned = values.map(v => (v == null || !isFinite(v)) ? 0 : Number(v));
      chart.data.labels = buckets.map(b => b.label);
      chart.data.datasets[0].data = cleaned;
      chart.update();
      if (subEl) {
        const sum = cleaned.reduce((s, x) => s + x, 0);
        const avg = sum / cleaned.length;
        if (unit === '%') subEl.textContent = `сер. ${avg.toFixed(1)}%`;
        else if (unit === '$') subEl.textContent = `сер./міс ${fmtMoney(avg, '$')}`;
        else subEl.textContent = `сер./міс ${fmtMoney(avg, '')}`;
      }
    }

    return {
      reload,
      destroy: () => chart.destroy(),
      _chart: chart,
    };
  }

  g.MonthlyChart = { mount, buildMonthBuckets, fmtMoney };
})(window);
