# Handoff: Прайс-лист React

## Overview
Односторінковий прайс-лист для компанії **React** (дистриб'ютор сонячних панелей, інверторів, акумуляторів, гібридних систем та комплектуючих для СЕС). Призначення — дати менеджерам з продажу та партнерам актуальний B2B-документ із цінами в USD, курсами валют, контактами відповідальних менеджерів і адресами складів. Оптимізовано під друк та мобільний перегляд.

## About the Design Files
Файли в цьому пакеті — **дизайн-референси у вигляді HTML-прототипу**. Це не production-код для прямого копіювання, а демонстрація цільового вигляду, поведінки та copy. Завдання — **відтворити дизайн у цільовій кодовій базі** (Next.js / React / Vue / будь-яка інша — обирайте за контекстом проєкту) із використанням її design system'у, компонентного підходу та стану. Якщо кодової бази ще немає — оберіть найдоречніший фреймворк під задачу (рекомендую **Next.js 14+ (App Router) + TypeScript + Tailwind** або CSS-modules).

Джерело прайсу (ціни, залишки, категорії) має бути винесене в окремий data-шар (JSON/CMS/БД) — у прототипі дані захардкожені для демонстрації.

## Fidelity
**High-fidelity (hifi).** Дизайн фінальний: кольори, шрифти, відступи, typographic scale, hover-стани, поведінка sticky-хедера таблиці, адаптив і print-стилі опрацьовані. Відтворюйте піксель-у-піксель, але використовуйте токени/компоненти з design system'у, якщо він у проєкті вже є.

---

## Структура сторінки

Сторінка складається з 4 основних блоків (зверху вниз):

1. **Topbar** — лого, контакти менеджерів (з аватарами + Telegram), курси валют, кнопка «Друк»
2. **Hero** — дата прайсу + 3 картки з адресами (офіс, склади)
3. **Таблиця цін** — категорії → товари → ціна без ПДВ / з ПДВ / наявність
4. **Footer** — копірайт, рекв'зити, дата оновлення

### Layout
- **Max-width контейнера:** `1240px`, центрований (`margin: 0 auto`)
- **Горизонтальні падінги контейнера:** `32px` на desktop, `16px` на mobile
- **Фон сторінки:** `--bg: #fafaf7` (теплий оф-вайт)
- **Картки/підняті поверхні:** `--bg-elev: #ffffff`

---

## Design Tokens

### Кольори
| Токен | Hex | Призначення |
|---|---|---|
| `--bg` | `#fafaf7` | Фон сторінки |
| `--bg-elev` | `#ffffff` | Картки, hover-стан топбар-контактів |
| `--ink` | `#141414` | Основний текст, заголовки, hover для вторинного |
| `--ink-2` | `#3d3d3d` | Вторинний текст |
| `--ink-3` | `#747474` | Метадані, label'и, плейсхолдери |
| `--ink-4` | `#b4b4b4` | Дуже тихий текст, іконки у неактивному стані |
| `--line` | `#e5e5e3` | Границі карток, роздільники рядків таблиці |
| `--line-2` | `#efefed` | Тонші роздільники |

**Stock statuses** (наявність):
- `in-stock`: `#2e7d32` (зелений)
- `low-stock`: `#b37400` (бурштиновий)
- `out-of-stock`: `#9a9a9a` (сірий)

### Typography
- **Sans:** `Inter`, fallback `system-ui, -apple-system, sans-serif`
  - Ваги що використовуються: `400, 500, 600, 700, 800`
- **Mono:** `JetBrains Mono`, fallback `ui-monospace, Menlo, monospace`
  - Ваги: `400, 500`
- **Base body:** `15px / 1.5`, `letter-spacing: -0.005em`
- **Font smoothing:** `-webkit-font-smoothing: antialiased`

Typographic scale (з прототипу):
- `h2` категорій: `22px / 700`, `letter-spacing: -0.02em`
- Назва товару: `15px / 500`
- Ціна: `15px / 500`, `font-variant-numeric: tabular-nums` ОБОВ'ЯЗКОВО
- Label'и (Офіс, Склад, Катерина, Олександра): Mono, `10px / 500`, `text-transform: uppercase`, `letter-spacing: 0.09em`, колір `--ink-3`
- Телефон в топбарі: `13px`, `font-variant-numeric: tabular-nums`
- Назва категорії в хедері таблиці: Mono, `11px / 500`, uppercase, `letter-spacing: 0.08em`

### Spacing
Базова сітка: **4px**. Часто вживані значення: `4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56px`.

### Border radius
- Картки: `12px`
- Кнопки / pill'и: `8–10px`
- Аватар: `50%` (круглий)
- Чіпи (stock badge): `6px`

### Shadows
Дизайн **плоский**, без тіней. Всі підняті поверхні відокремлюються через `1px solid var(--line)` і фон `--bg-elev`.

---

## Компоненти

### 1. Topbar

**Структура:**
```
[Logo] [spacer flex:1] [Contact: Катерина] [Contact: Олександра] [FX pill] [Друк button]
```

- Висота: авто (padding `18px 32px`)
- Фон: `var(--bg)` (зливається зі сторінкою, без власного border/shadow)
- `display: flex; align-items: center; gap: 20px`

**Topbar contact (кожен із двох):**
- Обгортка `.topbar-contact`: inline-flex, `gap: 8px`, `padding: 4px 6px 4px 4px`, `border-radius: 10px`
  - Hover: `background: var(--bg-elev)`
  - Transition: `background 0.15s`
- Усередині — `<a class="tc-call" href="tel:...">` з: аватаркою + ім'ям + телефоном
- Поряд — окремий `<a class="tg-icon" href="https://t.me/...">` з Telegram-іконкою (валідний HTML, не вкладений `<a>` в `<a>`)

**Аватар (sm):**
- `32×32px`, `border-radius: 50%`, `overflow: hidden`
- `<img>`: `object-fit: cover`, `width/height: 100%`

**Tc-body:**
- `display: flex; flex-direction: column; line-height: 1.15`
- `.tc-name`: Mono, `10px / 500`, uppercase, letter-spacing `0.09em`, колір `--ink-3`
- `.tc-phone`: `13px`, колір `--ink`, tabular-nums, `margin-top: 2px`

**Telegram-іконка (`.tg-icon`):**
- `20×20px` в топбарі (`18×18` в інших місцях)
- SVG `15×15px` (`18×18` в інших місцях)
- Колір: `--ink-4` (default), `--ink` (hover)
- Inline flex, центрований

**FX pill:**
- `display: inline-flex; gap: 18px; align-items: baseline`
- Mono, `11px / 500`, uppercase, `letter-spacing: 0.02em`, колір `--ink-3`
- `<b>` з курсами: колір `--ink`, `font-weight: 500`, tabular-nums, `margin-left: 6px`
- Приклад наповнення: `USD/UAH 41.20   EUR/USD 1.09`

**Кнопка «Друк»:**
- Border `1px solid var(--line)`, `border-radius: 8px`, `padding: 8–14px`
- Інкапсулює SVG-іконку принтера + текст «Друк»
- На mobile (`<860px`) текст ховається, залишається лише іконка (`.hide-sm { display: none }`)

**Копірайт-кнопка (`.copy-btn`) — використовується в адресах:**
- `22×22px`, `border-radius: 6px`, без рамки
- SVG: копія-іконка, `14×14px`, stroke `currentColor`, `stroke-width: 1.8`
- Колір: `--ink-4` → `--ink` на hover
- При кліку — копіює `data-copy` у clipboard, показує галочку на 1.2 сек

### 2. Hero

**Структура:**
```
Прайс · 24 квітня 2026            ← дата, Mono, 11px uppercase, --ink-3
┌──────────┬──────────┬──────────┐
│  Офіс    │ Склад·Київ│Склад·Одеса│   ← 3 картки адрес, grid(3, 1fr), gap 28px 40px
│ Адреса…  │  Адреса… │  Адреса…  │
└──────────┴──────────┴──────────┘
```

- Секція `.hero`: `padding: 48px 32px 56px`
- Дата (`.hero-date`): `margin-bottom: 32px`

**Info-card (адреса):**
- Без власного фону/рамки — просто текстовий блок у grid-колонці
- `.k` (label): Mono, `10px / 500`, uppercase, letter-spacing `0.09em`, колір `--ink-3`, `margin-bottom: 8px`
- `.v` (value): `15px`, колір `--ink`, `display: flex; align-items: flex-start; gap: 8px`
- `.v-text`: сам текст адреси
- `.copy-btn`: праворуч від тексту, показується завжди (не тільки на hover)

**Адреси що використовуються** (відображення = data-copy, 1:1):
- Офіс → `Одеса, вул. Велика Арнаутська, 15`
- Склад · Київ → `Вишневе, вул. Промислова, 10`
- Склад · Одеса → `Одеса, вул. Чигиринська, 21`

Важливо: місто вже закладене в `.k` (Склад · Київ / Склад · Одеса), в полі адреси дублювати не потрібно. Приставка «м.» не вживається ні у відображенні, ні в `data-copy` — адреса починається з назви міста без префікса.

### 3. Таблиця цін

**Структура:**
- Sticky хедер таблиці `.row-head` (sticky під топбаром)
- Повторювана секція `.category`:
  - `<h2>` з назвою категорії
  - N рядків товарів `.row`

**Колонки (desktop, grid-template-columns):**
```
1fr 140px 140px 120px
Назва товару | Ціна без ПДВ | Ціна з ПДВ | Наявність
```

**`.row-head`:**
- Sticky: `position: sticky; top: 0; z-index: 10`
- Padding: `14px 0`, border-bottom `1px solid var(--line)`
- Фон: `--bg` (непрозорий, щоб текст під ним не просвічувався)
- Текст: Mono, `11px / 500`, uppercase, letter-spacing `0.08em`, колір `--ink-3`
- `.num-col` (числові колонки): `text-align: right`
- `.head-stock`: `text-align: right`

**`.row`:**
- Grid з тими ж колонками, `padding: 14px 0`, `border-bottom: 1px solid var(--line-2)`
- Hover: `background: rgba(0,0,0,0.015)` (ледь помітне підсвічування)
- `.prod-name`: `15px / 500`, колір `--ink`
- `.prod-sub` (опис/варіант): `13px`, колір `--ink-3`, `margin-top: 2px`
- `.price`: `15px / 500`, tabular-nums, text-align right
  - Основна сума — `--ink`
  - Валюта (`$`) — окремий `<span>` з кольором `--ink-3`, `margin-left: 2px`
- `.stock` (чіп наявності):
  - Inline-flex, `gap: 6px`, `padding: 4px 8px`, `border-radius: 6px`
  - Mono, `11px / 500`, uppercase, letter-spacing `0.06em`
  - Крапка `6×6px`, `border-radius: 50%`, колір = стан
  - Класи: `.in-stock`, `.low-stock`, `.out-of-stock` (див. Stock statuses вище)

**Ціна:**
- Тільки `$` — **без `Вт`, без `грн`, без інших одиниць**
- Обидві колонки (без ПДВ / з ПДВ) показують USD
- ПДВ у другій колонці = ціна × 1.20 (розраховується в data-шарі, не в view)

### 4. Footer

- `padding: 40px 32px 48px`, `margin-top: 64px`
- Border-top `1px solid var(--line)`
- `.footer-inner`: flex, `justify-content: space-between`, `gap: 24px`
- Ліва частина: назва компанії, коротко про діяльність, юр. адреса/ЄДРПОУ (якщо потрібні)
- Права: дата останнього оновлення, © React

На mobile — колонка (`flex-direction: column`).

---

## Interactions & Behavior

### Кнопка «Друк»
- `onclick="window.print()"` — викликає нативний діалог друку

### Print-стилі (`@media print`)
- Ховає: `.topbar, footer, .btn, .fx-pill, .topbar-contacts`
- `.row-head { position: static }` — не sticky при друку
- Фон: `#fff`
- Категорії: `break-inside: avoid; margin-top: 24px`
- Рядки: `page-break-inside: avoid`

### Копіювання адрес
- Клік по `.copy-btn` → `navigator.clipboard.writeText(btn.dataset.copy)` → іконка міняється на галочку на 1200мс → повертається

### Курси валют
- При завантаженні — JS-запит до публічного API курсів (наприклад `https://api.monobank.ua/bank/currency`) із fallback на захардкожені значення
- Оновлює `#fxUsd` і `#fxEur` з таббулярними числами, 2 знаки після коми
- У проді — краще кешувати на 15–60 хв

### Telegram-лінки
- Відкриваються в новій вкладці (`target="_blank"`), `rel="noopener noreferrer"` треба додати для безпеки

### Дата прайсу
- `#priceDate`: виводиться локалізована дата («24 квітня 2026») через `Intl.DateTimeFormat('uk-UA', ...)`

---

## State Management

Мінімальний стан (якщо SSR-сторінка — все можна рендерити на сервері):

| Змінна | Тип | Джерело |
|---|---|---|
| `priceDate` | Date | Поточна дата або дата останнього оновлення прайсу з БД |
| `fxRates` | `{ usdUah: number, eurUsd: number }` | API курсів (клієнт або server action) |
| `categories` | `Category[]` | CMS / JSON / БД |
| `copyState` | `Record<id, 'idle' \| 'copied'>` | Локальний UI-стан (клієнт) |

**Типи даних (TypeScript):**
```ts
type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';

interface Product {
  id: string;
  name: string;
  sub?: string;           // опис/варіант, наприклад потужність
  priceUsd: number;       // ціна без ПДВ в USD
  stock: StockStatus;
  stockLabel?: string;    // опційно — текст замість стандартного
}

interface Category {
  id: string;
  title: string;          // напр. «Сонячні панелі»
  products: Product[];
}

interface FxRates {
  usdUah: number;         // 41.20
  eurUsd: number;         // 1.09
  updatedAt: string;      // ISO
}
```

Ціна з ПДВ розраховується на льоту: `priceUsd * 1.20`.

---

## Адаптив

### Breakpoint: `860px`

**Topbar на mobile:**
- `flex-wrap: wrap`, `padding: 14px 16px`, `gap: 12px`
- Лого зменшується: `height: 38px` (з `48px`)
- Контакти переносяться на **окремий рядок** (order: 10, width: 100%), розділені border-top
- `.topbar-contacts`: `justify-content: space-between`, `padding-top: 12px`
- Кожен `.topbar-contact`: `flex: 1`, `gap: 8px`, `padding: 4px 6px`
- Аватар: `28×28px` (з `32×32`)
- Телефон: `12px`
- FX pill: `font-size: 10px; gap: 12px`
- «Друк»: текст ховається, іконка залишається

**Hero на mobile:**
- `.info-grid`: `grid-template-columns: 1fr 1fr` (2 колонки замість 3), `gap: 22px 18px`
- Padding секції: `26px 16px 22px`

**Таблиця на mobile:**
- Grid колапсується в 2 області:
  ```
  "name  stock"
  "meta  meta"
  ```
- Ціни переходять у meta-рядок із label'ами (Mono 10px uppercase): «БЕЗ ПДВ $X  ·  З ПДВ $Y»
- Stock-чіп праворуч угорі
- `.row { padding: 14px 0 }`

### Приклад breakpoint на Tailwind
```
md: 768px (або кастом 860px через theme.extend.screens)
```

---

## Assets

Всі в папці `assets/`:
- `kateryna.jpg` — аватар менеджерки Катерини (квадратний, для круглого crop)
- `oleksandra.jpg` — аватар менеджерки Олександри
- `logo.png` — лого React (повне)
- `logo-transparent.png` — лого з прозорим фоном (використовується в топбарі)

Всі зображення — PNG. Для production рекомендую:
- Конвертувати аватари у WebP/AVIF
- Розміри: `64×64` і `128×128` для retina (зараз рендериться `32×32`)
- Логотип — SVG якщо є векторне джерело

**Іконки** в прототипі — inline SVG:
- Принтер (в кнопці «Друк»)
- Copy (в `.copy-btn`)
- Check (стан «скопійовано»)
- Telegram (paper plane)

Для production рекомендую винести в компонент `<Icon name="..." />` або використати `lucide-react` / `heroicons`.

---

## Contact data (hardcoded у прототипі)

| Ім'я | Телефон | Telegram |
|---|---|---|
| Катерина | `+380 67 577 73 40` | `https://t.me/kateryna_react` |
| Олександра | `+380 63 325 61 10` | `https://t.me/oleksandra_react` |

**⚠️ У проді** ці дані мають жити в CMS / env / БД, не в JSX. Також перевірте правильність Telegram-хендлів — у прототипі вказано плейсхолдери.

---

## Checklist імплементації

- [ ] Налаштувати шрифти (Inter + JetBrains Mono, ваги 400/500/600/700/800 для Inter, 400/500 для Mono)
- [ ] Винести design tokens у Tailwind config / CSS-variables / styled-system
- [ ] Компонент `<Topbar>` з контактами, FX-pill і кнопкою друку
- [ ] Компонент `<ContactCard>` (аватар + ім'я + телефон + Telegram)
- [ ] Компонент `<AddressCard>` з copy-to-clipboard
- [ ] Компонент `<PriceTable>` зі sticky хедером
- [ ] Компонент `<PriceRow>` з варіантом для mobile (grid-template-areas)
- [ ] Компонент `<StockBadge>` з трьома станами
- [ ] Data-шар: типізація, loader (server action / API route) для категорій і курсів
- [ ] Fallback-значення курсів на випадок відмови API
- [ ] Print-стилі (media query)
- [ ] Адаптив 860px breakpoint
- [ ] Локалізація (uk-UA) для дати
- [ ] `rel="noopener noreferrer"` на всіх `target="_blank"` лінках
- [ ] Перевірка контрасту AA (`--ink-3` на `--bg` ≈ достатній для non-body тексту)

---

## Files у цьому пакеті

- `Прайс-лист.html` — головний HTML-прототип (повний, самодостатній)
- `assets/` — зображення (аватари, лого)
- `README.md` — цей документ
