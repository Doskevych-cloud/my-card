/* Тест ВО на всіх 12 сценаріях зі скріна. Запуск: node my-card/sla-vo.test.mjs
 * Київ у червні = UTC+3 → київ 09:00 = 06:00Z, 18:00 = 15:00Z.
 * Вхід задаємо в UTC ISO ('...Z'), як їх пише бот у dealer_chat_log.created_at.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { businessMinutes, isWithinWorkWindow, applyVO, _localParts } = require('./sla-vo.js');

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

// ── applyVO: ВО всього звіту з паузами й днями відсутності (спільний для sla.html і бота) ──
// Пт 26.06: A — Олександра (tg 1), запит 10:00 → відповідь 10:24, її пауза 10:01–10:20 → 24 − 19 = 5;
//           B — Дарʼя (tg 2), 10:00 → 10:25, пауза Олександри її не стосується → 25;
//           C — Дарʼя, виключений КВП → не в середніх;
//           D — Дарʼя, Чт 25.06 17:30 → Пн 29.06 09:20 через її відсутню пʼятницю: 30 + 540 + 20 − 540 = 50,
//               а її пауза в ту ж пʼятницю (09:00–10:00) двічі не віднімається.
const mk = () => ({
  managers: [
    { name: 'О', tg: 1, counterparties: [{ name: 'A', events: [
      { id: 1, mgr_tg: 1, request_at: K('26', 10, 0), response_at: K('26', 10, 24), reaction_min: 24, excluded: 0 }] }] },
    { name: 'Д', tg: 2, counterparties: [{ name: 'B', events: [
      { id: 2, mgr_tg: 2, request_at: K('26', 10, 0), response_at: K('26', 10, 25), reaction_min: 25, excluded: 0 },
      { id: 3, mgr_tg: 2, request_at: K('26', 11, 0), response_at: K('26', 12, 0), reaction_min: 60, excluded: 1 }] },
      { name: 'D', events: [
      { id: 4, mgr_tg: 2, request_at: K('25', 17, 30), response_at: K('29', 9, 20), reaction_min: 5270, excluded: 0 }] }] },
  ],
  pauses: [{ tg: 1, from: K('26', 10, 1), to: K('26', 10, 20) }],
  absences: [],
});
const evOf = (r, id) => r.managers.flatMap(m => m.counterparties.flatMap(c => c.events)).find(e => e.id === id);
let r = applyVO(mk());
eq('applyVO: пауза того, хто відповів, віднімається (24 − 19)', evOf(r, 1).reaction_min, 5);
eq('applyVO: pause_min = 19, wall_min збережено', evOf(r, 1).pause_min + evOf(r, 1).wall_min, 19 + 24);
eq('applyVO: чужа пауза не чіпає замір', evOf(r, 2).reaction_min, 25);
eq('applyVO: без відсутності — 590 роб. хв через пʼятницю', evOf(r, 4).reaction_min, 590);
eq('applyVO: середнє менеджера без виключеного ((25 + 590) / 2)', r.managers[1].avg_min, 307.5);
eq('applyVO: загальне середнє і кількість', r.overall_avg_min + r.total_events, Math.round((5 + 25 + 590) / 3 * 100) / 100 + 3);
r = mk(); r.absences = [{ tg: 2, day: '2026-06-26' }]; r.pauses.push({ tg: 2, from: K('26', 9, 0), to: K('26', 10, 0) });
applyVO(r);
eq('applyVO: запит у день відсутності — замір не рахується', evOf(r, 2).absent ? 1 : 0, 1);
eq('applyVO: замір через день відсутності: 590 − 540 = 50, пауза того дня двічі не віднімається', evOf(r, 4).reaction_min, 50);
eq('applyVO: середнє Дарʼї — лише замір 50', r.managers[1].avg_min + r.managers[1].count, 51);
applyVO(r);
eq('applyVO: повторний виклик ідемпотентний', evOf(r, 4).reaction_min + evOf(r, 1).reaction_min, 55);

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
