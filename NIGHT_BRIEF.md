# Night Brief — 2026-04-14

## Контекст
- Пароль прогнозу/складу: `063744`
- Гілка роботи: `night-2026-04-14` (НЕ merge в main)
- Бекап worker.js: `src/worker.js.bak-night-20260414`
- 1С OData credentials: в `wrangler.toml` (НЕ чіпати)

## Плановано зробити
1. Аудит коду (worker.js + forecast.html + index.html)
2. Фікс WMA (fallback + 60d lookback + dynamic weight)
3. Нижній блок на forecast.html — тільки кабель (чорний + червоний)
4. Клікабельні графіки (відвантаження, мідь, EUR/USD)
5. Нова сторінка `warehouses.html` + кнопка в index + drill-down до замовлень

## Правила
- Commit по кожній задачі окремо
- Worker deploy + KV cache clear після кожного значимого edit
- Тести через curl, результати в NIGHT_LOG.md
- Якщо 1С OData чи Westmetall лягає — чекаю 5хв, ретрай, потім до наступної задачі

## НЕ робити
- `git push origin main`, `git push --force`
- `git reset --hard`, `git clean -fd`, `rm -rf`
- Видалення `.env`, `wrangler.toml`
- Видалення KV ключів, що не починаються з `cache_`

## Якщо пріоритети
Якщо час закінчується — задача 5 (warehouses.html) найменш критична, можна лишити заглушку.

## Контакт
Не будити. Зранку дивимось `NIGHT_LOG.md`.
