// Web Audio API Synthesizer for instant, satisfying interactive sound effects
class SoundEffects {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  setMuted(mute: boolean) {
    this.isMuted = mute;
  }

  getMuted() {
    return this.isMuted;
  }

  playCorrect() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      // Sweet sweet high pitched double-ding (major chord / fifth interval)
      const now = this.ctx.currentTime;
      osc.type = 'sine';
      
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {
      console.warn("Failed to play correct sound", e);
    }
  }

  playIncorrect() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      // Gentle low buzz downwards
      const now = this.ctx.currentTime;
      osc.type = 'sawtooth';
      
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.2);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {
      console.warn("Failed to play incorrect sound", e);
    }
  }

  playTick() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      const now = this.ctx.currentTime;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);

      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {
      // ignore
    }
  }

  playCountdown() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      const now = this.ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {
      // ignore
    }
  }

  playFinish() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const playTone = (freq: number, startDelay: number, duration: number) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.frequency.setValueAtTime(freq, now + startDelay);
        gain.gain.setValueAtTime(0.1, now + startDelay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + startDelay + duration);
        osc.start(now + startDelay);
        osc.stop(now + startDelay + duration);
      };

      // Nice short victory arpeggio: C5 -> E5 -> G5 -> C6
      playTone(523.25, 0.0, 0.15); // C5
      playTone(659.25, 0.1, 0.15); // E5
      playTone(783.99, 0.2, 0.15); // G5
      playTone(1046.50, 0.3, 0.4); // C6
    } catch (e) {
      console.warn("Failed to play finish sound", e);
    }
  }
}

export const sound = new SoundEffects();
