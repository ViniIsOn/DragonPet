import type { ReminderFrequency, Settings } from './types.ts';

export const FIRST_REMINDER_ID = 2000;
export const TEST_REMINDER_ID = 2999;
export const MAX_REMINDERS = 40;
const HOUR = 3_600_000;

export type ReminderKind = 'daily' | 'weekday' | 'interval';

export interface ReminderSpec {
  id: number;
  time: string;
  body: string;
  kind: ReminderKind;
  /** 1 = Sunday ... 7 = Saturday, matching Capacitor's Weekday enum. */
  weekday?: number;
  /** ISO date of the first delivery for interval reminders. */
  at?: string;
  hours?: number;
}

export function normalizeTime(time: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return '09:00';
  const hour = Math.min(23, Number(match[1]));
  const minute = Math.min(59, Number(match[2]));
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function nextOccurrence(time: string, from = new Date()): Date {
  const [hour, minute] = normalizeTime(time).split(':').map(Number);
  const date = new Date(from);
  date.setHours(hour, minute, 0, 0);
  if (date.getTime() <= from.getTime()) date.setDate(date.getDate() + 1);
  return date;
}

/** Pure description of the alarms to create; easy to test without a device. */
export function buildReminderSpecs(settings: Settings, messages: string[], now = new Date()): ReminderSpec[] {
  const times = settings.reminderTimes.length ? settings.reminderTimes.map(normalizeTime) : ['09:00'];
  const specs: ReminderSpec[] = [];

  if (settings.reminderFrequency === 'interval') {
    const hours = [6, 12, 24].includes(settings.reminderIntervalHours) ? settings.reminderIntervalHours : 12;
    specs.push({
      id: FIRST_REMINDER_ID,
      time: times[0],
      body: messages[0] ?? '',
      kind: 'interval',
      hours,
      at: new Date(now.getTime() + hours * HOUR).toISOString(),
    });
    return specs;
  }

  times.forEach((time, timeIndex) => {
    if (settings.reminderFrequency === 'weekdays') {
      for (let weekday = 2; weekday <= 6; weekday += 1) {
        specs.push({
          id: FIRST_REMINDER_ID + timeIndex * 5 + (weekday - 2),
          time,
          body: messages[(timeIndex + weekday - 2) % messages.length] ?? '',
          kind: 'weekday',
          weekday,
        });
      }
    } else {
      specs.push({
        id: FIRST_REMINDER_ID + timeIndex,
        time,
        body: messages[timeIndex % messages.length] ?? '',
        kind: 'daily',
      });
    }
  });

  return specs;
}

export function frequencyLabel(frequency: ReminderFrequency): string {
  if (frequency === 'weekdays') return 'segunda a sexta';
  if (frequency === 'interval') return 'a cada intervalo';
  return 'todos os dias';
}
