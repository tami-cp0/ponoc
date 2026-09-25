const TARGET_RATE = 16000;

export interface Microphone {
  analyser: AnalyserNode;
  stop: () => void;
}

// Captures the mic as 16 kHz 16-bit PCM chunks (converted in public/pcm-worklet.js),
// plus an analyser for the visualizer.
export async function openMicrophone(onChunk: (pcm: ArrayBuffer) => void): Promise<Microphone> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const context = new AudioContext();
  await context.audioWorklet.addModule("/pcm-worklet.js");

  const source = context.createMediaStreamSource(stream);

  // A side tap on the same source, not connected to the speakers: no latency,
  // no feedback, no second permission prompt.
  const analyser = context.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.85;
  // The browser's auto-gain keeps voices hot. A wider dB window than the default
  // (-100..-30) keeps normal speech mid-range instead of pegging the bars.
  analyser.minDecibels = -85;
  analyser.maxDecibels = -10;
  source.connect(analyser);

  const worklet = new AudioWorkletNode(context, "pcm-worklet", {
    processorOptions: { targetRate: TARGET_RATE },
  });
  worklet.port.onmessage = (e) => onChunk(e.data);
  source.connect(worklet);

  return {
    analyser,
    stop: () => {
      stream.getTracks().forEach((track) => track.stop());
      void context.close();
    },
  };
}
