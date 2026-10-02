class PCMWorklet extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.targetRate = options.processorOptions.targetRate;
    this.ratio = sampleRate / this.targetRate;
    this.carry = 0;
    // Sends 100 ms of audio per message instead of one per render callback (~3 ms).
    this.batch = new Int16Array(this.targetRate / 10);
    this.filled = 0;
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;

    const outLength = Math.floor((channel.length - this.carry) / this.ratio);

    let pos = this.carry;
    for (let i = 0; i < outLength; i++) {
      const sample = channel[Math.floor(pos)];
      const clamped = Math.max(-1, Math.min(1, sample));
      this.batch[this.filled++] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      pos += this.ratio;

      if (this.filled === this.batch.length) {
        this.port.postMessage(this.batch.buffer, [this.batch.buffer]);
        this.batch = new Int16Array(this.batch.length);
        this.filled = 0;
      }
    }
    this.carry = pos - channel.length;

    return true;
  }
}

registerProcessor("pcm-worklet", PCMWorklet);
