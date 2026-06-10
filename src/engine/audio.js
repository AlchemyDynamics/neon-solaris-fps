class SfxEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
    this.engineOsc = null;
    this.engineFilter = null;
    this.engineGain = null;
  }

  init() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.noiseBuffer = this.createNoiseBuffer();
      this.startAmbient();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  createNoiseBuffer() {
    const length = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  blip(freq, dur, { type = "square", vol = 0.25, slide = 0, at = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + at;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noiseBurst(dur, { vol = 0.3, filterFreq = 1800, at = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + at;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(filterFreq, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(120, filterFreq * 0.18), t + dur);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  shoot(kind) {
    if (!this.ctx) return;
    if (kind === "Pistol") {
      this.blip(660, 0.09, { vol: 0.22, slide: 90 });
      this.noiseBurst(0.06, { vol: 0.12, filterFreq: 3200 });
    } else if (kind === "SMG") {
      this.blip(520, 0.05, { vol: 0.15, slide: 160 });
      this.noiseBurst(0.04, { vol: 0.09, filterFreq: 4200 });
    } else if (kind === "Shotgun") {
      this.noiseBurst(0.22, { vol: 0.38, filterFreq: 2400 });
      this.blip(180, 0.16, { type: "sawtooth", vol: 0.22, slide: 50 });
    } else {
      this.blip(150, 0.16, { type: "sine", vol: 0.4, slide: 48 });
      this.noiseBurst(0.1, { vol: 0.14, filterFreq: 900 });
    }
  }

  explosion() {
    this.noiseBurst(0.72, { vol: 0.5, filterFreq: 1100 });
    this.blip(76, 0.6, { type: "sine", vol: 0.5, slide: 28 });
  }

  hit() {
    this.noiseBurst(0.12, { vol: 0.2, filterFreq: 1400 });
    this.blip(210, 0.14, { type: "square", vol: 0.16, slide: 110 });
  }

  reload() {
    this.blip(320, 0.04, { vol: 0.14 });
    this.blip(640, 0.05, { vol: 0.14, at: 0.16 });
  }

  confirm() {
    this.blip(660, 0.12, { type: "sine", vol: 0.2 });
    this.blip(990, 0.2, { type: "sine", vol: 0.2, at: 0.12 });
  }

  enemyDie() {
    this.blip(440, 0.24, { type: "sawtooth", vol: 0.18, slide: 60 });
    this.noiseBurst(0.2, { vol: 0.16, filterFreq: 1600 });
  }

  engine(level, isSkimmer = false) {
    if (!this.ctx) return;
    if (!this.engineOsc) {
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = "sawtooth";
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = "lowpass";
      this.engineFilter.frequency.value = 340;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(this.engineFilter).connect(this.engineGain).connect(this.master);
      this.engineOsc.start();
    }
    const t = this.ctx.currentTime;
    const base = isSkimmer ? 86 : 44;
    this.engineOsc.frequency.setTargetAtTime(base + level * (isSkimmer ? 170 : 95), t, 0.08);
    this.engineGain.gain.setTargetAtTime(0.045 + level * 0.075, t, 0.1);
  }

  engineStop() {
    if (this.engineGain) this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.14);
  }

  startAmbient() {
    const t = this.ctx.currentTime;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(0.034, t, 3);
    filter.connect(gain).connect(this.master);

    for (const freq of [55, 82.4, 110.1]) {
      const osc = this.ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      osc.detune.value = Math.random() * 14 - 7;
      osc.connect(filter);
      osc.start();
    }

    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();
  }
}

export const Sfx = new SfxEngine();
