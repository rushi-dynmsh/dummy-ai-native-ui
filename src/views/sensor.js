// Sensor view: the last five story minutes of one sensor, its alarm limits, and a short
// note in the AI's voice when the sensor takes part in the current problem.

import { html, formatValue, STATUS_COLOR } from "./svg.js";

const WINDOW_S = 300;

function note(data, machine, sensor, t) {
  if (!sensor.alarmPrefix && sensor.component !== "cooler") return null;
  const s = data.series(machine.code, sensor.slot, t - 240, t).points;
  if (s.length < 30) return null;
  const delta = s[s.length - 1].v - s[0].v;
  const big = Math.abs(delta) > Math.max(3 * sensor.healthy.spread, sensor.healthy.mean * 0.02);
  if (!big) return null;
  const minutes = Math.round((s.length - 1) / 60);
  const dir = delta > 0 ? "Rose" : "Fell";
  const amount = `${formatValue(Math.abs(delta))} ${sensor.unit}`;
  const cool = sensor.slot === "flow.cooling" ? "" : " while cooling flow fell";
  return `${dir} ${amount} in the last ${minutes} minutes${sensor.component === "cooler" || sensor.component === "reservoir" ? cool : ""}.`;
}

export function createSensorPanel(panel, data, { onClose }) {
  let current = null;
  let refs = null;

  function mount(machine, sensor) {
    panel.innerHTML = "";
    const head = html("div", { class: "sp-head" }, panel);
    html("span", { class: "sp-name", text: sensor.name }, head);
    const close = html("button", { class: "sp-close", type: "button", text: "Close" }, head);
    close.addEventListener("click", onClose);
    const value = html("div", { class: "sp-value" }, panel);
    const num = html("span", {}, value);
    html("small", { text: sensor.unit }, value);
    const sub = html("div", { class: "sp-sub" }, panel);
    const chart = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    chart.setAttribute("class", "sp-chart");
    chart.setAttribute("viewBox", "0 0 380 150");
    chart.setAttribute("preserveAspectRatio", "none");
    chart.setAttribute("role", "img");
    chart.setAttribute("aria-label", `${sensor.name}, last 5 minutes`);
    panel.appendChild(chart);
    const noteEl = html("p", { class: "sp-note" }, panel);
    const safetyEl = html("p", { class: "sp-safety" }, panel);
    panel.insertBefore(safetyEl, head.nextSibling);
    safetyEl.hidden = true;
    refs = { num, sub, chart, noteEl, safetyEl, drawn: null };
  }

  return {
    show(machine, sensor, t, safety = null) {
      const key = `${machine.code}|${sensor.slot}`;
      if (current !== key) { current = key; mount(machine, sensor); }
      panel.hidden = false;
      // the safety warning stays visible while MedIQ's subtitle steps back for the trace
      if (refs.safetyEl.textContent !== (safety || "")) refs.safetyEl.textContent = safety || "";
      refs.safetyEl.hidden = !safety;
      const second = `${key}|${Math.floor(t)}`;
      if (refs.drawn === second) return;
      refs.drawn = second;
      const pts = data.series(machine.code, sensor.slot, t - WINDOW_S, t).points;
      const limits = machine.alarms.filter((a) => a.slot === sensor.slot);
      const last = pts[pts.length - 1]?.v;
      refs.num.textContent = formatValue(last);
      const active = data.activeAlarms(machine.code, t).alarms.filter((a) => a.slot === sensor.slot);
      refs.sub.textContent = `${limits.map((l) => `${l.kind} ${l.limit}`).join(" · ") || "No alarm limits"}${active.length ? ` · in alarm: ${active[0].name}` : ""}`;
      // chart scale covers the values and the nearest limits
      const vs = pts.map((p) => p.v);
      const lim = limits.map((l) => l.limit);
      let lo = Math.min(...vs, ...lim.filter((x) => x < Math.max(...vs) + 6 * sensor.healthy.spread));
      let hi = Math.max(...vs, ...lim.filter((x) => x > Math.min(...vs) - 6 * sensor.healthy.spread));
      const pad = (hi - lo) * 0.12 || sensor.healthy.spread;
      lo -= pad; hi += pad;
      const X = (i) => (i / Math.max(1, WINDOW_S)) * 380;
      const Y = (v) => 140 - ((v - lo) / (hi - lo)) * 130;
      const offset = WINDOW_S - (pts.length - 1);
      const d = pts.map((p, i) => `${i ? "L" : "M"}${X(i + offset).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(" ");
      const lineColor = active.length ? STATUS_COLOR[active[0].priority] : "var(--ink)";
      let svg = "";
      for (const l of limits) {
        const y = Y(l.limit);
        if (y < 0 || y > 150) continue;
        const c = STATUS_COLOR[l.priority];
        svg += `<line x1="0" x2="380" y1="${y}" y2="${y}" stroke="${c}" stroke-dasharray="4 4" stroke-opacity="0.8" vector-effect="non-scaling-stroke"/>`;
        svg += `<text x="376" y="${y - 4}" text-anchor="end" fill="${c}" font-size="11" font-family="IBM Plex Sans, sans-serif">${l.kind} ${l.limit}</text>`;
      }
      svg += `<path d="${d} L ${X(WINDOW_S)} 150 L ${X(offset)} 150 Z" fill="${lineColor}" fill-opacity="0.08"/>`;
      svg += `<path d="${d}" fill="none" stroke="${lineColor}" stroke-width="2" vector-effect="non-scaling-stroke"/>`;
      if (pts.length) svg += `<circle cx="${X(WINDOW_S)}" cy="${Y(last)}" r="4" fill="${lineColor}"/>`;
      refs.chart.innerHTML = svg;
      const n = note(data, machine, sensor, t);
      refs.noteEl.textContent = n ?? "";
      refs.noteEl.hidden = !n;
    },
    hide() {
      panel.hidden = true;
      current = null;
    },
  };
}
