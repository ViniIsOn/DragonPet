/**
 * All music and sound effects are generated at runtime with the Web Audio API.
 * There are no audio files, no samples and no third-party audio licenses.
 */
type SfxName = 'tap' | 'feed' | 'cuddle' | 'play' | 'catch' | 'sleep' | 'hatch' | 'upgrade' | 'reward';

export interface AudioSettings {
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
}

const MELODY = [261.63, 293.66, 329.63, 392.0, 440.0, 392.0, 329.63, 293.66];

export class GameAudio {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private timer: number | null = null;
  private step = 0;
  private settings: AudioSettings = { musicVolume: 0.4, sfxVolume: 0.7, muted: false };

  /** Must be called from a user gesture (browser autoplay policy). */
  start(): void {
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);
      this.applySettings(this.settings);
    }
    void this.ctx.resume();
    if (this.timer === null) {
      this.scheduleBar();
      this.timer = window.setInterval(() => this.scheduleBar(), 4400);
    }
  }

  applySettings(settings: AudioSettings): void {
    this.settings = settings;
    if (!this.ctx || !this.musicGain || !this.sfxGain) return;
    const master = settings.muted ? 0 : 1;
    this.musicGain.gain.value = settings.musicVolume * 0.16 * master;
    this.sfxGain.gain.value = settings.sfxVolume * 0.5 * master;
  }

  private tone(frequency: number, duration: number, volume: number, when: number, type: OscillatorType = 'sine', target?: GainNode): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, when);
    env.gain.setValueAtTime(0.0001, when);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), when + 0.05);
    env.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(env);
    env.connect(target ?? this.sfxGain ?? this.ctx.destination);
    osc.start(when);
    osc.stop(when + duration + 0.05);
  }

  private glide(from: number, to: number, duration: number, volume: number, when: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(from, when);
    osc.frequency.exponentialRampToValueAtTime(to, when + duration);
    env.gain.setValueAtTime(0.0001, when);
    env.gain.exponentialRampToValueAtTime(volume, when + 0.03);
    env.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(env);
    env.connect(this.sfxGain ?? this.ctx.destination);
    osc.start(when);
    osc.stop(when + duration + 0.05);
  }

  /** A slow, quiet pentatonic loop with a soft pad; one bar every 4.4 seconds. */
  private scheduleBar(): void {
    if (!this.ctx || !this.musicGain || this.settings.musicVolume === 0 || this.settings.muted) return;
    const base = this.ctx.currentTime + 0.08;
    for (let i = 0; i < 4; i += 1) {
      const note = MELODY[this.step % MELODY.length];
      this.tone(note, 1.9, 0.34, base + i * 1.05, 'sine', this.musicGain);
      this.step += 1;
    }
    if (this.step % 8 === 0) {
      this.tone(130.81, 4.1, 0.16, base, 'triangle', this.musicGain);
      this.tone(196.0, 4.1, 0.12, base, 'triangle', this.musicGain);
    }
  }

  sfx(name: SfxName): void {
    if (!this.ctx || this.settings.muted || this.settings.sfxVolume === 0) return;
    const t = this.ctx.currentTime + 0.01;
    switch (name) {
      case 'tap':
        this.glide(520, 700, 0.12, 0.22, t);
        break;
      case 'feed':
        this.glide(430, 620, 0.13, 0.3, t);
        this.glide(600, 820, 0.12, 0.22, t + 0.11);
        this.glide(760, 540, 0.16, 0.18, t + 0.24);
        break;
      case 'cuddle':
        this.tone(330, 0.45, 0.24, t, 'sine');
        this.tone(392, 0.5, 0.18, t + 0.12, 'sine');
        break;
      case 'play':
        this.tone(523.25, 0.22, 0.24, t);
        this.tone(659.25, 0.22, 0.24, t + 0.1);
        this.tone(783.99, 0.35, 0.24, t + 0.2);
        break;
      case 'catch':
        this.glide(640 + Math.random() * 160, 1000, 0.14, 0.24, t);
        break;
      case 'sleep':
        this.glide(440, 220, 0.6, 0.2, t);
        break;
      case 'hatch':
        [392, 523.25, 659.25, 783.99].forEach((note, i) => this.tone(note, 0.6, 0.28, t + i * 0.13));
        break;
      case 'upgrade':
        [523.25, 659.25, 880].forEach((note, i) => this.tone(note, 0.5, 0.26, t + i * 0.12, 'triangle'));
        break;
      case 'reward':
        this.tone(659.25, 0.3, 0.24, t);
        this.tone(880, 0.5, 0.24, t + 0.14);
        break;
    }
  }
}
