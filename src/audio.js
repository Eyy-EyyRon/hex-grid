const cache = {};

function getAudio(src) {
  if (!cache[src]) {
    cache[src] = new Audio(src);
    cache[src].preload = "auto";
  }
  return cache[src];
}

export function playSound(name, volume = 0.3) {
  try {
    const audio = getAudio(`/${name}`);
    audio.volume = Math.min(Math.max(volume, 0), 1);
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch (_) {}
}
