export const SAVE_VERSION = 1;

export type Emotion = 'happy' | 'hungry' | 'sleepy' | 'affection' | 'playing' | 'sleeping';

export interface Stats {
  fullness: number;
  energy: number;
  joy: number;
  affection: number;
}

export type ReminderFrequency = 'daily' | 'weekdays' | 'interval';

export interface Settings {
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  remindersEnabled: boolean;
  /** Whether the one-time post-hatch reminder opt-in has been shown. */
  notificationPromptSeen: boolean;
  reminderTimes: string[];
  reminderFrequency: ReminderFrequency;
  reminderIntervalHours: number;
  quietDuringPlay: boolean;
  /** Legacy field from v0.1; only used to migrate older saves. */
  reminderTime?: string;
}

export interface GameSave {
  version: number;
  phase: 'egg' | 'dragon';
  dragonName: string;
  warmth: number;
  stats: Stats;
  fruits: number;
  sparkles: number;
  habitatLevel: number;
  sleeping: boolean;
  bornAt: number | null;
  lastTick: number;
  lastMeal: number;
  lastCuddle: number;
  lastPlay: number;
  careDays: number;
  streak: number;
  lastCareDate: string;
  lastReminderDate: string;
  discovered: string[];
  settings: Settings;
}
