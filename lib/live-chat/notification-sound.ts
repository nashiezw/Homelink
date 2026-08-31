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
    const first = audio.createOscillator();
    const second = audio.createOscillator();
    const gain = audio.createGain();
    first.type = "sine";
    second.type = "sine";
    first.frequency.value = 740;
    second.frequency.value = 980;
    gain.gain.setValueAtTime(0.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.055, audio.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.34);
    first.connect(gain);
    second.connect(gain);
    gain.connect(audio.destination);
    first.start(audio.currentTime);
    first.stop(audio.currentTime + 0.18);
    second.start(audio.currentTime + 0.13);
    second.stop(audio.currentTime + 0.34);
    unlocked = true;
  } catch {
    // Browsers can still block audio before user interaction; visual alerts remain available.
  }
}
