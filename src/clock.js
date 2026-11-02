// Story clock. Time is computed from real elapsed time × speed at each read, never counted
// per frame, so a throttled or hidden tab stays in step.

export function createClock({ lengthS = 1020, speed = 8, now = () => performance.now() } = {}) {
  let base = 0; // story time at the last anchor
  let anchor = null; // real ms at the last anchor while playing
  let rate = speed;
  const listeners = new Set();

  const clamp = (t) => Math.max(0, Math.min(lengthS, t));
  const raw = () => (anchor === null ? base : base + ((now() - anchor) / 1000) * rate);
  const reanchor = () => {
    base = clamp(raw());
    if (anchor !== null) anchor = now();
  };
  const notify = () => listeners.forEach((fn) => fn(time()));

  function time() {
    const t = raw();
    if (t >= lengthS && anchor !== null) {
      base = lengthS;
      anchor = null;
    }
    return clamp(t);
  }

  return {
    time,
    play() {
      if (time() >= lengthS) base = 0;
      if (anchor === null) anchor = now();
      notify();
    },
    pause() {
      reanchor();
      anchor = null;
      notify();
    },
    isPlaying() {
      time();
      return anchor !== null;
    },
    speed: () => rate,
    setSpeed(n) {
      reanchor();
      rate = n;
      notify();
    },
    seek(t) {
      if (!Number.isFinite(t)) return;
      base = clamp(t);
      if (anchor !== null) anchor = now();
      notify();
    },
    onTick(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    lengthS,
  };
}
