// Machine view: the machine as a side-view process drawing, its oil and cooling loops
// flowing, and each sensor as a pin with its live value at its place on the machine.

import { el, text, formatValue, STATUS_COLOR, setText } from "./svg.js";

const PRIORITY_RANK = { urgent: 4, high: 3, medium: 2, low: 1 };

// Rig layout (world units 1600 × 900). Pins: point on the machine, then label offset.
const RIG_PINS = {
  "power.motor_input": [385, 418, -155, -118],
  "vibration.velocity": [500, 436, -70, -231],
  "pressure.supply": [575, 470, 65, -265],
  "flow.working": [650, 470, -50, -140],
  "pressure.valve_downstream": [860, 420, -10, -190],
  "temperature.cooler_inlet": [950, 420, 30, -120],
  "pressure.cooling_a": [1250, 350, -100, -120],
  "flow.cooling": [1330, 470, 40, -10],
  "pressure.cooling_b": [1250, 590, 110, 60],
  "pressure.throttle": [760, 520, -10, 120],
  "temperature.cooler_outlet": [950, 600, 30, 120],
  "temperature.oil_a": [340, 650, -170, 80],
  "temperature.oil_b": [560, 650, 60, 90],
};
const RIG_PARTS = { cooler: [1100, 470], main_pump: [505, 470], reservoir: [440, 620], valve: [750, 450] };

function body(g, x, y, w, h, r = 8, extra = {}) {
  return el("rect", { x, y, width: w, height: h, rx: r, fill: "url(#g-body)", stroke: "var(--rim)", "stroke-opacity": 0.5, ...extra }, g);
}

function drawRig(g) {
  const glow = {};
  for (const [k, [x, y]] of Object.entries(RIG_PARTS)) glow[k] = el("ellipse", { cx: x, cy: y, rx: 220, ry: 200, fill: "url(#glow-critical)", opacity: 0 }, g);
  el("rect", { x: 220, y: 720, width: 1180, height: 16, rx: 2, fill: "var(--mark)" }, g);
  const parts = el("g", { filter: "url(#f-shadow)" }, g);
  // reservoir with oil inside
  body(parts, 260, 520, 360, 200, 12);
  el("rect", { x: 272, y: 590, width: 336, height: 118, rx: 8, fill: "var(--oil)", opacity: 0.14 }, parts);
  el("line", { x1: 272, y1: 590, x2: 608, y2: 590, stroke: "var(--oil)", "stroke-opacity": 0.55, "stroke-dasharray": "6 6" }, parts);
  // motor and pump on the tank
  body(parts, 300, 420, 170, 92, 14);
  for (let x = 312; x < 460; x += 9) el("line", { x1: x, y1: 428, x2: x, y2: 504, stroke: "var(--steel)", "stroke-opacity": 0.5 }, parts);
  el("rect", { x: 470, y: 452, width: 16, height: 36, fill: "var(--steel)" }, parts);
  body(parts, 486, 436, 60, 68, 8, { fill: "url(#g-body-dark)" });
  // valve block with solenoids
  body(parts, 700, 380, 104, 140, 8);
  for (const [x, y] of [[724, 410], [780, 410], [724, 490], [780, 490]]) el("circle", { cx: x, cy: y, r: 13, fill: "url(#g-body-dark)", stroke: "var(--rim)", "stroke-opacity": 0.4 }, parts);
  // cooler: finned core and fan
  body(parts, 1000, 300, 200, 340, 10);
  for (let x = 1012; x < 1192; x += 7) el("line", { x1: x, y1: 312, x2: x, y2: 628, stroke: "var(--steel)", "stroke-opacity": 0.4 }, parts);
  el("circle", { cx: 1100, cy: 470, r: 72, fill: "url(#g-body-dark)", stroke: "var(--rim)", "stroke-opacity": 0.5 }, parts);
  const fan = el("g", {}, parts);
  for (let i = 0; i < 4; i++) el("path", { d: "M1100 470 C 1118 450, 1130 420, 1100 404 C 1084 420, 1090 448, 1100 470 Z", fill: "var(--body-lo)", transform: `rotate(${i * 90} 1100 470)` }, fan);
  el("circle", { cx: 1100, cy: 470, r: 8, fill: "var(--steel)" }, parts);

  const labels = el("g", {}, g);
  text(labels, 440, 755, "Reservoir", "t-comp", { "text-anchor": "middle" });
  text(labels, 420, 400, "Main pump", "t-comp", { "text-anchor": "middle" });
  text(labels, 752, 365, "Valve block", "t-comp", { "text-anchor": "middle" });
  text(labels, 1100, 285, "Cooler", "t-comp", { "text-anchor": "middle" });
  text(labels, 1330, 240, "Cooling water", "t-row", { "text-anchor": "middle" });
  return {
    oil: ["M 546 470 L 700 470", "M 804 420 L 1000 420", "M 1000 600 L 900 600 L 900 690 L 620 690", "M 560 520 L 560 504"],
    water: ["M 1330 250 L 1330 350 L 1200 350", "M 1200 590 L 1330 590 L 1330 700"],
    fan,
    fanCenter: [1100, 470],
    glow,
    pins: RIG_PINS,
    parts: RIG_PARTS,
  };
}

function drawGeneric(g, m) {
  const glow = {};
  const parts = {};
  const pins = {};
  const n = m.components.length;
  m.components.forEach((c, i) => {
    const x = 380 + i * (840 / n) + 420 / n;
    parts[c.code] = [x, 470];
    glow[c.code] = el("ellipse", { cx: x, cy: 470, rx: 180, ry: 170, fill: "url(#glow-critical)", opacity: 0 }, g);
    body(el("g", { filter: "url(#f-shadow)" }, g), x - 130, 380, 260, 180, 14);
    text(g, x, 360, c.name, "t-comp", { "text-anchor": "middle" });
  });
  m.sensors.forEach((s, i) => {
    const [x] = parts[s.component];
    const k = m.sensors.filter((q) => q.component === s.component).indexOf(s);
    pins[s.slot] = [x - 60 + k * 60, 470 + (k % 2 ? 40 : -40), (k % 2 ? 1 : -1) * 40, k % 2 ? 170 : -170];
  });
  const xs = Object.values(parts).map((p) => p[0]);
  return { oil: xs.length > 1 ? [`M ${xs[0] + 130} 470 L ${xs[1] - 130} 470`] : [], water: [], glow, pins, parts };
}

// Shape + colour: urgent square, high triangle, medium diamond, low circle.
function markerPath(priority, cx, cy, r) {
  if (priority === "high") return `M${cx} ${cy - r} L${cx + r} ${cy + r * 0.8} L${cx - r} ${cy + r * 0.8} Z`;
  if (priority === "medium") return `M${cx} ${cy - r} L${cx + r} ${cy} L${cx} ${cy + r} L${cx - r} ${cy} Z`;
  if (priority === "low") return `M${cx - r} ${cy} A${r} ${r} 0 1 0 ${cx + r} ${cy} A${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
  return `M${cx - r} ${cy - r} H${cx + r} V${cy + r} H${cx - r} Z`;
}

export function createMachineView(layer, data, { onSensorClick }) {
  const views = {};
  for (const m of data.machines) {
    const g = el("g", { "data-view": m.code, opacity: 0, display: "none" }, layer);
    const drawing = m.assetType.name === "HydraulicPowerUnit" ? drawRig(g) : drawGeneric(g, m);
    const flows = [];
    const pipeG = el("g", {}, g);
    for (const [kind, list] of [["oil", drawing.oil], ["water", drawing.water]]) {
      for (const d of list) {
        el("path", { d, fill: "none", stroke: "var(--pipe)", "stroke-width": 14, "stroke-linecap": "round", "stroke-linejoin": "round" }, pipeG);
        const p = el("path", { d, fill: "none", stroke: kind === "water" ? "var(--water)" : "var(--oil)", "stroke-width": 4, "stroke-linecap": "round", "stroke-dasharray": "2 22", opacity: 0.9 }, pipeG);
        flows.push({ p, kind, offset: 0 });
      }
    }
    const pins = {};
    const pinG = el("g", {}, g);
    for (const s of m.sensors) {
      const [x, y, dx, dy] = drawing.pins[s.slot];
      const pg = el("g", { class: "clickable", tabindex: 0, role: "button", "aria-label": `${s.name}, open its trace` }, pinG);
      const lx = x + dx;
      const ly = y + dy;
      el("line", { x1: x, y1: y, x2: lx, y2: ly, stroke: "var(--ink-3)", "stroke-width": 1.2 }, pg);
      const dot = el("circle", { cx: x, cy: y, r: 7, fill: "var(--floor)", stroke: "var(--ink)", "stroke-width": 2.4 }, pg);
      const w = 186;
      const card = el("rect", { x: lx - w / 2, y: ly - 30, width: w, height: 60, rx: 3, fill: "var(--panel)", stroke: "var(--panel-line)" }, pg);
      el("rect", { class: "hover-ring", x: lx - w / 2 - 3, y: ly - 33, width: w + 6, height: 66, rx: 4, fill: "none", stroke: "var(--ink-2)", "stroke-dasharray": "2 3" }, pg);
      text(pg, lx - w / 2 + 14, ly - 9, s.name, "t-pin");
      const val = text(pg, lx - w / 2 + 14, ly + 17, "", "t-pin-v");
      const unit = el("tspan", { class: "t-pin-u", dx: 6 }, val);
      const valNum = el("tspan", {}, val);
      val.insertBefore(valNum, unit);
      const marker = el("path", { d: "", opacity: 0 }, pg);
      pg.addEventListener("click", () => onSensorClick(m.code, s.slot));
      pg.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && onSensorClick(m.code, s.slot));
      pins[s.slot] = { s, dot, card, valNum, unit, marker, x, y, lx, ly };
    }
    views[m.code] = { m, g, drawing, flows, pins };
  }

  let lastReal = performance.now();
  return {
    partAnchor(code, part) {
      const p = views[code].drawing.parts[part] || [800, 470];
      return { x: p[0], y: p[1], r: 120 };
    },
    sensorAnchor(code, slot) {
      const p = views[code].pins[slot];
      return { x: p.lx, y: p.ly };
    },
    setVisible(code, opacity) {
      for (const [c, v] of Object.entries(views)) {
        const on = c === code && opacity > 0.001;
        v.g.setAttribute("display", on ? "inline" : "none");
        if (on) v.g.setAttribute("opacity", opacity.toFixed(3));
      }
    },
    update(code, t, { reducedMotion, selectedSlot }) {
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastReal) / 1000);
      lastReal = now;
      const v = views[code];
      if (!v) return;
      const dash = data.dashboard(code, t).latest;
      const alarms = data.activeAlarms(code, t).alarms;
      const episodes = data.anomalies(code, t).items;
      const value = (slot) => dash.find((x) => x.slot === slot)?.value;
      // component glow: early warning or alarms on the component
      for (const [part, glowEl] of Object.entries(v.drawing.glow)) {
        const al = alarms.filter((a) => a.component === part);
        const ep = episodes.find((e) => e.component === part);
        const top = al[0]?.priority;
        if (!top && !ep) { glowEl.setAttribute("opacity", 0); continue; }
        const key = ep?.severity === "critical" || top === "urgent" ? "critical" : top === "high" ? "high" : top || "high";
        glowEl.setAttribute("fill", `url(#glow-${key})`);
        glowEl.setAttribute("opacity", reducedMotion ? 0.75 : 0.55 + 0.25 * Math.sin(now / 340));
      }
      // pins
      for (const [slot, p] of Object.entries(v.pins)) {
        const val = value(slot);
        setText(p.valNum, formatValue(val));
        setText(p.unit, p.s.unit);
        const al = alarms.filter((a) => a.slot === slot).sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority])[0];
        const color = al ? STATUS_COLOR[al.priority] : null;
        p.dot.setAttribute("stroke", color || (selectedSlot === slot ? "var(--ai)" : "var(--ink)"));
        p.card.setAttribute("stroke", color || (selectedSlot === slot ? "var(--ink)" : "var(--panel-line)"));
        p.card.setAttribute("stroke-width", color || selectedSlot === slot ? 1.6 : 1);
        p.marker.setAttribute("opacity", al ? 1 : 0);
        if (al) {
          p.marker.setAttribute("fill", color);
          p.marker.setAttribute("d", markerPath(al.priority, p.lx + 76, p.ly - 2, 6));
        }
      }
      // flows
      const work = value(v.m.flowSlot);
      const flowSensor = v.m.sensors.find((s) => s.slot === v.m.flowSlot);
      const mainK = work && flowSensor ? work / flowSensor.healthy.mean : 1;
      const cool = value("flow.cooling");
      const coolK = cool === undefined ? 1 : Math.max(0.12, Math.min(1, (cool - 9.0) / (10.6 - 9.0)));
      for (const f of v.flows) {
        if (!reducedMotion) f.offset -= dt * 70 * (f.kind === "water" ? coolK : mainK);
        f.p.setAttribute("stroke-dashoffset", f.offset.toFixed(1));
      }
      if (v.drawing.fan && !reducedMotion) {
        v.fanAngle = ((v.fanAngle || 0) + dt * 200 * coolK) % 360;
        const [cx, cy] = v.drawing.fanCenter;
        v.drawing.fan.setAttribute("transform", `rotate(${v.fanAngle.toFixed(1)} ${cx} ${cy})`);
      }
    },
  };
}
