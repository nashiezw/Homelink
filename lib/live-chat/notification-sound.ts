let audioContext: AudioContext | null = null;
let unlocked = false;

type BrowserWindow = Window & { webkitAudioContext?: typeof AudioContext };

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || (window as BrowserWindow).webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext ??= new AudioContextClass();
  return audioContext;
}

export function unlockLiveChatNotificationSound() {
  if (unlocked) return;
  try {
    const audio = getAudioContext();
    if (!audio) return;
    void audio.resume().then(() => {
      unlocked = true;
    }).catch(() => {
      unlocked = false;
    });
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    gain.gain.value = 0.0001;
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.01);
    unlocked = true;
  } catch {
    unlocked = false;
  }
}

export function playLiveChatNotificationSound() {
  void playLiveChatNotificationSoundNow();
}

async function playLiveChatNotificationSoundNow() {
  try {
    const audio = getAudioContext();
    if (!audio) return;
    if (audio.state === "suspended") await audio.resume();

    const start = audio.currentTime;
    const master = audio.createGain();
    const compressor = audio.createDynamicsCompressor();
    master.gain.setValueAtTime(0.0001, start);
    master.gain.exponentialRampToValueAtTime(0.16, start + 0.025);
    master.gain.setValueAtTime(0.16, start + 0.42);
    master.gain.exponentialRampToValueAtTime(0.0001, start + 1.05);
    master.connect(compressor);
    compressor.connect(audio.destination);

    [
      { frequency: 740, startOffset: 0, duration: 0.28 },
      { frequency: 980, startOffset: 0.22, duration: 0.32 },
      { frequency: 1240, startOffset: 0.52, duration: 0.34 },
    ].forEach(({ frequency, startOffset, duration }) => {
      const oscillator = audio.createOscillator();
      const noteGain = audio.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      noteGain.gain.setValueAtTime(0.0001, start + startOffset);
      noteGain.gain.exponentialRampToValueAtTime(0.72, start + startOffset + 0.025);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, start + startOffset + duration);
      oscillator.connect(noteGain);
      noteGain.connect(master);
      oscillator.start(start + startOffset);
      oscillator.stop(start + startOffset + duration + 0.04);
    });
    unlocked = true;
  } catch {
    // Browsers can still block audio before user interaction; visual alerts remain available.
  }
}
