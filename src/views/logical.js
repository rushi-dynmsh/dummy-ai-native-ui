// Logical view: the same plant as its structure, plant → areas → lines → cells → machines →
// components → sensors, each node lit by its state. Machines glide from their place on the
// floor to their place in the structure, so it reads as the same plant.

import { el, text, formatValue, machineState, STATUS_COLOR, ease, setText } from "./svg.js";

// Columns sit right of the subtitle column, so the structure never needs shrinking.
const COLS = [512, 650, 788, 926, 1072, 1238, 1448];
const TOP = 150;
const BOTTOM = 790;

export function createLogicalView(layer, data, { onMachineClick, onSensorClick, plantAnchor }) {
  const ov = data.overview(0);
  const site = ov.sites[0];
  const nodes = []; // { key, kind, x, y, w, h, g, rect, sub, machine, slot, component }
  const edges = []; // { from, to, path }

  // leaves are sensors; parents are centred over their children
  const sensorList = data.machines.flatMap((m) => m.components.flatMap((c) => m.sensors.filter((s) => s.component === c.code).map((s) => ({ m, c, s }))));
  const step = (BOTTOM - TOP) / Math.max(1, sensorList.length - 1);
  const sensorY = new Map(sensorList.map((x, i) => [`${x.m.code}|${x.s.slot}`, TOP + i * step]));
  const avg = (ys) => ys.reduce((a, b) => a + b, 0) / ys.length;

  const add = (n) => { nodes.push(n); return n; };
  const machineNodes = {};
  const componentNodes = {};
  const machineYs = [];

  const areaNodes = site.areas.map((a) => {
    const lineNodes = a.lines.map((l) => {
      const cellNodes = l.cells.map((c) => {
        const mNodes = c.machines.map((mm) => {
          const m = data.machines.find((x) => x.code === mm.code);
          const compNodes = m.components.map((comp) => {
            const sNodes = m.sensors.filter((s) => s.component === comp.code).map((s) =>
              add({ key: `s|${m.code}|${s.slot}`, kind: "sensor", x: COLS[6], y: sensorY.get(`${m.code}|${s.slot}`), w: 214, h: 20, label: s.name, machine: m.code, slot: s.slot, sensor: s }));
            const n = add({ key: `c|${m.code}|${comp.code}`, kind: "component", x: COLS[5], y: avg(sNodes.map((q) => q.y)), w: 136, h: 30, label: comp.name, machine: m.code, component: comp.code, children: sNodes });
            componentNodes[`${m.code}|${comp.code}`] = n;
            return n;
          });
          const n = add({ key: `m|${m.code}`, kind: "machine", x: COLS[4], y: avg(compNodes.map((q) => q.y)), w: 156, h: 40, label: m.name, machine: m.code, children: compNodes });
          machineNodes[m.code] = n;
          machineYs.push(n.y);
          return n;
        });
        return add({ key: `cell|${c.code}`, kind: "group", x: COLS[3], y: avg(mNodes.map((q) => q.y)), w: 128, h: 30, label: c.name, children: mNodes });
      });
      return add({ key: `line|${l.code}`, kind: "group", x: COLS[2], y: avg(cellNodes.map((q) => q.y)), w: 128, h: 30, label: l.name, children: cellNodes });
    });
    return add({ key: `area|${a.code}`, kind: "group", x: COLS[1], y: avg(lineNodes.map((q) => q.y)), w: 128, h: 30, label: a.name, children: lineNodes });
  });
  const root = add({ key: "site", kind: "group", x: COLS[0], y: avg(areaNodes.map((q) => q.y)), w: 110, h: 34, label: site.name, children: areaNodes });

  // edges first, nodes on top
  const edgeG = el("g", {}, layer);
  for (const n of nodes) for (const c of n.children || []) {
    const x1 = n.x + n.w / 2, x2 = c.x - c.w / 2, mx = (x1 + x2) / 2;
    const path = el("path", { d: `M${x1} ${n.y} C ${mx} ${n.y}, ${mx} ${c.y}, ${x2} ${c.y}`, fill: "none", stroke: "var(--hall-line)", "stroke-width": 1.3 }, edgeG);
    edges.push({ from: n, to: c, path });
  }
  const nodeG = el("g", {}, layer);
  for (const n of nodes) {
    const clickable = n.kind === "machine" || n.kind === "sensor";
    const g = el("g", { class: clickable ? "clickable" : "", transform: `translate(${n.x} ${n.y})`, ...(clickable ? { tabindex: 0, role: "button", "aria-label": `Open ${n.label}` } : {}) }, nodeG);
    n.glow = el("ellipse", { rx: n.w * 0.75, ry: n.h * 1.6, fill: "url(#glow-critical)", opacity: 0 }, g);
    n.rect = el("rect", { x: -n.w / 2, y: -n.h / 2, width: n.w, height: n.h, rx: 3, fill: n.kind === "machine" ? "url(#g-body)" : "var(--panel)", stroke: "var(--panel-line)", "stroke-width": 1.2 }, g);
    if (clickable) el("rect", { class: "hover-ring", x: -n.w / 2 - 3, y: -n.h / 2 - 3, width: n.w + 6, height: n.h + 6, rx: 4, fill: "none", stroke: "var(--ink-2)", "stroke-dasharray": "2 3" }, g);
    const isSensor = n.kind === "sensor";
    n.text = text(g, -n.w / 2 + (isSensor ? 10 : 14), isSensor ? 4 : n.kind === "machine" ? -2 : 4, n.label, isSensor ? "t-node-sub" : "t-node", n.kind === "machine" ? { style: "fill:var(--ink-on-body)" } : {});
    if (n.kind === "machine") n.sub = text(g, -n.w / 2 + 14, 13, "", "t-node-sub", { style: "fill:var(--ink-on-body);opacity:0.7" });
    if (isSensor) n.val = text(g, n.w / 2 - 10, 4, "", "t-node-sub", { "text-anchor": "end", style: "fill:var(--ink)" });
    n.g = g;
    if (n.kind === "machine") { g.addEventListener("click", () => onMachineClick(n.machine)); g.addEventListener("keydown", (e) => e.key === "Enter" && onMachineClick(n.machine)); }
    if (isSensor) { g.addEventListener("click", () => onSensorClick(n.machine, n.slot)); g.addEventListener("keydown", (e) => e.key === "Enter" && onSensorClick(n.machine, n.slot)); }
  }

  const morph = { k: 0, from: 0, to: 0, start: 0 };
  return {
    show(on) {
      const to = on ? 1 : 0;
      if (morph.to === to) return;
      morph.from = morph.k; morph.to = to; morph.start = performance.now();
    },
    progress: () => morph.k,
    anchor(machine, component) {
      const n = component ? componentNodes[`${machine}|${component}`] : machineNodes[machine];
      return n ? { x: n.x, y: n.y, r: 40, w: n.w / 2 + 8, h: n.h / 2 + 8 } : null;
    },
    update(t, { reducedMotion }) {
      const now = performance.now();
      const p = reducedMotion ? 1 : Math.min(1, (now - morph.start) / 800);
      morph.k = morph.from + (morph.to - morph.from) * ease(p);
      const k = morph.k;
      layer.setAttribute("display", k > 0.001 ? "inline" : "none");
      if (k <= 0.001) return;
      edgeG.setAttribute("opacity", Math.max(0, (k - 0.4) / 0.6).toFixed(3));
      // machines glide from the floor to the structure; everything else fades in
      for (const n of nodes) {
        if (n.kind === "machine") {
          const a = plantAnchor(n.machine);
          const x = a.x + (n.x - a.x) * k;
          const y = a.y + (n.y - a.y) * k;
          n.g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
          n.g.setAttribute("opacity", Math.min(1, k * 2).toFixed(3));
        } else n.g.setAttribute("opacity", Math.max(0, (k - 0.35) / 0.65).toFixed(3));
      }
      // states
      const ovT = data.overview(t);
      const roll = {};
      for (const a of ovT.sites[0].areas) for (const l of a.lines) for (const c of l.cells) for (const m of c.machines) roll[m.code] = m.rollup;
      const alarmsBy = {}, epBy = {}, dashBy = {};
      for (const m of data.machines) {
        alarmsBy[m.code] = data.activeAlarms(m.code, t).alarms;
        epBy[m.code] = data.anomalies(m.code, t).items;
        dashBy[m.code] = data.dashboard(m.code, t).latest;
      }
      const light = (n, color, pulse) => {
        n.rect.setAttribute("stroke", color || "var(--panel-line)");
        n.rect.setAttribute("stroke-width", color ? 2 : 1.2);
        n.glow.setAttribute("opacity", color ? (reducedMotion ? 0.55 : pulse) : 0);
        if (color) n.glow.setAttribute("fill", `url(#glow-${color === STATUS_COLOR.high || color === STATUS_COLOR.warning ? "high" : color === STATUS_COLOR.medium ? "medium" : "critical"})`);
      };
      const pulse = 0.4 + 0.2 * Math.sin(now / 330);
      const colorOf = (rollup) => machineState(rollup).color;
      for (const n of nodes) {
        if (n.kind === "sensor") {
          const al = alarmsBy[n.machine].find((a) => a.slot === n.slot);
          setText(n.val, `${formatValue(dashBy[n.machine].find((d) => d.slot === n.slot)?.value)} ${n.sensor.unit}`);
          light(n, al ? STATUS_COLOR[al.priority] : null, pulse);
        } else if (n.kind === "component") {
          const al = alarmsBy[n.machine].filter((a) => a.component === n.component);
          const ep = epBy[n.machine].find((e) => e.component === n.component);
          const color = ep?.severity === "critical" ? STATUS_COLOR.critical : al[0] ? STATUS_COLOR[al[0].priority] : ep ? STATUS_COLOR.warning : null;
          light(n, color, pulse);
        } else if (n.kind === "machine") {
          const st = machineState(roll[n.machine]);
          setText(n.sub, st.word);
          light(n, st.color, pulse);
        } else {
          // groups take the worst state of the machines under them
          const ms = [];
          const walk = (q) => (q.kind === "machine" ? ms.push(q.machine) : (q.children || []).forEach(walk));
          walk(n);
          const states = ms.map((c) => machineState(roll[c])).filter((s) => s.level !== "ok");
          light(n, states[0]?.color || null, pulse);
        }
      }
      for (const e of edges) {
        const c = e.to.rect.getAttribute("stroke");
        const lit = c && c !== "var(--panel-line)";
        e.path.setAttribute("stroke", lit ? c : "var(--hall-line)");
        e.path.setAttribute("stroke-opacity", lit ? 0.75 : 1);
      }
    },
  };
}
