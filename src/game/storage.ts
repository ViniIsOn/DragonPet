import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { createNewSave } from './state.ts';
import { SAVE_VERSION } from './types.ts';
import type { GameSave } from './types.ts';

const KEY = 'dragonpet.save.v1';

function isSave(value: unknown): value is GameSave {
  if (!value || typeof value !== 'object') return false;
  const save = value as Partial<GameSave>;
  return save.version === SAVE_VERSION && typeof save.stats === 'object' && typeof save.settings === 'object';
}

export async function loadSave(): Promise<GameSave> {
  let raw: string | null = null;
  if (Capacitor.isNativePlatform()) {
    try {
      raw = (await Preferences.get({ key: KEY })).value ?? null;
    } catch {
      // Fall back to the WebView's localStorage if the plugin is unavailable.
    }
  }
  raw ??= localStorage.getItem(KEY);
  if (!raw) return createNewSave();

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isSave(parsed)) return createNewSave();
    // Merge with defaults so older saves gain any new fields safely.
    const fresh = createNewSave();
    const settings = { ...fresh.settings, ...parsed.settings };
    const legacyTime = parsed.settings?.reminderTime;
    const times = settings.reminderTimes?.filter((time) => /^\d{1,2}:\d{2}$/.test(time));
    settings.reminderTimes = times?.length ? times.slice(0, 3) : [legacyTime ?? '09:00'];
    settings.reminderFrequency = ['daily', 'weekdays', 'interval'].includes(settings.reminderFrequency)
      ? settings.reminderFrequency
      : 'daily';
    settings.reminderIntervalHours = [6, 12, 24].includes(settings.reminderIntervalHours)
      ? settings.reminderIntervalHours
      : 12;
    return {
      ...fresh,
      ...parsed,
      stats: { ...fresh.stats, ...parsed.stats },
      settings,
    };
  } catch {
    return createNewSave();
  }
}

export async function persistSave(save: GameSave): Promise<void> {
  const raw = JSON.stringify(save);
  localStorage.setItem(KEY, raw);
  if (Capacitor.isNativePlatform()) {
    try {
      await Preferences.set({ key: KEY, value: raw });
    } catch {
      // localStorage still holds a copy in the WebView.
    }
  }
}

export function saveLocationLabel(): string {
  return Capacitor.isNativePlatform()
    ? 'Salvo no armazenamento privado do app neste celular'
    : 'Salvo neste navegador neste dispositivo';
}
