# Night Log — почато 2026-04-14 вечір (робота через 2026-04-15)

## Задачі
- [ ] 1. Аудит коду
- [x] 2. Фікс WMA (занижений) ✅

### Задача 2 — WMA фікс
- **Баг #1 виправлено**: shipments query тепер фільтрує по `Организация_Key = REACT`
- **Вікно розширено**: 30 → 60 днів
- **Формула перероблена**:
  - Базові ваги: 14д=60%, 30д=30%, 60д=10%
  - Якщо у вікні < 3 валідних днів (MIN_KEPT_FOR_VALID) → вага = 0
  - Ваги перерозподіляються (renormalized) після колапсу
- **Результат**: WMA чорний 710 → **2187 м/д** (×3), червоний 305 → **1194 м/д** (×4)
- Endpoint: `avgBreakdown.{avg60, kept60, usedWeights, collapsed, lookbackDays, baseWeights}`
- Forecast.html: модалка WMA оновлена (4 рядки періодів, колонки «База/Фактична вага», collapsed badge)
- Worker deployed: `9a92a711`
- Commit: WMA rework
- [x] 3. Нижній блок — тільки кабель ✅

### Задача 4 — Cable-only warehouse block
- Замінено `loadWarehouses` + `renderWhTable` на `renderCableWh`
- Тепер дві секції: «🏢 На складі» (CABLE_WHS з free/reserve split) та «🚛 В дорозі» (всі in-transit склади з cable movements)
- Дані беруться з уже завантаженого `forecastData` (`stockByWh` + `inTransit.byWh`) — економія одного HTTP запиту
- Окремий CSS: `.wh-cable-card`, `.wh-cable-grid`, `.wh-dot` для чорних/червоних точок-маркерів
- Покази: загальна сума м на картці, розбивка по 2 кольорах
- Ендпоінт `warehouses_stock` лишився — потрібен для майбутньої окремої сторінки «Склад»
- [x] 4. Клікабельні графіки ✅

### Задача 3 — Clickable charts
- **Мідь** (copper sparkline): клік на точку/крапку → модалка з історією 30 днів (дата, ціна, зміна, %), фокусований рядок підсвічений
- **EUR/USD** (sparkline): аналогічно — таблиця історії з `change`/`%`
- **Відвантаження** (bar chart): клік на стовпець → деталі дня (обсяг чорного/червоного, стокчорного/червоного на початок дня, список документів з клієнтами)
- **Архів 60 днів**: кнопка «60 днів →» біля статистик → відкриває повну історію з клікабельними рядками
- **Chart crop**: графік показує останні 30 (зручно), модалка має всі 60 для drill-down
- Focused row підсвічується та scrollIntoView
- Excluded days з WMA мають ⚠️ маркер в модалці
- XSS захист через `escapeHtml` для імен клієнтів
- [x] 5. Сторінка «Склад» + drill-down ✅

### Задача 5 — Warehouses page
**Worker side:**
- `fetchAllWarehousesStock` переписано: тепер повертає `{ summary, warehouses: [{ id, name, org, items, reservesByItem }] }`
- `reservesByItem[itemName]` = масив замовлень: `{ orderKey, orderNumber, orderDate, client, qty }`
- Order info збагачується через `Document_ЗаказПокупателя` (batch по 40 keys)
- Cache key змінено на `cache_all_wh_v2` (старий `cache_all_wh` залишено — безпечна міграція)

**Frontend side:**
- Новий файл `warehouses.html`:
  - Password gate (той самий localStorage key `forecastAuth`, 12h сесія)
  - Topbar з ← Головна + лічильник
  - Strip статистики: складів / на складі / в дорозі / позицій / разом / резерв / вільно
  - Фільтри: пошук (назва товару/складу) + chip-и організація (REACT/TRUF) + тип (на складі / в дорозі)
  - Картки складів: `on-hand` (помаранчевий border) або `in-transit` (фіолетовий)
  - Клік по головці → розкривається таблиця товарів
  - Клік по рядку товару з резервом → модалка з розбивкою по замовленнях (клієнт, №документа, дата, к-ть)
- `index.html`: додана кнопка «📦 Склад» + `openWarehouses()` з password gate

**Endpoint test:**
- 4 склади (REACT), 40 унікальних позицій, 60 total reservation entries
- Response time: 100ms (cached) / ~2-4s (cold)

### Фінальний статус

| Крок | Статус |
|------|--------|
| Worker deploy | ✅ `6ade8f28` live |
| Worker tests | ✅ всі 4 ендпоінти OK |
| HTML syntax check | ✅ всі script блоки парсяться |
| Гілка запушена | ✅ `night-2026-04-14` на origin |
| Merge в main | ⏳ чекає ранкового ревʼю |

### Комміти на гілці
```
e2a... Add warehouses.html with reservation drill-down + 'Склад' button in index
...   Make copper/EUR-USD/shipments charts clickable with drill-down modals
...   Replace full warehouse block with cable-only (on-hand + in-transit)
...   Rework WMA: 60d lookback, dynamic weights, window collapse fallback
...   Add night work brief and log
```

### Пам'ятка для ранку
1. Переглянути PR: https://github.com/Doskevych-cloud/my-card/pull/new/night-2026-04-14
2. Якщо все окей — `git checkout main && git merge night-2026-04-14 && git push`
3. GitHub Pages сам задеплоїть після merge
4. WMA тепер 3382 м/д (було 1015) — перевірити що логічно
5. Worker вже задеплоєний — не потребує додаткової дії
6. Залишки на ревʼю в майбутньому:
   - БАГ #2: `fetchSV` не ловить помилки
   - БАГ #3: `warehouses_stock` жирний — можна оптимізувати фільтром по `КоличествоBalance gt 0`

### Не зроблено (свідомо)
- БАГ #2, #3 з аудиту — не критичні, не в задачах
- Візуальна індикація excluded days на самому shipments chart (тільки в модалці) — можна на майбутнє

---
**Час роботи:** ~2 години (задачі + аудит + документація)
**Коммітів:** 6 на гілці `night-2026-04-14`
**Зламаного:** нічого :)

---

## Лог подій

### Setup
- Створено гілку `night-2026-04-14` в my-card
- Бекап worker.js → `worker.js.bak-night-20260414`
- Поточний стан main: `f62f785` (low-stock filter для WMA)
- Endpoint перевірено: повертає avgBreakdown з threshold=10000, kept14 дуже мало

### Задача 1 — Аудит (результати)

**🐛 БАГИ знайдені:**

1. **[HIGH] Shipments query без фільтру по організації** (worker.js:527-528)
   `fetchCableForecast` пулить ВСІ `Document_РасходнаяНакладная` за місяць, не фільтруючи по `Организация_Key`. Якщо кабель ITEM_BLACK/RED продається також через TRUF — WMA рахується по обох організаціях, але stock/inTransit — тільки по REACT. Невідповідність даних.
   → ФІКС: додати `Организация_Key eq guid'${ORG_REACT_F}'` в dateFilter

2. **[MED] fetchSV не обробляє помилку** (worker.js:270-276)
   Якщо GAS відпаде, помилка проковтується → cache зберігає невалідний стан на годину.
   → ФІКС: try/catch + повернути {error}

3. **[MED] fetchAllWarehousesStock — жирний запит** (worker.js:691-717)
   Пулить ВСІ товари обох організацій без фільтрів. Повільно.
   → Оптимізація на потім.

4. **[LOW] fetchOdataStock захардкожений** (worker.js:280-312)
   Дублює константи з forecast (`ODATA_URL`, `ORG_*`). Не баг, але технічний борг.

**✅ Перевірено — ОК:**
- CORS headers ok
- XLSX parsing обгорнуто в cache з TTL 1h
- KV `cachedFetch` коректно handle-ить cache miss
- Password gate в forecast.html + index.html
- Escape listener на modal

**⚠️ Знайдено в forecast.html:**
- `loadForecast` не перехоплює edge case коли `f.stock === undefined`
- `KPI_META.must` використовує `LT_TOTAL` який визначається в іншому місці — треба перевірити що глобально доступний
- `renderShipments` avg7/avg30 не відфільтровані по low-stock (це окрема raw метрика — окей)

**Рішення:** правлю БАГ #1 при задачі 2 (WMA fix), бо вони пов'язані. БАГ #2 і #3 — лишаю на ранок.


