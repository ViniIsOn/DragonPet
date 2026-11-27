import { Capacitor } from '@capacitor/core';
import { LocalNotifications, Weekday } from '@capacitor/local-notifications';
import { LINES, pick } from './text.ts';
import type { Settings } from './types.ts';
import {
  FIRST_REMINDER_ID,
  MAX_REMINDERS,
  TEST_REMINDER_ID,
  buildReminderSpecs,
  nextOccurrence,
} from './reminder-schedule.ts';

function allIds(): number[] {
  const ids: number[] = [];
  for (let id = FIRST_REMINDER_ID; id < FIRST_REMINDER_ID + MAX_REMINDERS; id += 1) ids.push(id);
  ids.push(TEST_REMINDER_ID);
  return ids;
}

function messages(name: string): string[] {
  return LINES.reminder.map((line) => (name ? `${name}, ${line.charAt(0).toLowerCase()}${line.slice(1)}` : line));
}

export async function notificationPermission(): Promise<string> {
  if (!Capacitor.isNativePlatform()) return 'navegador';
  try {
    return (await LocalNotifications.checkPermissions()).display;
  } catch {
    return 'indisponível';
  }
}

export async function requestNotificationPermission(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (!Capacitor.isNativePlatform()) {
    if (!('Notification' in window)) return 'unsupported';
    try {
      return (await Notification.requestPermission()) === 'granted' ? 'granted' : 'denied';
    } catch {
      return 'unsupported';
    }
  }
  try {
    return (await LocalNotifications.requestPermissions()).display === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'unsupported';
  }
}

export async function cancelAllReminders(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.cancel({ notifications: allIds().map((id) => ({ id })) });
  } catch {
    // No pending alarms, or the plugin is unavailable.
  }
}

/** Rebuilds every native alarm from the player's chosen times and frequency. */
export async function syncNativeReminders(settings: Settings, dragonName: string): Promise<{ count: number; status: string }> {
  if (!Capacitor.isNativePlatform()) return { count: 0, status: 'navegador' };
  await cancelAllReminders();
  if (!settings.remindersEnabled) return { count: 0, status: 'desligado' };

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') return { count: 0, status: 'permissão negada' };

  const specs = buildReminderSpecs(settings, messages(dragonName));
  const notifications = specs.map((spec) => {
    const [hour, minute] = spec.time.split(':').map(Number);
    const schedule =
      spec.kind === 'weekday'
        ? { on: { weekday: spec.weekday as Weekday, hour, minute }, allowWhileIdle: true }
        : { at: new Date(spec.at ?? nextOccurrence(spec.time)), repeats: true, allowWhileIdle: true };
    return { id: spec.id, title: 'DragonPet', body: spec.body, schedule, silent: false };
  });

  try {
    await LocalNotifications.schedule({ notifications });
    return { count: notifications.length, status: 'agendado' };
  } catch {
    return { count: 0, status: 'falha ao agendar' };
  }
}

/** Schedules a one-off alarm 10 seconds ahead so the player can verify it. */
export async function scheduleTestReminder(dragonName: string): Promise<'ok' | 'denied' | 'unsupported'> {
  if (!Capacitor.isNativePlatform()) return 'unsupported';
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') return 'denied';
  try {
    await LocalNotifications.cancel({ notifications: [{ id: TEST_REMINDER_ID }] });
    await LocalNotifications.schedule({
      notifications: [
        {
          id: TEST_REMINDER_ID,
          title: 'DragonPet · teste',
          body: pick(messages(dragonName)),
          schedule: { at: new Date(Date.now() + 10_000) },
        },
      ],
    });
    return 'ok';
  } catch {
    return 'unsupported';
  }
}

export async function pendingReminderReport(): Promise<string> {
  if (!Capacitor.isNativePlatform()) return 'No navegador não há alarmes nativos.';
  try {
    const { notifications } = await LocalNotifications.getPending();
    const mine = notifications.filter((item) => item.id >= FIRST_REMINDER_ID && item.id < FIRST_REMINDER_ID + MAX_REMINDERS);
    if (!mine.length) return 'Nenhum lembrete agendado no momento.';
    return `${mine.length} lembrete(s) agendado(s) no Android: ${mine.map((item) => `#${item.id}`).join(', ')}.`;
  } catch {
    return 'Não foi possível consultar os alarmes.';
  }
}

let playSuspended = false;

/** During a match we cancel alarms; they are rebuilt when the match ends. */
export async function suspendForPlay(): Promise<void> {
  if (playSuspended || !Capacitor.isNativePlatform()) return;
  playSuspended = true;
  await cancelAllReminders();
}

export async function resumeAfterPlay(settings: Settings, dragonName: string): Promise<void> {
  if (!playSuspended) return;
  playSuspended = false;
  await syncNativeReminders(settings, dragonName);
}

export async function watchNativeMessages(onMessage: (body: string) => void): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) return () => {};
  try {
    const handle = await LocalNotifications.addListener('localNotificationReceived', (notification) => {
      onMessage(notification.body);
    });
    return () => handle.remove();
  } catch {
    return () => {};
  }
}

/**
 * Browser fallback: only while the tab is open. System notifications are used
 * solely when the player explicitly granted permission; no service worker or
 * background push is part of this version.
 */
export function watchWebReminder(settings: Settings, onReminder: (message: string) => void, isPlaying: () => boolean): () => void {
  if (!settings.remindersEnabled || Capacitor.isNativePlatform()) return () => {};
  const interval = window.setInterval(() => {
    if (settings.quietDuringPlay && isPlaying()) return;
    const now = new Date();
    const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const storageKey = 'dragonpet.web-reminder-date';

    if (settings.reminderFrequency === 'interval') {
      const lastKey = 'dragonpet.web-reminder-last';
      const last = Number(localStorage.getItem(lastKey) ?? 0);
      const hours = settings.reminderIntervalHours;
      if (now.getTime() - last < hours * 3_600_000) return;
      localStorage.setItem(lastKey, String(now.getTime()));
    } else {
      if (!settings.reminderTimes.includes(clock)) return;
      if (settings.reminderFrequency === 'weekdays' && (now.getDay() === 0 || now.getDay() === 6)) return;
      const key = `${now.toDateString()} ${clock}`;
      if (localStorage.getItem(storageKey) === key) return;
      localStorage.setItem(storageKey, key);
    }

    const message = pick(LINES.reminder);
    onReminder(message);
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('DragonPet', { body: message });
      } catch {
        // Some browsers only accept notifications from a service worker.
      }
    }
  }, 20_000);
  return () => window.clearInterval(interval);
}

export async function requestWebNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}
