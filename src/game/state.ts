import type { Emotion, GameSave, Stats } from './types.ts';

export const MAX_STAT = 100;
export const MIN_STAT = 0;
export const FEED_COST = 1;
export const HABITAT_MAX_LEVEL = 3;

const HOUR = 3_600_000;

function clamp(value: number, min = MIN_STAT, max = MAX_STAT): number {
  return Math.min(max, Math.max(min, value));
}

export function createNewSave(now = Date.now()): GameSave {
  return {
    version: 1,
    phase: 'egg',
    dragonName: '',
    warmth: 0,
    stats: { fullness: 72, energy: 78, joy: 76, affection: 70 },
    fruits: 3,
    sparkles: 0,
    habitatLevel: 1,
    sleeping: false,
    bornAt: null,
    lastTick: now,
    lastMeal: 0,
    lastCuddle: 0,
    lastPlay: 0,
    careDays: 0,
    streak: 0,
    lastCareDate: '',
    lastReminderDate: '',
    discovered: [],
    settings: {
      musicVolume: 0.4,
      sfxVolume: 0.7,
      muted: false,
      remindersEnabled: false,
      reminderTimes: ['09:00'],
      reminderFrequency: 'daily',
      reminderIntervalHours: 12,
      quietDuringPlay: true,
    },
  };
}

/** Local (not UTC) date key, so "day" matches the player's clock. */
export function localDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function regenMinutes(habitatLevel: number): number {
  return [0, 24, 18, 14][habitatLevel] ?? 24;
}

export function fruitCapacity(habitatLevel: number): number {
  return 12 + (habitatLevel - 1) * 6;
}

/**
 * Applies time passed since the last visit. Decay is capped at 12 hours and
 * stats never fall below zero: missing a day only means a sleepy, hungry
 * dragon, never a penalty or a loss of progress.
 */
export function applyElapsed(save: GameSave, now = Date.now()): GameSave {
  const next: GameSave = structuredClone(save);
  const hours = Math.max(0, (now - next.lastTick) / HOUR);
  const decayHours = Math.min(12, hours);

  if (next.sleeping) {
    // Rest is gentle: energy recovers, other needs barely move.
    next.stats.energy = clamp(next.stats.energy + 14 * decayHours);
    next.stats.fullness = clamp(next.stats.fullness - 1 * decayHours);
    next.stats.affection = clamp(next.stats.affection - 0.4 * decayHours);
    next.stats.joy = clamp(next.stats.joy + 0.4 * decayHours);
    if (next.stats.energy >= 98) next.sleeping = false;
  } else {
    next.stats.fullness = clamp(next.stats.fullness - 3.2 * decayHours);
    next.stats.energy = clamp(next.stats.energy - 2.6 * decayHours);
    next.stats.joy = clamp(next.stats.joy - 2 * decayHours);
    next.stats.affection = clamp(next.stats.affection - 1.4 * decayHours);
  }

  // Trees keep growing while the game is closed, up to the storage capacity.
  const grown = Math.min(20, Math.floor(hours * 60 / regenMinutes(next.habitatLevel)));
  next.fruits = Math.min(fruitCapacity(next.habitatLevel), next.fruits + grown);

  if (next.phase === 'egg') next.warmth = clamp(next.warmth + hours * 4, 0, 100);

  next.lastTick = now;
  return next;
}

export function currentEmotion(save: GameSave, now = Date.now()): Emotion {
  if (save.sleeping) return 'sleeping';
  if (save.stats.fullness < 32) return 'hungry';
  if (save.stats.energy < 30) return 'sleepy';
  if (save.stats.affection < 38) return 'affection';
  if (now - save.lastPlay < 2600) return 'playing';
  return 'happy';
}

/** Counts a care day at most once per local day; the streak is never punitive. */
export function registerCare(save: GameSave, now = Date.now()): GameSave {
  const today = localDateKey(now);
  if (save.lastCareDate === today) return save;
  const next: GameSave = structuredClone(save);
  const yesterday = localDateKey(now - 24 * HOUR);
  next.streak = next.lastCareDate === yesterday ? next.streak + 1 : 1;
  next.careDays += 1;
  next.lastCareDate = today;
  return next;
}

export interface UpgradeCost {
  fruits: number;
  sparkles: number;
}

export function upgradeCost(level: number): UpgradeCost | null {
  if (level === 1) return { fruits: 12, sparkles: 6 };
  if (level === 2) return { fruits: 26, sparkles: 16 };
  return null;
}

export function canUpgrade(save: GameSave): boolean {
  const cost = upgradeCost(save.habitatLevel);
  return !!cost && save.fruits >= cost.fruits && save.sparkles >= cost.sparkles;
}

export function hatchEgg(save: GameSave, name: string, now = Date.now()): GameSave {
  const next: GameSave = structuredClone(save);
  next.phase = 'dragon';
  next.dragonName = name.trim().slice(0, 18) || 'Pip';
  next.bornAt = now;
  next.warmth = 100;
  next.discovered = ['dragao-de-musgo'];
  next.stats = { ...next.stats, joy: clamp(next.stats.joy + 12) };
  return next;
}

export function feed(save: GameSave, now = Date.now()): GameSave {
  if (save.fruits < FEED_COST || save.sleeping) return save;
  const next: GameSave = structuredClone(save);
  next.fruits -= FEED_COST;
  next.stats.fullness = clamp(next.stats.fullness + 20);
  next.stats.joy = clamp(next.stats.joy + 4);
  next.lastMeal = now;
  return registerCare(next, now);
}

export function cuddle(save: GameSave, now = Date.now()): GameSave {
  if (save.sleeping) return save;
  const next: GameSave = structuredClone(save);
  next.stats.affection = clamp(next.stats.affection + 9);
  next.stats.joy = clamp(next.stats.joy + 6);
  next.lastCuddle = now;
  return registerCare(next, now);
}

export function rewardMinigame(save: GameSave, caught: number, sparkles: number, now = Date.now()): GameSave {
  const next: GameSave = structuredClone(save);
  const fruits = Math.max(1, Math.round(caught / 2));
  next.fruits = Math.min(fruitCapacity(next.habitatLevel), next.fruits + fruits);
  next.sparkles += sparkles;
  next.stats.joy = clamp(next.stats.joy + 8);
  next.stats.fullness = clamp(next.stats.fullness - 3);
  next.lastPlay = now;
  return registerCare(next, now);
}

export function setSleeping(save: GameSave, sleeping: boolean, now = Date.now()): GameSave {
  const next: GameSave = structuredClone(save);
  next.sleeping = sleeping;
  return registerCare(next, now);
}

export function upgradeHabitat(save: GameSave, now = Date.now()): GameSave {
  const cost = upgradeCost(save.habitatLevel);
  if (!cost || save.fruits < cost.fruits || save.sparkles < cost.sparkles) return save;
  const next: GameSave = structuredClone(save);
  next.fruits -= cost.fruits;
  next.sparkles -= cost.sparkles;
  next.habitatLevel += 1;
  return registerCare(next, now);
}

export function statsAverage(stats: Stats): number {
  return (stats.fullness + stats.energy + stats.joy + stats.affection) / 4;
}
