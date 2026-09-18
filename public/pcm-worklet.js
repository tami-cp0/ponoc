class PCMWorklet extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.targetRate = options.processorOptions.targetRate;
    this.ratio = sampleRate / this.targetRate;
    this.carry = 0;
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;

    const outLength = Math.floor((channel.length - this.carry) / this.ratio);
    const out = new Int16Array(outLength);

    let pos = this.carry;
    for (let i = 0; i < outLength; i++) {
      const sample = channel[Math.floor(pos)];
      const clamped = Math.max(-1, Math.min(1, sample));
      out[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      pos += this.ratio;
    }
    this.carry = pos - channel.length;

    this.port.postMessage(out.buffer, [out.buffer]);
    return true;
  }
}

registerProcessor("pcm-worklet", PCMWorklet);
