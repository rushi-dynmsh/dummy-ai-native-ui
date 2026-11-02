// Plant view: the floor generated from the hierarchy (areas → halls, lines → rows,
// cells → bays), detailed top-down machine drawings, status as light, flow pulses and the
// sweep that marks each checked cycle.

import { el, text, machineState, setText } from "./svg.js";

const FRAME = { x: 70, y: 140, w: 1380, h: 690 };
const GRID = 138; // building-plan grid squares, world units
const DRAWING = { w: 300, h: 190 };

export function layoutPlant(overview) {
  const site = overview.sites[0];
  const areas = site.areas;
  const gap = 40;
  const halls = [];
  if (areas.length === 1) halls.push({ area: areas[0], x: FRAME.x, y: FRAME.y, w: FRAME.w, h: FRAME.h });
  else {
    const leftW = FRAME.w * 0.54;
    halls.push({ area: areas[0], x: FRAME.x, y: FRAME.y, w: leftW - gap / 2, h: FRAME.h });
    const rest = areas.slice(1);
    const h = (FRAME.h - gap * (rest.length - 1)) / rest.length;
    rest.forEach((a, i) => halls.push({ area: a, x: FRAME.x + leftW + gap / 2, y: FRAME.y + i * (h + gap), w: FRAME.w - leftW - gap / 2, h }));
  }
  const rows = [];
  const bays = [];
  const machines = {};
  for (const hall of halls) {
    const inner = { x: hall.x + 22, y: hall.y + 46, w: hall.w - 44, h: hall.h - 64 };
    const lines = hall.area.lines;
    const rowH = inner.h / lines.length;
    lines.forEach((line, li) => {
      const row = { line, x: inner.x, y: inner.y + li * rowH, w: inner.w, h: rowH - 10 };
      rows.push(row);
      const cellW = row.w / line.cells.length;
      line.cells.forEach((cell, ci) => {
        const bay = { cell, x: row.x + ci * cellW + 8, y: row.y + 24, w: cellW - 16, h: row.h - 30 };
        bays.push(bay);
        const n = cell.machines.length;
        cell.machines.forEach((m, mi) => {
          const slotW = bay.w / n;
          const scale = Math.min((slotW - 30) / DRAWING.w, (bay.h - 60) / DRAWING.h, 1.25);
          const cx = bay.x + slotW * (mi + 0.5);
          const cy = bay.y + (bay.h - 34) / 2 + 4;
          machines[m.code] = { cx, cy, scale, w: DRAWING.w * scale, h: DRAWING.h * scale };
        });
      });
    });
  }
  return { halls, rows, bays, machines };
}

// the floor's extent in world units, grid labels included, for fitting it to the free space
export const PLANT_BOUNDS = { x: FRAME.x - 28, y: FRAME.y - 30, w: FRAME.w + 36, h: FRAME.h + 40 };

// ---------------------------------------------------------------------- drawings
// Each drawing is centred on (0, 0) inside DRAWING, and returns its pipes and part anchors.

function body(g, x, y, w, h, r = 6, extra = {}) {
  return el("rect", { x, y, width: w, height: h, rx: r, fill: "url(#g-body)", stroke: "var(--rim)", "stroke-opacity": 0.55, "stroke-width": 1, ...extra }, g);
}

function drawHPU(g) {
  el("rect", { x: -148, y: -90, width: 296, height: 180, rx: 10, fill: "var(--mark)", stroke: "var(--hall-line)", "stroke-width": 1 }, g);
  // reservoir tank with lid, filler cap and sight glass
  body(g, -138, -78, 128, 156, 8);
  el("rect", { x: -130, y: -70, width: 112, height: 140, rx: 5, fill: "none", stroke: "var(--steel)", "stroke-opacity": 0.5 }, g);
  el("circle", { cx: -36, cy: -54, r: 7, fill: "url(#g-body-dark)", stroke: "var(--steel)" }, g);
  el("rect", { x: -112, y: 52, width: 58, height: 9, rx: 4.5, fill: "var(--pipe)", stroke: "var(--steel)" }, g);
  el("rect", { x: -110, y: 54, width: 40, height: 5, rx: 2.5, fill: "var(--oil)", opacity: 0.85 }, g);
  // motor: fan cover, finned body, coupling and pump
  el("circle", { cx: -114, cy: -6, r: 22, fill: "url(#g-body-dark)", stroke: "var(--rim)", "stroke-opacity": 0.4 }, g);
  for (let a = 0; a < 6; a++) el("line", { x1: -114, y1: -6, x2: -114 + 18 * Math.cos(a), y2: -6 + 18 * Math.sin(a), stroke: "var(--steel)", "stroke-width": 1 }, g);
  body(g, -100, -30, 50, 48, 7);
  for (let x = -94; x < -54; x += 6) el("line", { x1: x, y1: -27, x2: x, y2: 15, stroke: "var(--steel)", "stroke-opacity": 0.55 }, g);
  el("rect", { x: -50, y: -12, width: 8, height: 24, fill: "var(--steel)" }, g);
  body(g, -42, -20, 26, 32, 4, { fill: "url(#g-body-dark)" });
  // valve manifold with four solenoids
  body(g, 4, -46, 46, 92, 5);
  for (const [x, y] of [[16, -26], [38, -26], [16, 22], [38, 22]]) {
    el("circle", { cx: x, cy: y, r: 8, fill: "url(#g-body-dark)", stroke: "var(--rim)", "stroke-opacity": 0.4 }, g);
    el("circle", { cx: x, cy: y, r: 2.4, fill: "var(--steel)" }, g);
  }
  // cooler: finned core with a fan
  body(g, 70, -80, 70, 160, 6);
  for (let y = -72; y < 76; y += 5) el("line", { x1: 74, y1: y, x2: 136, y2: y, stroke: "var(--steel)", "stroke-opacity": 0.35 }, g);
  el("circle", { cx: 105, cy: 0, r: 30, fill: "url(#g-body-dark)", stroke: "var(--rim)", "stroke-opacity": 0.5 }, g);
  const fan = el("g", { class: "fan" }, g);
  for (let i = 0; i < 3; i++) el("path", { d: "M105 0 C 112 -8, 118 -22, 105 -26 C 98 -20, 100 -8, 105 0 Z", fill: "var(--body-lo)", transform: `rotate(${i * 120} 105 0)` }, fan);
  el("circle", { cx: 105, cy: 0, r: 4, fill: "var(--steel)" }, g);
  return {
    oil: ["M -16 -4 L 4 -4", "M 50 -32 L 70 -32", "M 105 80 L 105 86 L -74 86 L -74 78", "M -60 -30 L -60 -46 L -44 -46 L -44 -54"],
    water: ["M 140 -52 L 162 -52 L 162 -80", "M 140 52 L 162 52 L 162 80"],
    fan,
    parts: { cooler: [105, 0], main_pump: [-29, -4], reservoir: [-74, 30] },
  };
}

function drawPress(g) {
  el("rect", { x: -148, y: -90, width: 296, height: 180, rx: 10, fill: "var(--mark)", stroke: "var(--hall-line)" }, g);
  body(g, -110, -70, 150, 140, 8);
  body(g, -80, -40, 90, 80, 6, { fill: "url(#g-body-dark)" });
  for (const [x, y] of [[-100, -60], [30, -60], [-100, 60], [30, 60]]) el("circle", { cx: x, cy: y, r: 11, fill: "url(#g-body)", stroke: "var(--rim)", "stroke-opacity": 0.5 }, g);
  el("rect", { x: -60, y: -20, width: 50, height: 40, rx: 4, fill: "none", stroke: "var(--steel)" }, g);
  body(g, 70, -50, 66, 100, 6);
  el("circle", { cx: 103, cy: -16, r: 16, fill: "url(#g-body-dark)", stroke: "var(--steel)" }, g);
  for (let x = 78; x < 130; x += 6) el("line", { x1: x, y1: 10, x2: x, y2: 42, stroke: "var(--steel)", "stroke-opacity": 0.5 }, g);
  return { oil: ["M 70 -20 L 40 -20", "M 70 20 L 40 20"], water: [], parts: { ram: [-35, 0], power_pack: [103, 0] } };
}

function drawCompressor(g) {
  el("rect", { x: -148, y: -90, width: 296, height: 180, rx: 10, fill: "var(--mark)", stroke: "var(--hall-line)" }, g);
  body(g, -130, -10, 260, 80, 40);
  el("line", { x1: -95, y1: -6, x2: -95, y2: 66, stroke: "var(--steel)", "stroke-opacity": 0.5 }, g);
  el("line", { x1: 95, y1: -6, x2: 95, y2: 66, stroke: "var(--steel)", "stroke-opacity": 0.5 }, g);
  body(g, -70, -78, 90, 62, 6, { fill: "url(#g-body-dark)" });
  for (let x = -62; x < 14; x += 7) el("line", { x1: x, y1: -72, x2: x, y2: -22, stroke: "var(--steel)", "stroke-opacity": 0.5 }, g);
  body(g, 30, -74, 60, 54, 8);
  el("circle", { cx: 60, cy: -47, r: 17, fill: "url(#g-body-dark)", stroke: "var(--steel)" }, g);
  return { oil: [], air: ["M -25 -16 L -25 -6", "M 110 30 L 140 30 L 140 -30"], water: [], parts: { air_end: [-25, -47], receiver: [0, 30] } };
}

const DRAWERS = { HydraulicPowerUnit: drawHPU, HydraulicPress: drawPress, AirCompressor: drawCompressor };

export function defsFor(defs) {
  const lin = (id, a, b) => {
    // colours come from theme tokens, so both themes share one set of gradients
    const g = el("linearGradient", { id, x1: 0, y1: 0, x2: 0.4, y2: 1 }, defs);
    el("stop", { offset: 0, style: `stop-color:var(${a})` }, g);
    el("stop", { offset: 1, style: `stop-color:var(${b})` }, g);
  };
  lin("g-body", "--body-hi", "--body-lo");
  lin("g-body-dark", "--body-dark-hi", "--body-dark-lo");
  for (const k of ["critical", "high", "medium", "low", "ai"]) {
    const r = el("radialGradient", { id: `glow-${k}` }, defs);
    el("stop", { offset: 0, style: `stop-color:var(--${k});stop-opacity:0.6` }, r);
    el("stop", { offset: 0.45, style: `stop-color:var(--${k});stop-opacity:0.22` }, r);
    el("stop", { offset: 1, style: `stop-color:var(--${k});stop-opacity:0` }, r);
  }
  const f = el("filter", { id: "f-shadow", x: "-30%", y: "-30%", width: "160%", height: "160%" }, defs);
  el("feDropShadow", { dx: 0, dy: 6, stdDeviation: 6, style: "flood-color:var(--shadow);flood-opacity:1" }, f);
  const s = el("filter", { id: "f-soft", x: "-50%", y: "-50%", width: "200%", height: "200%" }, defs);
  el("feGaussianBlur", { stdDeviation: 6 }, s);
}

// ---------------------------------------------------------------------- view

export function createPlantView(layer, data, { onMachineClick, onHallClick }) {
  const overview0 = data.overview(0);
  const layout = layoutPlant(overview0);
  const nodes = {};

  // building-plan grid: column letters along the top, row numbers down the left
  const floor = el("g", {}, layer);
  const cols = Math.ceil(FRAME.w / GRID);
  const rows = Math.ceil(FRAME.h / GRID);
  for (let i = 0; i <= cols; i++) {
    const x = FRAME.x + i * GRID;
    el("line", { x1: x, y1: FRAME.y - 6, x2: x, y2: FRAME.y + FRAME.h + 6, stroke: "var(--grid)", "stroke-width": 1 }, floor);
    if (i < cols) text(floor, x + GRID / 2, FRAME.y - 14, String.fromCharCode(65 + i), "t-grid", { "text-anchor": "middle" });
  }
  for (let j = 0; j <= rows; j++) {
    const y = FRAME.y + j * GRID;
    if (y > FRAME.y + FRAME.h + 6) break;
    el("line", { x1: FRAME.x - 6, y1: y, x2: FRAME.x + FRAME.w + 6, y2: y, stroke: "var(--grid)", "stroke-width": 1 }, floor);
    if (j < rows) text(floor, FRAME.x - 16, y + GRID / 2 + 4, String(j + 1), "t-grid", { "text-anchor": "middle" });
  }
  for (const hall of layout.halls) {
    const g = el("g", {}, floor);
    el("rect", { x: hall.x, y: hall.y, width: hall.w, height: hall.h, rx: 3, fill: "var(--hall)", stroke: "var(--hall-line)", "stroke-width": 1.4 }, g);
    text(g, hall.x + 16, hall.y + 26, hall.area.name, "t-hall");
  }
  // aisles: dashed markings in the walkways between halls
  for (const a of layout.halls) for (const b of layout.halls) {
    if (b.x > a.x + a.w && b === layout.halls[1]) {
      const x = (a.x + a.w + b.x) / 2;
      el("line", { x1: x, y1: FRAME.y - 4, x2: x, y2: FRAME.y + FRAME.h + 4, stroke: "var(--aisle)", "stroke-width": 2, "stroke-dasharray": "14 10" }, floor);
    } else if (Math.abs(a.x - b.x) < 1 && b.y > a.y + a.h) {
      const y = (a.y + a.h + b.y) / 2;
      el("line", { x1: a.x - 10, y1: y, x2: a.x + a.w + 10, y2: y, stroke: "var(--aisle)", "stroke-width": 2, "stroke-dasharray": "14 10" }, floor);
    }
  }
  for (const row of layout.rows) text(floor, row.x + 4, row.y + 14, row.line.name, "t-row");
  for (const bay of layout.bays) {
    el("rect", { x: bay.x, y: bay.y, width: bay.w, height: bay.h, rx: 2, fill: "none", stroke: "var(--hall-line)", "stroke-dasharray": "3 5" }, floor);
    text(floor, bay.x + 12, bay.y + 18, bay.cell.name, "t-row");
  }

  // machines
  for (const m of data.machines) {
    const pos = layout.machines[m.code];
    const g = el("g", { class: "clickable", "data-machine": m.code, tabindex: 0, role: "button", "aria-label": `Open ${m.name}` }, layer);
    const glow = el("ellipse", { cx: pos.cx, cy: pos.cy + 6, rx: pos.w * 0.8, ry: pos.h * 0.75, fill: "url(#glow-critical)", opacity: 0 }, g);
    const ring = el("rect", { x: pos.cx - pos.w / 2 - 12, y: pos.cy - pos.h / 2 - 12, width: pos.w + 24, height: pos.h + 24, rx: 3, fill: "none", "stroke-width": 2, "stroke-dasharray": "7 6", opacity: 0 }, g);
    el("rect", { class: "hover-ring", x: pos.cx - pos.w / 2 - 6, y: pos.cy - pos.h / 2 - 6, width: pos.w + 12, height: pos.h + 12, rx: 3, fill: "none", stroke: "var(--ink-2)", "stroke-dasharray": "2 3" }, g);
    const inner = el("g", { transform: `translate(${pos.cx} ${pos.cy}) scale(${pos.scale})`, filter: "url(#f-shadow)" }, g);
    const drawing = DRAWERS[m.assetType.name](inner);
    const pipeG = el("g", { transform: `translate(${pos.cx} ${pos.cy}) scale(${pos.scale})` }, g);
    const flows = [];
    for (const [kind, list] of [["oil", drawing.oil || []], ["water", drawing.water || []], ["air", drawing.air || []]]) {
      for (const d of list) {
        el("path", { d, fill: "none", stroke: "var(--pipe)", "stroke-width": 6, "stroke-linecap": "round", "stroke-linejoin": "round" }, pipeG);
        const p = el("path", { d, fill: "none", stroke: kind === "water" ? "var(--water)" : kind === "air" ? "var(--ink-3)" : "var(--oil)", "stroke-width": 2.4, "stroke-linecap": "round", "stroke-dasharray": "1.5 11", opacity: 0.9 }, pipeG);
        flows.push({ p, kind, offset: 0 });
      }
    }
    // label: name, state word, then the real machine code and its grid square
    const gridSq = `${String.fromCharCode(65 + Math.floor((pos.cx - FRAME.x) / GRID))}${Math.floor((pos.cy - FRAME.y) / GRID) + 1}`;
    const label = text(g, pos.cx, pos.cy + pos.h / 2 + 26, m.name, "t-mach", { "text-anchor": "middle" });
    const sub = text(g, pos.cx, pos.cy + pos.h / 2 + 43, "", "t-mach-sub", { "text-anchor": "middle" });
    const code = text(g, pos.cx, pos.cy + pos.h / 2 + 59, `${m.code} · ${gridSq}`, "t-code", { "text-anchor": "middle" });
    g.addEventListener("click", () => onMachineClick(m.code));
    g.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && onMachineClick(m.code));
    nodes[m.code] = { m, pos, glow, ring, flows, fan: drawing.fan, parts: drawing.parts, label, sub, code, gridSq };
  }

  let lastReal = performance.now();
  let labelK = 1;
  return {
    layout,
    // when labels are drawn larger to stay readable, space their lines by the same factor
    setLabelScale(k) {
      if (Math.abs(k - labelK) < 0.01) return;
      labelK = k;
      for (const n of Object.values(nodes)) {
        const base = n.pos.cy + n.pos.h / 2 + 14;
        n.label.setAttribute("y", (base + 13 * k).toFixed(1));
        n.sub.setAttribute("y", (base + 29 * k).toFixed(1));
        n.code.setAttribute("y", (base + 44 * k).toFixed(1));
      }
    },
    machineAnchor(code) {
      const n = nodes[code];
      return { x: n.pos.cx, y: n.pos.cy, r: Math.max(n.pos.w, n.pos.h) / 2 };
    },
    partAnchor(code, part) {
      const n = nodes[code];
      const p = n.parts[part];
      if (!p) return this.machineAnchor(code);
      return { x: n.pos.cx + p[0] * n.pos.scale, y: n.pos.cy + p[1] * n.pos.scale, r: 34 * n.pos.scale };
    },
    update(t, { reducedMotion }) {
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastReal) / 1000);
      lastReal = now;
      const ov = data.overview(t);
      const rollups = {};
      for (const a of ov.sites[0].areas) for (const l of a.lines) for (const c of l.cells) for (const m of c.machines) rollups[m.code] = m.rollup;
      for (const [code, n] of Object.entries(nodes)) {
        const st = machineState(rollups[code]);
        const pulse = reducedMotion ? 0.85 : 0.65 + 0.35 * Math.sin(now / 320);
        if (st.level === "ok") n.glow.setAttribute("opacity", 0);
        else {
          const key = st.level === "critical" || st.level === "urgent" ? "critical" : st.level === "warning" ? "high" : st.level;
          n.glow.setAttribute("fill", `url(#glow-${key})`);
          n.glow.setAttribute("opacity", st.alarm ? pulse : 0.6);
        }
        const sev = rollups[code]?.highest_severity;
        n.ring.setAttribute("opacity", sev ? 0.95 : 0);
        if (sev) n.ring.setAttribute("stroke", sev === "critical" ? "var(--critical)" : "var(--high)");
        setText(n.sub, st.level === "ok" ? "Healthy" : st.word);
        n.sub.setAttribute("fill", st.color || "var(--ink-2)");

        // flow: pulses move at the speed of the machine's flow sensors
        const d = data.dashboard(code, t).latest;
        const v = (slot) => d.find((x) => x.slot === slot)?.value;
        const main = n.m.sensors.find((s) => s.slot === n.m.flowSlot);
        const mainK = main ? v(main.slot) / main.healthy.mean : 1;
        const cool = v("flow.cooling");
        const coolK = cool === undefined ? 1 : Math.max(0.12, Math.min(1, (cool - 9.0) / (10.6 - 9.0)));
        for (const f of n.flows) {
          const k = f.kind === "water" ? coolK : mainK;
          if (!reducedMotion) f.offset -= dt * 34 * k;
          f.p.setAttribute("stroke-dashoffset", f.offset.toFixed(1));
        }
        if (n.fan && !reducedMotion) {
          n.fanAngle = ((n.fanAngle || 0) + dt * 260 * coolK) % 360;
          n.fan.setAttribute("transform", `rotate(${n.fanAngle.toFixed(1)} 105 0)`);
        }

      }
      return { overview: ov, rollups };
    },
  };
}
