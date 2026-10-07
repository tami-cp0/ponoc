// Speech is kept up to about 6.7 kHz and the filter is fully closed by about
// 8.1 kHz. 16 kHz audio can only hold up to 8 kHz, and anything above that
// would fold back down into the speech as noise.
const CUTOFF_HZ = 7400;
const TRANSITION_HZ = 1400;

// Resamples the mic, at whatever rate the hardware runs, to 16-bit PCM at the
// target rate, sent in 100 ms chunks.
class PCMWorklet extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const targetRate = options.processorOptions.targetRate;
    // Input samples per output sample: 3 at 48 kHz, 2.75625 at 44.1 kHz.
    this.step = sampleRate / targetRate;
    // A mic at or below the target rate has nothing above its range to remove.
    this.taps = this.step > 1 ? lowPass(sampleRate) : new Float32Array([1]);
    // The filter's history (the last taps.length input samples) followed by the current block.
    this.work = new Float32Array(this.taps.length + 128);
    // Where the next output sample falls, counted from the start of the current
    // block. It can sit up to one sample before it, in the history.
    this.pos = 0;
    this.batchSize = targetRate / 10;
    this.batch = new Int16Array(this.batchSize);
    this.filled = 0;
  }

  process(inputs) {
    const block = inputs[0]?.[0];
    if (!block) return true;

    const n = this.taps.length;
    if (this.work.length !== n + block.length) {
      const work = new Float32Array(n + block.length);
      work.set(this.work.subarray(0, n));
      this.work = work;
    }
    this.work.set(block, n);

    let pos = this.pos;
    // An output that needs the next block's first sample waits for that block.
    while (pos + 1 < block.length) {
      const i = Math.floor(pos);
      const frac = pos - i;
      let sample = this.filtered(n + i);
      // Between two input samples (any rate that isn't a multiple of the target): blend them.
      if (frac > 0) sample += frac * (this.filtered(n + i + 1) - sample);
      this.push(sample);
      pos += this.step;
    }
    this.pos = pos - block.length;
    this.work.copyWithin(0, block.length, block.length + n);

    return true;
  }

  // The low-passed input at index m of the work buffer.
  filtered(m) {
    const taps = this.taps;
    const work = this.work;
    let sum = 0;
    for (let k = 0; k < taps.length; k++) sum += taps[k] * work[m - k];
    return sum;
  }

  push(sample) {
    const clamped = Math.max(-1, Math.min(1, sample));
    this.batch[this.filled++] = Math.round(clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff);

    if (this.filled === this.batchSize) {
      // Transferring detaches the buffer, so a fresh one takes its place.
      this.port.postMessage(this.batch.buffer, [this.batch.buffer]);
      this.batch = new Int16Array(this.batchSize);
      this.filled = 0;
    }
  }
}

// A windowed-sinc low-pass (Blackman window), made long enough at this input
// rate for its roll-off to fit in TRANSITION_HZ. Scaled so speech keeps its level.
function lowPass(rate) {
  const length = Math.ceil((5.5 * rate) / TRANSITION_HZ) | 1;
  const taps = new Float32Array(length);
  const mid = (length - 1) / 2;
  const fc = CUTOFF_HZ / rate;
  let sum = 0;
  for (let k = 0; k < length; k++) {
    const t = k - mid;
    const sinc = t === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * t) / (Math.PI * t);
    const phase = (2 * Math.PI * k) / (length - 1);
    const blackman = 0.42 - 0.5 * Math.cos(phase) + 0.08 * Math.cos(2 * phase);
    taps[k] = sinc * blackman;
    sum += taps[k];
  }
  for (let k = 0; k < length; k++) taps[k] /= sum;
  return taps;
}

registerProcessor("pcm-worklet", PCMWorklet);
