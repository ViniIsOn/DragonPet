import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewSave } from '../src/game/state.ts';
import { buildReminderSpecs, nextOccurrence, normalizeTime } from '../src/game/reminder-schedule.ts';

const NOW = new Date(2026, 10, 26, 10, 0, 0);

test('horários inválidos são normalizados', () => {
  assert.equal(normalizeTime('9:05'), '09:05');
  assert.equal(normalizeTime('25:99'), '23:59');
});

test('próxima ocorrência usa o dia seguinte quando o horário já passou', () => {
  assert.equal(nextOccurrence('09:00', NOW).getDate(), 27);
  assert.equal(nextOccurrence('11:00', NOW).getDate(), 26);
});

test('frequência diária gera um alarme por horário', () => {
  const settings = { ...createNewSave().settings, reminderTimes: ['09:00', '20:30'], reminderFrequency: 'daily' as const };
  const specs = buildReminderSpecs(settings, ['a', 'b'], NOW);
  assert.equal(specs.length, 2);
  assert.deepEqual(specs.map((spec) => spec.id), [2000, 2001]);
  assert.deepEqual(specs.map((spec) => spec.kind), ['daily', 'daily']);
});

test('dias úteis geram cinco alarmes por horário, de segunda a sexta', () => {
  const settings = { ...createNewSave().settings, reminderTimes: ['08:00'], reminderFrequency: 'weekdays' as const };
  const specs = buildReminderSpecs(settings, ['a', 'b', 'c'], NOW);
  assert.equal(specs.length, 5);
  assert.deepEqual(specs.map((spec) => spec.weekday), [2, 3, 4, 5, 6]);
  assert.equal(new Set(specs.map((spec) => spec.id)).size, 5);
});

test('intervalo gera um alarme repetido a partir de agora', () => {
  const settings = {
    ...createNewSave().settings,
    reminderTimes: ['09:00'],
    reminderFrequency: 'interval' as const,
    reminderIntervalHours: 12,
  };
  const specs = buildReminderSpecs(settings, ['a'], NOW);
  assert.equal(specs.length, 1);
  assert.equal(specs[0].kind, 'interval');
  assert.equal(specs[0].hours, 12);
  assert.equal(new Date(specs[0].at ?? '').getTime() - NOW.getTime(), 12 * 3_600_000);
});
