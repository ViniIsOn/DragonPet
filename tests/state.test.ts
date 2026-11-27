import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyElapsed,
  createNewSave,
  currentEmotion,
  cuddle,
  feed,
  hatchEgg,
  localDateKey,
  registerCare,
  rewardMinigame,
  setSleeping,
  upgradeHabitat,
} from '../src/game/state.ts';

const NOW = new Date(2026, 10, 26, 10, 0, 0).getTime();
const HOUR = 3_600_000;

test('novo jogo começa com ovo e recursos iniciais', () => {
  const save = createNewSave(NOW);
  assert.equal(save.phase, 'egg');
  assert.equal(save.warmth, 0);
  assert.equal(save.fruits, 3);
  assert.equal(save.dragonName, '');
});

test('a fome cresce com o tempo, mas é limitada a 12 horas', () => {
  const save = createNewSave(NOW);
  const later = applyElapsed(save, NOW + 48 * HOUR);
  assert.equal(later.stats.fullness, 72 - 3.2 * 12);
  assert.ok(later.stats.fullness > 0, 'não há punição severa por falta');
  assert.equal(save.stats.fullness, 72, 'o estado original não é alterado');
});

test('dormir recupera energia e o dragão acorda ao fim do descanso', () => {
  const sleeping = setSleeping(createNewSave(NOW), true, NOW);
  const rested = applyElapsed(sleeping, NOW + 2 * HOUR);
  assert.ok(rested.stats.energy > sleeping.stats.energy);
  const longRest = applyElapsed(sleeping, NOW + 10 * HOUR);
  assert.equal(longRest.sleeping, false);
});

test('alimentar gasta uma fruta e aquece o vínculo; sem fruta não faz nada', () => {
  const save = { ...createNewSave(NOW), phase: 'dragon' as const };
  const fed = feed(save, NOW);
  assert.equal(fed.fruits, save.fruits - 1);
  assert.ok(fed.stats.fullness > save.stats.fullness);
  assert.equal(feed({ ...save, fruits: 0 }, NOW).fruits, 0);
});

test('emoções priorizam sono, fome e carinho', () => {
  const save = { ...createNewSave(NOW), phase: 'dragon' as const };
  assert.equal(currentEmotion({ ...save, sleeping: true }, NOW), 'sleeping');
  assert.equal(currentEmotion({ ...save, stats: { ...save.stats, fullness: 10 } }, NOW), 'hungry');
  assert.equal(currentEmotion({ ...save, stats: { ...save.stats, affection: 10 } }, NOW), 'affection');
  assert.equal(currentEmotion(save, NOW), 'happy');
});

test('um dia de cuidado é contado no máximo uma vez por dia local', () => {
  const save = createNewSave(NOW);
  const first = registerCare(save, NOW);
  assert.equal(first.careDays, 1);
  assert.equal(first.streak, 1);
  const sameDay = registerCare(first, NOW + HOUR);
  assert.equal(sameDay.careDays, 1);
  const nextDay = registerCare(first, NOW + 24 * HOUR);
  assert.equal(nextDay.careDays, 2);
  assert.equal(nextDay.streak, 2);
  assert.equal(localDateKey(NOW + 24 * HOUR), '2026-11-27');
});

test('melhorias e recompensas respeitam recursos', () => {
  let save = { ...createNewSave(NOW), phase: 'dragon' as const, fruits: 40, sparkles: 20 };
  save = upgradeHabitat(save, NOW);
  assert.equal(save.habitatLevel, 2);
  assert.equal(save.fruits, 28);
  assert.equal(save.sparkles, 14);
  const poor = upgradeHabitat({ ...createNewSave(NOW), fruits: 0, sparkles: 0 }, NOW);
  assert.equal(poor.habitatLevel, 1);
  save = rewardMinigame(save, 8, 4, NOW);
  assert.equal(save.sparkles, 18);
});

test('o ovo choca com nome e registra o primeiro dragão', () => {
  const save = createNewSave(NOW);
  const hatched = hatchEgg(save, '  Luna  ', NOW);
  assert.equal(hatched.phase, 'dragon');
  assert.equal(hatched.dragonName, 'Luna');
  assert.deepEqual(hatched.discovered, ['dragao-de-musgo']);
  assert.equal(hatched.bornAt, NOW);
});

test('carinho não funciona enquanto o dragão dorme', () => {
  const save = { ...createNewSave(NOW), phase: 'dragon' as const, sleeping: true };
  assert.equal(cuddle(save, NOW), save);
});
