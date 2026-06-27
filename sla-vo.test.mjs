/* Тест ВО на всіх 12 сценаріях зі скріна. Запуск: node my-card/sla-vo.test.mjs
 * Київ у червні = UTC+3 → київ 09:00 = 06:00Z, 18:00 = 15:00Z.
 * Вхід задаємо в UTC ISO ('...Z'), як їх пише бот у dealer_chat_log.created_at.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { businessMinutes, isWithinWorkWindow, _localParts } = require('./sla-vo.js');

// київський wall-clock → UTC ISO (червень, +3)
const K = (d, hh, mm) => {
  const z = String(hh - 3).padStart(2, '0');
  return `2026-06-${d}T${z}:${String(mm).padStart(2, '0')}:00.000Z`;
};

let pass = 0, fail = 0;
function eq(name, got, want) {
  const ok = Math.abs(got - want) < 0.001;
  console.log(`${ok ? '✓' : '✗'} ${name}: got=${got} want=${want}`);
  ok ? pass++ : fail++;
}

// Перевірка днів тижня (фундамент усього)
const wd = (d) => _localParts(new Date(K(d, 12, 0)), 'Europe/Kyiv').weekday;
console.log('weekdays:', ['25','26','27','28','29','30'].map(d => `${d}=${wd(d)}`).join(' '));

// Сценарій 1 — робочий час: 10:00 → 10:25 = 25 хв
eq('1 робочий час', businessMinutes(K('26', 10, 0), K('26', 10, 25)), 25);

// Сценарій 2 — до 09:00: запит 07:30, відповідь 09:15 → старт о 09:00 = 15 хв
eq('2 до початку дня', businessMinutes(K('26', 7, 30), K('26', 9, 15)), 15);

// Сценарій 3 — після 18:00 (Чт 19:45) → відповідь Пт 09:30 = 30 хв
eq('3 після кінця дня', businessMinutes(K('25', 19, 45), K('26', 9, 30)), 30);

// Сценарій 4 — вихідний (Сб 12:00) → відповідь Пн 09:20 = 20 хв
eq('4 вихідний', businessMinutes(K('27', 12, 0), K('29', 9, 20)), 20);

// Сценарій 5 — свято: Пн 29-е як свято → запит Пн 10:00, відповідь Вт 09:10 = 10 хв
eq('5 свято', businessMinutes(K('29', 10, 0), K('30', 9, 10), { holidays: ['2026-06-29'] }), 10);

// Сценарій 6 — не відповіли до кінця дня: Пт 17:45 → Пн 09:30
//   = Пт 17:45–18:00 (15) + Пн 09:00–09:30 (30) = 45 хв (Сб/Нд не рахуються)
eq('6 нічна/вихідна пауза', businessMinutes(K('26', 17, 45), K('29', 9, 30)), 45);

// Сценарій 7 — відповідь о 18:01 на питання о 17:45 → кеп о 18:00 = 15 хв
eq('7 кеп о 18:00', businessMinutes(K('26', 17, 45), K('26', 18, 1)), 15);

// Додатково: нічна пауза в межах одного робочого вікна-переходу
//   17:55 → наступний день 09:05 = 5 + 5 = 10
eq('6b мікро-пауза', businessMinutes(K('25', 17, 55), K('26', 9, 5)), 10);

// Сценарій 8/9/10/11/12 — рівень даних (подія взагалі не створюється/закривається).
// На рівні ВО перевіряємо лише граничні випадки математики:
eq('відповідь = запит → 0', businessMinutes(K('26', 10, 0), K('26', 10, 0)), 0);
eq('відповідь раніше запиту → 0', businessMinutes(K('26', 10, 0), K('26', 9, 0)), 0);
eq('запит і відповідь поза вікном (ніч) → 0', businessMinutes(K('26', 19, 0), K('26', 20, 0)), 0);

// isWithinWorkWindow — для класифікації сценарію 1 vs 2/3/4/5
eq('window: 10:00 робочий → 1', isWithinWorkWindow(K('26', 10, 0)) ? 1 : 0, 1);
eq('window: 07:30 → 0', isWithinWorkWindow(K('26', 7, 30)) ? 1 : 0, 0);
eq('window: Сб 12:00 → 0', isWithinWorkWindow(K('27', 12, 0)) ? 1 : 0, 0);

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
