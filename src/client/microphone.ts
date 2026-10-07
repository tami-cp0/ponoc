const TARGET_RATE = 16000;

// The room as it sounds, which is what Deepgram transcribes best. Browsers
// default to video-call processing instead.
const AUDIO: MediaTrackConstraints = {
  // ponoc never plays sound, so echo cancellation could only remove speech,
  // such as a video playing on this same device.
  echoCancellation: false,
  // Treats background voices as noise. Deepgram recommends skipping it.
  noiseSuppression: false,
  // Lifts quiet and distant voices.
  autoGainControl: true,
  channelCount: 1,
};

export interface Microphone {
  analyser: AnalyserNode;
  stop: () => void;
}

// Captures the mic as 16 kHz 16-bit PCM chunks, plus an analyser for the visualizer.
export async function openMicrophone(onChunk: (pcm: ArrayBuffer) => void): Promise<Microphone> {
  // Made before the permission prompt, while the click still counts as a user
  // gesture: Safari can keep a context made later suspended.
  const context = new AudioContext();
  let stream: MediaStream | undefined;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO });
    await context.audioWorklet.addModule("/pcm-worklet.js");
  } catch (err) {
    stream?.getTracks().forEach((track) => track.stop());
    void context.close();
    throw err;
  }
  const tracks = stream.getTracks();

  const source = context.createMediaStreamSource(stream);

  const analyser = context.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.85;
  // Keeps normal speech mid-range in the visualizer.
  analyser.minDecibels = -85;
  analyser.maxDecibels = -10;
  source.connect(analyser);

  const worklet = new AudioWorkletNode(context, "pcm-worklet", {
    // Mixes a stereo mic down to mono, so a voice on either side is kept.
    channelCount: 1,
    channelCountMode: "explicit",
    channelInterpretation: "speakers",
    processorOptions: { targetRate: TARGET_RATE },
  });
  worklet.port.onmessage = (e) => onChunk(e.data);
  source.connect(worklet);
  // iOS can suspend the context as the mic starts; no audio would flow until it resumes.
  if (context.state === "suspended") void context.resume();

  return {
    analyser,
    stop: () => {
      tracks.forEach((track) => track.stop());
      void context.close();
    },
  };
}
