// Bottom player: play/pause, scrubber with event marks, speed, reduce motion, restart.

import { html, storyClock, STATUS_COLOR, setText } from "./svg.js";

const PLAY = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.5v11l9-5.5z" fill="currentColor"/></svg>';
const PAUSE = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.5h3v11H3zM8 1.5h3v11H8z" fill="currentColor"/></svg>';
const RESTART = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 2a5 5 0 1 1-4.6 3H1l2.5-3L6 5H4.1A3.4 3.4 0 1 0 7 3.6z" fill="currentColor"/></svg>';

export function mountPlayer(root, clock, events, { reducedMotion, onMotionChange, formatTime, onAbout }) {
  root.innerHTML = "";
  const play = html("button", { class: "pl-btn", type: "button", id: "pl-play", "aria-label": "Play" }, root);
  const time = html("span", { class: "pl-time", "aria-label": "Story time" }, root);
  const track = html("div", { class: "pl-track", role: "slider", tabindex: "0", "aria-label": "Story time", "aria-valuemin": "0", "aria-valuemax": String(clock.lengthS) }, root);
  html("div", { class: "pl-rail" }, track);
  const fill = html("div", { class: "pl-fill" }, track);
  for (const e of events) {
    const m = html("div", { class: "pl-mark", title: `${formatTime(e.t)} ${e.label}` }, track);
    m.style.left = `${(e.t / clock.lengthS) * 100}%`;
    m.style.background = STATUS_COLOR[e.priority] || "var(--ink-2)";
  }
  const knob = html("div", { class: "pl-knob" }, track);
  html("span", { class: "pl-edge", text: formatTime(0) }, track);
  html("span", { class: "pl-edge end", text: formatTime(clock.lengthS) }, track);
  const speeds = html("div", { class: "pl-speed", role: "group", "aria-label": "Speed" }, root);
  for (const s of [1, 8, 30]) {
    const b = html("button", { type: "button", "data-speed": String(s), text: `${s}×` }, speeds);
    b.addEventListener("click", () => clock.setSpeed(s));
  }
  const motion = html("button", { class: "pl-motion", type: "button", "aria-pressed": String(reducedMotion), text: "Reduce motion" }, root);
  const restart = html("button", { class: "pl-btn", type: "button", "aria-label": "Restart" }, root);
  restart.innerHTML = RESTART;
  const badge = html("button", { class: "badge", type: "button", text: "Prototype · generated data" }, root);
  badge.addEventListener("click", onAbout);

  play.addEventListener("click", () => (clock.isPlaying() ? clock.pause() : clock.play()));
  restart.addEventListener("click", () => { clock.seek(0); clock.play(); });
  motion.addEventListener("click", () => {
    const on = motion.getAttribute("aria-pressed") !== "true";
    motion.setAttribute("aria-pressed", String(on));
    onMotionChange(on);
  });

  const seekFromEvent = (ev) => {
    const r = track.getBoundingClientRect();
    clock.seek(((ev.clientX - r.left) / r.width) * clock.lengthS);
  };
  let dragging = false;
  track.addEventListener("pointerdown", (ev) => { dragging = true; track.setPointerCapture(ev.pointerId); seekFromEvent(ev); });
  track.addEventListener("pointermove", (ev) => dragging && seekFromEvent(ev));
  track.addEventListener("pointerup", () => { dragging = false; });
  track.addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowRight") clock.seek(clock.time() + 30);
    if (ev.key === "ArrowLeft") clock.seek(clock.time() - 30);
  });

  let lastPlaying = null;
  return {
    update(t) {
      const k = (t / clock.lengthS) * 100;
      fill.style.width = `${k}%`;
      knob.style.left = `${k}%`;
      setText(time, formatTime(t));
      track.setAttribute("aria-valuenow", String(Math.round(t)));
      const playing = clock.isPlaying();
      if (playing !== lastPlaying) {
        play.innerHTML = playing ? PAUSE : PLAY;
        play.setAttribute("aria-label", playing ? "Pause" : "Play");
        lastPlaying = playing;
      }
      for (const b of speeds.children) b.classList.toggle("is-on", Number(b.dataset.speed) === clock.speed());
    },
  };
}
