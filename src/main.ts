import './styles.css';
import { GameAudio } from './game/audio.ts';
import {
  applyElapsed,
  canUpgrade,
  currentEmotion,
  cuddle,
  feed,
  hatchEgg,
  rewardMinigame,
  setSleeping,
  upgradeCost,
  upgradeHabitat,
} from './game/state.ts';
import { loadSave, persistSave, saveLocationLabel } from './game/storage.ts';
import { startFruitGame } from './game/minigame.ts';
import {
  notificationPermission,
  pendingReminderReport,
  requestNotificationPermission,
  resumeAfterPlay,
  scheduleTestReminder,
  suspendForPlay,
  syncNativeReminders,
  watchNativeMessages,
  watchWebReminder,
} from './game/reminders.ts';
import { frequencyLabel } from './game/reminder-schedule.ts';
import { EMOTION_LABELS, LINES, pick } from './game/text.ts';
import type { GameSave, Settings } from './game/types.ts';

function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Elemento não encontrado: #${id}`);
  return node as T;
}

function query<T extends HTMLElement = HTMLElement>(root: ParentNode, selector: string): T {
  const node = root.querySelector<T>(selector);
  if (!node) throw new Error(`Elemento não encontrado: ${selector}`);
  return node;
}

const audio = new GameAudio();
const modalRoot = el('modal-root');
let save: GameSave;
let modalCleanup: (() => void) | null = null;
let stopWebReminder: () => void = () => {};
let bubbleTimer = 0;
let lastFeed = 0;
let lastCuddle = 0;
let playMode = false;

function commit(next: GameSave): void {
  save = next;
  void persistSave(save);
  render();
}

function bubble(message: string): void {
  const node = el('bubble');
  node.textContent = message;
  node.hidden = false;
  window.clearTimeout(bubbleTimer);
  bubbleTimer = window.setTimeout(() => {
    node.hidden = true;
  }, 3200);
}

function particles(icon: string, count: number): void {
  const layer = el('particles');
  for (let i = 0; i < count; i += 1) {
    const particle = document.createElement('span');
    particle.className = 'particle';
    particle.textContent = icon;
    particle.style.left = `${42 + Math.random() * 16}%`;
    particle.style.setProperty('--drift', `${(Math.random() - 0.5) * 90}px`);
    particle.style.animationDelay = `${i * 90}ms`;
    layer.appendChild(particle);
    window.setTimeout(() => particle.remove(), 1500);
  }
}

function render(): void {
  el('fruit-count').textContent = String(save.fruits);
  el('sparkle-count').textContent = String(save.sparkles);
  el('day-label').textContent = `Dia ${Math.max(1, save.careDays)} · Filhote${save.streak > 1 ? ` · ${save.streak} dias seguidos` : ''}`;
  el('save-label').textContent = saveLocationLabel();

  const isEgg = save.phase === 'egg';
  el('egg-scene').hidden = !isEgg;
  el('dragon-scene').hidden = isEgg;
  if (isEgg) {
    const progress = Math.round(save.warmth);
    query(el('egg-scene'), '.progress-fill').style.width = `${progress}%`;
    el('egg-label').textContent = `${progress}% aquecido`;
  } else {
    const emotion = currentEmotion(save);
    const dragon = el<HTMLImageElement>('dragon');
    const src = `./art/dragon-${emotion}.webp`;
    if (dragon.getAttribute('src') !== src) dragon.setAttribute('src', src);
    dragon.alt = `Dragão ${EMOTION_LABELS[emotion].toLowerCase()}`;
    el('dragon-name').textContent = save.dragonName || 'Dragão';
    el('dragon-mood').textContent = EMOTION_LABELS[emotion];
  }

  (Object.keys(save.stats) as Array<keyof typeof save.stats>).forEach((key) => {
    const stat = document.querySelector<HTMLElement>(`.stat[data-stat="${key}"]`);
    if (!stat) return;
    const fill = query<HTMLElement>(stat, '.stat-fill');
    fill.style.width = `${save.stats[key]}%`;
    stat.classList.toggle('low', save.stats[key] < 32);
  });

  const feedBtn = el<HTMLButtonElement>('feed-btn');
  const playBtn = el<HTMLButtonElement>('play-btn');
  const cuddleBtn = el<HTMLButtonElement>('cuddle-btn');
  const sleepBtn = el<HTMLButtonElement>('sleep-btn');
  [feedBtn, playBtn, cuddleBtn, sleepBtn].forEach((btn) => {
    btn.disabled = isEgg;
  });
  feedBtn.disabled = isEgg || save.sleeping || save.fruits < 1;
  playBtn.disabled = isEgg || save.sleeping;
  cuddleBtn.disabled = isEgg || save.sleeping;
  el<HTMLSpanElement>('sleep-btn').lastElementChild!.textContent = save.sleeping ? 'Acordar' : 'Dormir';

  const decor = el('habitat-decor');
  decor.dataset.level = String(save.habitatLevel);
}

function closeModal(): void {
  modalCleanup?.();
  modalCleanup = null;
  modalRoot.hidden = true;
  modalRoot.innerHTML = '';
}

function openModal(content: string, setup?: (modal: HTMLElement) => void): void {
  closeModal();
  modalRoot.hidden = false;
  modalRoot.innerHTML = `<div class="modal-backdrop" data-close></div><div class="modal" role="dialog" aria-modal="true">${content}</div>`;
  modalRoot.querySelectorAll('[data-close]').forEach((node) => node.addEventListener('click', closeModal));
  const modal = query(modalRoot, '.modal');
  setup?.(modal);
  const first = modal.querySelector<HTMLElement>('button, input');
  if (first && window.matchMedia('(min-width: 700px)').matches) first.focus();
}

function showNameModal(): void {
  openModal(
    `<h2>Ele nasceu!</h2>
     <p class="modal-text">Um dragão esmeralda olhou para você e sorriu. Como quer chamá-lo?</p>
     <label class="field-label" for="name-input">Nome do dragão</label>
     <input id="name-input" class="text-input" maxlength="18" value="Pip" autocomplete="off" />
     <div class="modal-actions"><button id="confirm-name" class="primary" type="button">É esse nome!</button></div>`,
    (modal) => {
      const input = query<HTMLInputElement>(modal, '#name-input');
      query<HTMLButtonElement>(modal, '#confirm-name').addEventListener('click', () => {
        commit({ ...save, dragonName: input.value.trim().slice(0, 18) || 'Pip' });
        bubble(pick(LINES.hatch));
        particles('✨', 8);
        closeModal();
      });
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') query<HTMLButtonElement>(modal, '#confirm-name').click();
      });
    },
  );
}

function doHatch(): void {
  commit(hatchEgg(save, 'Pip', Date.now()));
  audio.sfx('hatch');
  particles('✨', 10);
  showNameModal();
}

function showMinigame(): void {
  openModal(
    `<h2>Pega-Frutas</h2>
     <p class="modal-text">Mova o dedo, o mouse ou as setas do teclado para pegar frutas por 25 segundos. Sem pressão: o que pegar é seu!</p>
     <canvas id="fruit-canvas" aria-label="Minijogo de pegar frutas"></canvas>
     <div class="modal-actions"><button id="close-game" class="ghost" type="button">Sair do jogo</button></div>`,
    (modal) => {
      const canvas = query<HTMLCanvasElement>(modal, '#fruit-canvas');
      void setPlayMode(true);
      const stopGame = startFruitGame(
        canvas,
        (result) => {
          modalCleanup = null;
          void setPlayMode(false);
          commit(rewardMinigame(save, result.caught, result.sparkles, Date.now()));
          audio.sfx('reward');
          closeModal();
          bubble(pick(LINES.reward));
          openModal(
            `<h2>Que diversão!</h2>
             <p class="modal-text">Você pegou <strong>${result.caught}</strong> frutas.</p>
             <p class="reward-line">🍊 +${result.fruits} frutas &nbsp; ✨ +${result.sparkles} brilhos</p>
             <div class="modal-actions"><button class="primary" data-close type="button">Continuar cuidando</button></div>`,
          );
        },
        () => audio.sfx('catch'),
      );
      modalCleanup = () => {
        stopGame();
        void setPlayMode(false);
      };
      query<HTMLButtonElement>(modal, '#close-game').addEventListener('click', closeModal);
    },
  );
}

function showHabitat(): void {
  const level = save.habitatLevel;
  const cost = upgradeCost(level);
  const effect = level === 1 ? 'Frutas a cada 24 min · 12 no cesto' : level === 2 ? 'Frutas a cada 18 min · 18 no cesto' : 'Frutas a cada 14 min · 24 no cesto';
  const costText = cost ? `🍊 ${cost.fruits} frutas &nbsp; ✨ ${cost.sparkles} brilhos` : 'Habitat completo nesta versão';
  openModal(
    `<h2>Ninho da Ilha</h2>
     <p class="modal-text">Nível ${level} · ${effect}</p>
     <p class="reward-line">${costText}</p>
     <p class="modal-text small">Melhorar deixa a ilha mais aconchegante e as fruteiras mais generosas. Seus brilhos vêm do Pega-Frutas.</p>
     <div class="modal-actions">
       <button id="upgrade-btn" class="primary" type="button" ${cost && canUpgrade(save) ? '' : 'disabled'}>${cost ? 'Melhorar habitat' : 'Tudo pronto!'}</button>
       <button class="ghost" data-close type="button">Voltar</button>
     </div>`,
    (modal) => {
      const upgrade = query<HTMLButtonElement>(modal, '#upgrade-btn');
      upgrade.addEventListener('click', () => {
        commit(upgradeHabitat(save, Date.now()));
        audio.sfx('upgrade');
        particles('✦', 6);
        bubble(pick(LINES.upgrade));
        showHabitat();
      });
    },
  );
}

function showCatalog(): void {
  const names = ['Nuvem de Algodão', 'Dragão do Lago', 'Fagulha Doce'];
  openModal(
    `<h2>Livro dos dragões</h2>
     <p class="modal-text">Cada amigo aparece quando a ilha estiver pronta para recebê-lo.</p>
     <ul class="catalog">
       <li><span class="catalog-art">🐉</span><div><strong id="known-name"></strong><small>Dragão Esmeralda · descoberto</small></div></li>
       ${names.map((name) => `<li class="locked"><span class="catalog-art">?</span><div><strong>${name}</strong><small>Em breve</small></div></li>`).join('')}
     </ul>
     <div class="modal-actions"><button class="primary" data-close type="button">Fechar</button></div>`,
    (modal) => {
      query(modal, '#known-name').textContent = save.dragonName || 'Seu dragão';
    },
  );
}

async function syncNativeNotifications(): Promise<void> {
  const result = await syncNativeReminders(save.settings, save.dragonName);
  if (result.status === 'permissão negada') bubble('Preciso da permissão de notificações para te lembrar.');
}

async function updateSettings(changes: Partial<Settings>): Promise<void> {
  const next: GameSave = { ...save, settings: { ...save.settings, ...changes } };
  commit(next);
  audio.applySettings(next.settings);
  restartReminderWatcher();
  if (
    changes.remindersEnabled !== undefined ||
    changes.reminderTimes !== undefined ||
    changes.reminderFrequency !== undefined ||
    changes.reminderIntervalHours !== undefined
  ) {
    await syncNativeNotifications();
  }
  if (changes.remindersEnabled === true && next.settings.remindersEnabled) await requestNotificationPermission();
}

async function setPlayMode(active: boolean): Promise<void> {
  playMode = active;
  restartReminderWatcher();
  if (active) await suspendForPlay();
  else await resumeAfterPlay(save.settings, save.dragonName);
}

function showSettings(): void {
  const s = save.settings;
  const isInterval = s.reminderFrequency === 'interval';
  const timeRows = s.reminderTimes
    .map(
      (time, index) => `
        <div class="time-row">
          <input type="time" data-time-index="${index}" value="${time}" aria-label="Horário ${index + 1}" />
          <button class="ghost small-btn" data-remove-time="${index}" type="button" ${s.reminderTimes.length === 1 ? 'disabled' : ''}>Remover</button>
        </div>`,
    )
    .join('');

  openModal(
    `<h2>Configurações</h2>
     <label class="field-label" for="music-volume">Música <span id="music-value">${Math.round(s.musicVolume * 100)}%</span></label>
     <input id="music-volume" type="range" min="0" max="100" value="${Math.round(s.musicVolume * 100)}" />
     <label class="field-label" for="sfx-volume">Efeitos <span id="sfx-value">${Math.round(s.sfxVolume * 100)}%</span></label>
     <input id="sfx-volume" type="range" min="0" max="100" value="${Math.round(s.sfxVolume * 100)}" />
     <label class="check-row"><input id="muted" type="checkbox" ${s.muted ? 'checked' : ''} /> Silenciar tudo</label>
     <hr />
     <h3>Lembretes do dragão</h3>
     <label class="check-row"><input id="reminders" type="checkbox" ${s.remindersEnabled ? 'checked' : ''} /> Ativar notificações locais</label>
     <label class="field-label" for="frequency">Frequência</label>
     <select id="frequency">
       <option value="daily" ${s.reminderFrequency === 'daily' ? 'selected' : ''}>Todos os dias</option>
       <option value="weekdays" ${s.reminderFrequency === 'weekdays' ? 'selected' : ''}>Segunda a sexta</option>
       <option value="interval" ${isInterval ? 'selected' : ''}>A cada intervalo</option>
     </select>
     <div id="interval-row" ${isInterval ? '' : 'hidden'}>
       <label class="field-label" for="interval-hours">Repetir a cada</label>
       <select id="interval-hours">
         ${[6, 12, 24].map((hours) => `<option value="${hours}" ${s.reminderIntervalHours === hours ? 'selected' : ''}>${hours} horas</option>`).join('')}
       </select>
     </div>
     <div id="times" ${isInterval ? 'hidden' : ''}>
       <span class="field-label">Horários (até 3)</span>
       ${timeRows}
       <button id="add-time" class="ghost small-btn" type="button" ${isInterval || s.reminderTimes.length >= 3 ? 'disabled' : ''}>+ Adicionar horário</button>
     </div>
     <label class="check-row"><input id="quiet" type="checkbox" ${s.quietDuringPlay ? 'checked' : ''} /> Silenciar durante partidas</label>
     <div class="modal-actions">
       <button id="test-message" class="ghost small-btn" type="button">Ver mensagem agora</button>
       <button id="test-native" class="ghost small-btn" type="button">Testar notificação em 10 s (Android)</button>
       <button id="check-pending" class="ghost small-btn" type="button">Ver alarmes agendados</button>
     </div>
     <p class="modal-text small" id="reminder-status">Frequência atual: ${frequencyLabel(s.reminderFrequency)}. No navegador o lembrete só aparece com esta página aberta; no Android ele é agendado pelo sistema.</p>
     <p class="modal-text small" id="permission-status">Permissão: consultando…</p>
     <p class="modal-text small" id="pending-status">Alarmes: consultando…</p>
     <p class="modal-text small">Permissões usadas: notificações (ao ativar), alerta/woke lock e reinício do dispositivo (agendamento) e INTERNET (padrão do WebView). Sem sobreposição de tela, sem acesso a outros apps e sem anúncios.</p>
     <div class="modal-actions"><button class="primary" data-close type="button">Fechar</button></div>`,
    (modal) => {
      const music = query<HTMLInputElement>(modal, '#music-volume');
      const sfx = query<HTMLInputElement>(modal, '#sfx-volume');
      const status = query(modal, '#reminder-status');
      query(modal, '#music-value').textContent = `${music.value}%`;
      query(modal, '#sfx-value').textContent = `${sfx.value}%`;
      void notificationPermission().then((permission) => {
        query(modal, '#permission-status').textContent = `Permissão de notificações: ${permission}.`;
      });
      void pendingReminderReport().then((report) => {
        query(modal, '#pending-status').textContent = report;
      });

      music.addEventListener('input', () => {
        query(modal, '#music-value').textContent = `${music.value}%`;
        void updateSettings({ musicVolume: Number(music.value) / 100 });
      });
      sfx.addEventListener('input', () => {
        query(modal, '#sfx-value').textContent = `${sfx.value}%`;
        void updateSettings({ sfxVolume: Number(sfx.value) / 100 });
      });
      query<HTMLInputElement>(modal, '#muted').addEventListener('change', (event) => {
        void updateSettings({ muted: (event.target as HTMLInputElement).checked });
      });
      query<HTMLSelectElement>(modal, '#frequency').addEventListener('change', (event) => {
        const value = (event.target as HTMLSelectElement).value as Settings['reminderFrequency'];
        void updateSettings({ reminderFrequency: value }).then(showSettings);
      });
      query<HTMLSelectElement>(modal, '#interval-hours').addEventListener('change', (event) => {
        void updateSettings({ reminderIntervalHours: Number((event.target as HTMLSelectElement).value) }).then(() => {
          status.textContent = 'Intervalo atualizado.';
        });
      });
      modal.querySelectorAll<HTMLInputElement>('[data-time-index]').forEach((input) => {
        input.addEventListener('change', () => {
          const times = [...s.reminderTimes];
          times[Number(input.dataset.timeIndex)] = input.value || '09:00';
          void updateSettings({ reminderTimes: times }).then(() => {
            status.textContent = 'Horário salvo e alarme reagendado.';
          });
        });
      });
      modal.querySelectorAll<HTMLButtonElement>('[data-remove-time]').forEach((button) => {
        button.addEventListener('click', () => {
          const times = s.reminderTimes.filter((_, index) => index !== Number(button.dataset.removeTime));
          void updateSettings({ reminderTimes: times }).then(showSettings);
        });
      });
      query<HTMLButtonElement>(modal, '#add-time').addEventListener('click', () => {
        void updateSettings({ reminderTimes: [...s.reminderTimes, '12:00'] }).then(showSettings);
      });
      query<HTMLInputElement>(modal, '#quiet').addEventListener('change', (event) => {
        void updateSettings({ quietDuringPlay: (event.target as HTMLInputElement).checked }).then(() => {
          status.textContent = 'Preferência de silêncio salva.';
        });
      });
      query<HTMLInputElement>(modal, '#reminders').addEventListener('change', async (event) => {
        const enabled = (event.target as HTMLInputElement).checked;
        status.textContent = enabled ? 'Agendando…' : 'Desligando…';
        await updateSettings({ remindersEnabled: enabled });
        status.textContent = enabled ? 'Lembretes ativos.' : 'Lembretes desligados; nenhum alarme fica pendente.';
      });
      query<HTMLButtonElement>(modal, '#test-message').addEventListener('click', () => bubble(pick(LINES.reminder)));
      query<HTMLButtonElement>(modal, '#test-native').addEventListener('click', async () => {
        const result = await scheduleTestReminder(save.dragonName);
        if (result === 'ok') status.textContent = 'Teste agendado: troque de app ou feche o jogo e aguarde 10 segundos.';
        else if (result === 'denied') status.textContent = 'Permissão negada. Ative notificações nas configurações do Android.';
        else {
          bubble(pick(LINES.reminder));
          status.textContent = 'No navegador o teste aparece como balão, sem notificação do sistema.';
        }
      });
      query<HTMLButtonElement>(modal, '#check-pending').addEventListener('click', () => {
        void pendingReminderReport().then((report) => {
          query(modal, '#pending-status').textContent = report;
        });
      });
    },
  );
}

function restartReminderWatcher(): void {
  stopWebReminder();
  stopWebReminder = watchWebReminder(save.settings, (message) => bubble(message), () => playMode);
}

function tick(): void {
  const next = applyElapsed(save);
  if (JSON.stringify(next) !== JSON.stringify(save)) commit(next);
  if (next.phase === 'egg' && next.warmth >= 100) doHatch();
}

async function init(): Promise<void> {
  save = applyElapsed(await loadSave());
  await persistSave(save);
  audio.applySettings(save.settings);
  render();
  restartReminderWatcher();
  void syncNativeNotifications();
  void watchNativeMessages(bubble);

  document.addEventListener('pointerdown', () => audio.start(), { once: true });
  document.addEventListener('keydown', () => audio.start(), { once: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) tick();
  });
  window.setInterval(tick, 60_000);

  el<HTMLButtonElement>('egg').addEventListener('click', () => {
    audio.start();
    audio.sfx('tap');
    const egg = el('egg');
    egg.classList.remove('wobble');
    void egg.offsetWidth;
    egg.classList.add('wobble');
    const next = { ...save, warmth: Math.min(100, save.warmth + 11) };
    commit(next);
    if (next.warmth >= 100) doHatch();
    else bubble(pick(['Está ficando quentinho!', 'Eu sinto que ele está mexendo…', 'Mais um pouco de calor!']));
  });

  el<HTMLButtonElement>('dragon-button').addEventListener('click', () => cuddleAction());
  el<HTMLButtonElement>('cuddle-btn').addEventListener('click', () => cuddleAction());
  el<HTMLButtonElement>('feed-btn').addEventListener('click', () => {
    const now = Date.now();
    if (now - lastFeed < 600 || save.sleeping || save.fruits < 1) return;
    lastFeed = now;
    audio.sfx('feed');
    commit(feed(save, now));
    bubble(pick(LINES.feed));
    particles('🍊', 3);
  });
  el<HTMLButtonElement>('play-btn').addEventListener('click', () => {
    if (save.sleeping) return;
    showMinigame();
  });
  el<HTMLButtonElement>('sleep-btn').addEventListener('click', () => {
    const sleeping = !save.sleeping;
    commit(setSleeping(save, sleeping, Date.now()));
    audio.sfx(sleeping ? 'sleep' : 'play');
    bubble(pick(sleeping ? LINES.sleep : LINES.wake));
  });
  el<HTMLButtonElement>('habitat-btn').addEventListener('click', showHabitat);
  el<HTMLButtonElement>('catalog-btn').addEventListener('click', showCatalog);
  el<HTMLButtonElement>('settings-btn').addEventListener('click', showSettings);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modalRoot.hidden) closeModal();
  });

  if (save.phase === 'egg' && save.warmth >= 100) doHatch();
}

function cuddleAction(): void {
  const now = Date.now();
  if (now - lastCuddle < 1400 || save.sleeping || save.phase !== 'dragon') return;
  lastCuddle = now;
  audio.sfx('cuddle');
  commit(cuddle(save, now));
  bubble(pick(LINES.cuddle));
  particles('💛', 4);
}

void init();
