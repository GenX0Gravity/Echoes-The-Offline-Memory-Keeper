/**
 * ECHOES – Web Audio Synthesizer Module
 * Generates gothic ambient chimes, candle strikes, and page whispers
 * completely on-device using Web Audio API (zero audio files needed).
 */

import { Storage } from './storage.js';

class SanctuaryAudio {
  constructor() {
    this.ctx = null;
    this.enabled = Storage.getSettings().soundEnabled ?? true;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleSound() {
    this.enabled = !this.enabled;
    Storage.saveSetting('soundEnabled', this.enabled);
    if (this.enabled) {
      this.playChime();
    }
    return this.enabled;
  }

  /**
   * Resonant gothic chime (432Hz harmonic)
   */
  playChime() {
    if (!this.enabled) return;
    try {
      this.ensureContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(432, this.ctx.currentTime); // Golden ratio tuning
      osc.frequency.exponentialRampToValueAtTime(216, this.ctx.currentTime + 1.8);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.8);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 1.8);
    } catch (err) {
      console.warn('[Audio] Could not play chime:', err);
    }
  }

  /**
   * Warm candle strike / light tone
   */
  playCandleStrike() {
    if (!this.enabled) return;
    try {
      this.ensureContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(528, now);
      osc1.frequency.exponentialRampToValueAtTime(264, now + 1.2);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(792, now);
      osc2.frequency.exponentialRampToValueAtTime(396, now + 0.9);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.2);
      osc2.stop(now + 1.2);
    } catch (err) {
      console.warn('[Audio] Could not play candle strike:', err);
    }
  }
}

export const sanctuaryAudio = new SanctuaryAudio();

