// Wiring: data layer, story clock, navigation state, and one render loop.
// Every frame renders from clock.time(), so the screen is always the state of that minute.

import { createDataLayer } from "./data/api.js";
import { createClock } from "./clock.js";
import { mountPlayer } from "./views/player.js";
import { createPlantView, defsFor, PLANT_BOUNDS } from "./views/plant.js";
import { createMachineView } from "./views/machine.js";
import { createSensorPanel } from "./views/sensor.js";
import { createAI, irisHTML } from "./views/ai.js";
import { createLogicalView } from "./views/logical.js";
import { createTechOverlay } from "./views/tech-overlay.js";
import { createPaletteEngine, mountPaletteUI } from "./views/palette.js";
import { createMonitorSheet } from "./views/monitor-sheet.js";
import { html, machineState, ease } from "./views/svg.js";

const data = createDataLayer({ source: "generated", seed: 447 });
const params = new URLSearchParams(location.search);
const clock = createClock({ lengthS: 1020, speed: Number(params.get("speed")) || 8 });
if (params.has("t")) clock.seek(Number(params.get("t")));

const $ = (id) => document.getElementById(id);
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const ui = { reducedMotion: motionQuery.matches };
motionQuery.addEventListener("change", (e) => {
  ui.reducedMotion = e.matches;
  document.getElementById("app").classList.toggle("reduce-motion", e.matches);
});
document.getElementById("app").classList.toggle("reduce-motion", ui.reducedMotion);
export const navigation = { level: "plant", view: "physical", machine: null, sensor: null };

defsFor($("defs"));
const plant = createPlantView($("layer-plant"), data, {
  onMachineClick: (code) => {
    if (navigation.view === "logical") setView("physical");
    openMachine(code);
  },
  onHallClick: () => {},
});
const machineView = createMachineView($("layer-machine"), data, {
  onSensorClick: (code, slot) => {
    navigation.level = "sensor";
    navigation.machine = code;
    navigation.sensor = slot;
  },
});
const sensorPanel = createSensorPanel($("sensor-panel"), data, {
  onClose: () => {
    navigation.level = "machine";
    navigation.sensor = null;
  },
});

// Camera: k = 0 shows the plant, k = 1 shows the focused machine.
const camera = { k: 0, from: 0, to: 0, start: 0, machine: null, side: 0, plantSide: 0 };
const ZOOM_MS = 600;
function setCameraTarget(to) {
  if (camera.to === to) return;
  camera.from = camera.k;
  camera.to = to;
  camera.start = performance.now();
}
function stepCamera(now) {
  const dur = ui.reducedMotion ? 1 : ZOOM_MS;
  const p = Math.min(1, (now - camera.start) / dur);
  camera.k = camera.from + (camera.to - camera.from) * ease(p);
  if (camera.k === 0 && camera.to === 0) camera.machine = null;
}
let lastCameraReal = performance.now();
function applyCamera(now) {
  const dt = Math.min(0.1, (now - lastCameraReal) / 1000);
  lastCameraReal = now;
  const glide = ui.reducedMotion ? 1 : Math.min(1, dt * 7);
  const plantLayer = $("layer-plant");
  const k = camera.k;
  if (!camera.machine || k === 0) {
    const want = ai.isOpen() && window.innerWidth >= 1200 ? 1 : 0;
    camera.plantSide += (want - camera.plantSide) * glide;
    const { top: freeTop, bottom: freeBottom } = freeBand();
    const fitInto = (leftPx) => {
      const r = stage.getBoundingClientRect();
      const inv = world.getScreenCTM().inverse();
      const toW = (x, y) => {
        const p = stage.createSVGPoint();
        p.x = r.left + x;
        p.y = r.top + y;
        return p.matrixTransform(inv);
      };
      const a = toW(leftPx, freeTop);
      const b = toW(r.width - 16, freeBottom);
      const s = Math.min(1.15, (b.x - a.x) / PLANT_BOUNDS.w, (b.y - a.y) / PLANT_BOUNDS.h);
      return { s, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
    };
    const copilotPanel = $("ai-copilot-panel");
    const quiet = fitInto(16);
    const loud = fitInto(copilotPanel && ai.isOpen() ? 410 : 16);
    const p = camera.plantSide;
    const fs = quiet.s + (loud.s - quiet.s) * p;
    const fx = quiet.cx + (loud.cx - quiet.cx) * p;
    const fy = quiet.cy + (loud.cy - quiet.cy) * p;
    const pcx = PLANT_BOUNDS.x + PLANT_BOUNDS.w / 2;
    const pcy = PLANT_BOUNDS.y + PLANT_BOUNDS.h / 2;
    plantLayer.setAttribute("transform", `translate(${fx.toFixed(1)} ${fy.toFixed(1)}) scale(${fs.toFixed(4)}) translate(${-pcx} ${-pcy})`);
    const onScreen = fs * (world.getScreenCTM()?.a || 1);
    const labelK = Math.max(1, 0.95 / onScreen);
    plantLayer.style.setProperty("--k", labelK.toFixed(3));
    plant.setLabelScale(labelK);
    plantLayer.setAttribute("opacity", (1 - logical.progress()).toFixed(3));
    plantLayer.setAttribute("pointer-events", logical.progress() > 0.5 ? "none" : "auto");
    machineView.setVisible(null, 0);
    return;
  }
  const a = plant.machineAnchor(camera.machine);
  const Z = 3.2;
  const tx = a.x + k * (800 - a.x);
  const ty = a.y + k * (470 - a.y);
  plantLayer.setAttribute("transform", `translate(${tx} ${ty}) scale(${1 + k * (Z - 1)}) translate(${-a.x} ${-a.y})`);
  plantLayer.setAttribute("opacity", Math.max(0, 1 - k * 1.4).toFixed(3));
  plantLayer.setAttribute("pointer-events", k > 0.5 ? "none" : "auto");
  machineView.setVisible(camera.machine, Math.max(0, (k - 0.35) / 0.65));

  const want = navigation.level === "sensor" ? -1 : ai.isOpen() && window.innerWidth >= 1200 ? 1 : 0;
  camera.side += (want - camera.side) * glide;

  const r0 = stage.getBoundingClientRect();
  const inv = world.getScreenCTM().inverse();
  const toW = (px, py) => {
    const q = stage.createSVGPoint();
    q.x = r0.left + px;
    q.y = r0.top + py;
    return q.matrixTransform(inv);
  };
  const band = freeBand();
  const panel = $("sensor-panel");
  const panelRect = panel.hidden ? null : panel.getBoundingClientRect();
  const side = camera.side;
  const leftPx = side > 0 && ai.isOpen() ? 410 : 16;
  const rightPx = side < 0 && panelRect ? (r0.width - 16) + (panelRect.left - r0.left - 24 - (r0.width - 16)) * -side : r0.width - 16;
  const L = toW(leftPx, 0).x;
  const R = toW(rightPx, 0).x;
  const T = toW(0, band.top).y;
  const B = toW(0, band.bottom).y;
  const base = 0.75 + 0.25 * k;
  const s = base * Math.min(1, (R - L) / 1386, (B - T) / 600);
  const dx = (L + R) / 2 - 800 + 30 * s;
  const dy = (T + B) / 2 - 470 - 20 * s;
  $("layer-machine").setAttribute("transform", `translate(${(800 + dx).toFixed(1)} ${(470 + dy).toFixed(1)}) scale(${s.toFixed(4)}) translate(-800 -470)`);
}

function freeBand() {
  const r = stage.getBoundingClientRect();
  const top = ($("status-line").getBoundingClientRect().bottom || 80) - r.top + 14;
  const log = $("event-log");
  const logTop = log.hidden ? Infinity : log.getBoundingClientRect().top - r.top - 10;
  const playerTop = $("player").getBoundingClientRect().top - r.top - 10;
  return { top, bottom: Math.min(playerTop, logTop) };
}

// User zoom & pan
const userView = { z: 1, x: 0, y: 0 };
function applyUser() {
  $("user").setAttribute("transform", `translate(${userView.x.toFixed(1)} ${userView.y.toFixed(1)}) scale(${userView.z.toFixed(4)})`);
  const fit = userView.z === 1 && userView.x === 0 && userView.y === 0;
  $("zoom-fit").setAttribute("aria-pressed", String(fit));
  $("zoom-fit").textContent = fit ? "Fit" : `${Math.round(userView.z * 100)}%`;
  $("zoom-fit").setAttribute("aria-label", fit ? "Fitted to the screen" : "Fit to the screen");
}
function resetUser() {
  userView.z = 1;
  userView.x = 0;
  userView.y = 0;
  applyUser();
}
function screenToWorld(clientX, clientY) {
  const p = $("stage").createSVGPoint();
  p.x = clientX;
  p.y = clientY;
  return p.matrixTransform($("world").getScreenCTM().inverse());
}
function zoomAt(clientX, clientY, factor) {
  const z = Math.max(0.5, Math.min(4, userView.z * factor));
  const p = screenToWorld(clientX, clientY);
  userView.x = p.x - (p.x - userView.x) * (z / userView.z);
  userView.y = p.y - (p.y - userView.y) * (z / userView.z);
  userView.z = z;
  applyUser();
}
function zoomCentre(factor) {
  const r = $("stage").getBoundingClientRect();
  zoomAt(r.left + r.width / 2, r.top + r.height / 2, factor);
}
$("zoom-in").addEventListener("click", () => zoomCentre(1.25));
$("zoom-out").addEventListener("click", () => zoomCentre(0.8));
$("zoom-fit").addEventListener("click", resetUser);
$("stage").addEventListener("wheel", (e) => {
  e.preventDefault();
  zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015));
}, { passive: false });

{
  let drag = null;
  const stageEl = $("stage");
  stageEl.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, ux: userView.x, uy: userView.y, moved: false, id: e.pointerId };
  });
  stageEl.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    if (!drag.moved) {
      drag.moved = true;
      window.getSelection()?.removeAllRanges();
      try { stageEl.setPointerCapture(drag.id); } catch { /* capture */ }
      stageEl.classList.add("dragging");
    }
    const k = $("world").getScreenCTM().a;
    userView.x = drag.ux + dx / k;
    userView.y = drag.uy + dy / k;
    applyUser();
  });
  const end = () => {
    if (drag?.moved) stageEl.classList.remove("dragging");
    setTimeout(() => { drag = null; }, 0);
  };
  stageEl.addEventListener("pointerup", end);
  stageEl.addEventListener("pointercancel", end);
  stageEl.addEventListener("click", (e) => {
    if (drag?.moved) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, true);
}
window.addEventListener("keydown", (e) => {
  if (e.target.closest?.("input, textarea")) return;
  if (e.key === "+" || e.key === "=") zoomCentre(1.25);
  else if (e.key === "-") zoomCentre(0.8);
  else if (e.key === "0") resetUser();
});
applyUser();

// Coordinates
const stage = $("stage");
const world = $("world");
function toWorld(layer, x, y) {
  const pt = stage.createSVGPoint();
  pt.x = x;
  pt.y = y;
  const m = world.getCTM().inverse().multiply(layer.getCTM());
  const r = pt.matrixTransform(m);
  return { x: r.x, y: r.y, scale: Math.hypot(m.a, m.b) };
}
function worldToScreen(x, y) {
  const pt = stage.createSVGPoint();
  pt.x = x;
  pt.y = y;
  const r = pt.matrixTransform(world.getScreenCTM());
  const o = $("app").getBoundingClientRect();
  return { x: r.x - o.left, y: r.y - o.top };
}
function anchorFor(nav, machine, component) {
  if (logicalAnchor && navigation.view === "logical") {
    const a = logicalAnchor(machine, component);
    if (a) return a;
  }
  if (camera.machine === machine && camera.k > 0.5) {
    const a = component ? machineView.partAnchor(machine, component) : { x: 800, y: 470, r: 200 };
    const w = toWorld($("layer-machine"), a.x, a.y);
    return { x: w.x, y: w.y, r: a.r * w.scale };
  }
  const a = component ? plant.partAnchor(machine, component) : plant.machineAnchor(machine);
  const w = toWorld($("layer-plant"), a.x, a.y);
  return { x: w.x, y: w.y, r: a.r * w.scale };
}
const logical = createLogicalView($("layer-logical"), data, {
  plantAnchor: (code) => {
    const a = plant.machineAnchor(code);
    return toWorld($("layer-plant"), a.x, a.y);
  },
  onMachineClick: (code) => {
    setView("physical");
    openMachine(code);
  },
  onSensorClick: (code, slot) => {
    setView("physical");
    openMachine(code);
    navigation.level = "sensor";
    navigation.sensor = slot;
  },
});
const logicalAnchor = (machine, component) => {
  const a = logical.anchor(machine, component);
  if (!a) return null;
  const w = toWorld($("layer-logical"), a.x, a.y);
  return { x: w.x, y: w.y, r: a.r * w.scale, w: a.w * w.scale, h: a.h * w.scale };
};

function setView(v) {
  navigation.view = v;
  $("view-physical").classList.toggle("is-on", v === "physical");
  $("view-logical").classList.toggle("is-on", v === "logical");
  $("view-physical").setAttribute("aria-pressed", String(v === "physical"));
  $("view-logical").setAttribute("aria-pressed", String(v === "logical"));
  if (v === "logical" && navigation.level !== "plant") goPlant();
  logical.show(v === "logical");
  resetUser();
}
$("view-physical").addEventListener("click", () => setView("physical"));
$("view-logical").addEventListener("click", () => setView("logical"));

function frameOf(layer, x0, y0, x1, y1) {
  const a = toWorld(layer, x0, y0);
  const b = toWorld(layer, x1, y1);
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, w: Math.abs(b.x - a.x) / 2, h: Math.abs(b.y - a.y) / 2 };
}
function restAnchor(nav) {
  if (navigation.view === "logical") return frameOf($("layer-logical"), 440, 140, 1570, 800);
  if (camera.machine && camera.k > 0.5) return frameOf($("layer-machine"), 60, 170, 1480, 800);
  return frameOf($("layer-plant"), PLANT_BOUNDS.x + 10, PLANT_BOUNDS.y + 20, PLANT_BOUNDS.x + PLANT_BOUNDS.w - 10, PLANT_BOUNDS.y + PLANT_BOUNDS.h - 10);
}

let chatPaused = false;
const ai = createAI($("layer-ai"), $("ai-layer"), data, {
  anchorFor,
  restAnchor,
  worldToScreen,
  plantCenter: { x: 800, y: 470 },
  onChatStart: () => {
    chatPaused = clock.isPlaying();
    clock.pause();
  },
  onChatEnd: (resume) => {
    if (resume && chatPaused) clock.play();
    chatPaused = false;
  },
});

const aiToggleBtn = $("ai-toggle-btn");
if (aiToggleBtn) {
  aiToggleBtn.addEventListener("click", () => {
    ai.toggle();
    aiToggleBtn.classList.toggle("is-on", ai.isOpen());
    aiToggleBtn.setAttribute("aria-pressed", String(ai.isOpen()));
  });
}

// Palette Studio
const paletteEngine = createPaletteEngine();
const paletteUI = mountPaletteUI($("palette-container"), paletteEngine);
const paletteBtn = $("palette-btn");
if (paletteBtn) {
  paletteBtn.addEventListener("click", () => {
    paletteUI.toggle();
  });
}

// Console Monitor Sheet (Drawer for analytical tables: Machines, PLC Alarms, Anomalies, Live Data, Health, Cycles)
const monitorSheet = createMonitorSheet({
  root: $("monitor-sheet-container"),
  data,
  onNavigateMachine: (code) => {
    if (navigation.view === "logical") setView("physical");
    openMachine(code);
  },
  onNavigateSensor: (code, slot) => {
    if (navigation.view === "logical") setView("physical");
    openMachine(code);
    navigation.level = "sensor";
    navigation.machine = code;
    navigation.sensor = slot;
  },
});

const navItems = document.querySelectorAll(".monitor-nav-item");
for (const btn of navItems) {
  btn.addEventListener("click", () => {
    const sec = btn.dataset.section;
    if (sec === "overview") {
      monitorSheet.close();
    } else {
      monitorSheet.open(sec, navigation.machine);
    }
  });
}

const subtabs = document.querySelectorAll(".machine-subtab");
for (const btn of subtabs) {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    if (tab === "dashboard") {
      monitorSheet.close();
    } else {
      monitorSheet.open(tab, navigation.machine, tab);
    }
  });
}

const alarmCountBtn = $("alarm-count");
if (alarmCountBtn) {
  alarmCountBtn.style.cursor = "pointer";
  alarmCountBtn.addEventListener("click", () => {
    monitorSheet.open("plc-alarms", navigation.machine);
  });
}

const player = mountPlayer($("player"), clock, data.events(), {
  reducedMotion: ui.reducedMotion,
  onMotionChange: (on) => {
    ui.reducedMotion = on;
    $("app").classList.toggle("reduce-motion", on);
  },
  formatTime: (t) => data.clockTime(t),
  onAbout: () => {
    $("about").hidden = !$("about").hidden;
  },
});

// Theme switcher
const THEME_KEY = "mediq-living-plant-theme";
function applyTheme(mode) {
  if (mode === "light" || mode === "dark") document.documentElement.setAttribute("data-theme", mode);
  else document.documentElement.removeAttribute("data-theme");
  for (const m of ["system", "light", "dark"]) {
    $(`theme-${m}`).classList.toggle("is-on", m === mode);
    $(`theme-${m}`).setAttribute("aria-pressed", String(m === mode));
  }
  try {
    localStorage.setItem(THEME_KEY, mode);
  } catch {
    /* storage blocked */
  }
}
let savedTheme = "system";
try {
  savedTheme = localStorage.getItem(THEME_KEY) || "system";
} catch {
  /* storage blocked */
}
applyTheme(["system", "light", "dark"].includes(params.get("theme")) ? params.get("theme") : savedTheme);
for (const m of ["system", "light", "dark"]) $(`theme-${m}`).addEventListener("click", () => applyTheme(m));

function openMachine(code) {
  navigation.level = "machine";
  navigation.machine = code;
  navigation.sensor = null;
  camera.machine = code;
  setCameraTarget(1);
  resetUser();
  const subnav = $("machine-subnav");
  if (subnav) subnav.hidden = false;
}

// Top bar and status (grounded in real GroupRollup and MachineRollup)
function renderStatus(ov, t) {
  const ms = ov.sites[0].areas.flatMap((a) => a.lines.flatMap((l) => l.cells.flatMap((c) => c.machines)));
  const need = ms.filter((m) => machineState(m.rollup).level !== "ok");
  const line = $("status-line");
  const worst = need.map((m) => machineState(m.rollup)).sort((a, b) => rank(b) - rank(a))[0];
  const nAlarms = ov.rollup.active_alarms;
  const nAnomalies = ov.rollup.open_anomalies;
  const alarms = nAlarms === 0 ? "0 alarms" : `${nAlarms} alarm${nAlarms === 1 ? "" : "s"}`;
  const anomalies = nAnomalies === 0 ? "0 anomalies" : `${nAnomalies} anomal${nAnomalies === 1 ? "y" : "ies"}`;

  let parts;
  if (navigation.machine) {
    const curMachine = ms.find((m) => m.code === navigation.machine);
    const watchState = curMachine?.rollup?.watch_state === "watched" ? "Analysis active (watched)" : "Unmanaged (waiting for model files)";
    const ep = data.anomalies(navigation.machine, t).items.find((x) => x.state === "open");
    parts = [
      `${curMachine ? curMachine.name : navigation.machine}`,
      watchState,
      ep ? `Anomaly on ${ep.component} (${ep.severity})` : "Detectors normal",
      alarms,
    ];
  } else if (need.length === 0) {
    parts = [
      `${ov.rollup.online} of ${ms.length} machines running`,
      `${ov.rollup.not_watched || 0} unmanaged`,
      "Deterministic detectors all clear",
      alarms,
    ];
  } else {
    parts = [
      need.length === 1 ? `${need[0].name} needs attention` : `${need.length} machines need attention`,
      alarms,
      anomalies,
      `Active anomaly on ${need[0].name}`,
    ];
  }

  const mk = worst ? (worst.ring && !worst.alarm ? `ring ${worst.level === "critical" ? "critical" : "warning"}` : worst.level) : "ok";
  const text = parts.filter(Boolean);
  const sig = `${mk}|${text.join("|")}`;
  if (line.dataset.sig !== sig) {
    line.dataset.sig = sig;
    line.innerHTML = "";
    if (worst) html("span", { class: `mk ${mk}`, "aria-hidden": "true" }, line);
    text.forEach((p, i) => {
      if (i) html("span", { class: "sep", text: "·", "aria-hidden": "true" }, line);
      html("span", { class: i ? "muted" : "", text: p }, line);
    });
  }

  const count = $("alarm-count");
  const n = ov.rollup.active_alarms;
  const p = ov.rollup.highest_priority;
  const csig = `${n}|${p}`;
  if (count.dataset.sig !== csig) {
    count.dataset.sig = csig;
    count.innerHTML = "";
    count.dataset.quiet = String(n === 0);
    if (n > 0) html("span", { class: `mk ${p}`, "aria-hidden": "true" }, count);
    html("span", { text: n === 0 ? "No alarms" : `${n} alarm${n === 1 ? "" : "s"}` }, count);
  }
}

const RANK = { urgent: 6, critical: 5, high: 4, medium: 3, warning: 2, low: 1, ok: 0 };
const rank = (s) => RANK[s.level] ?? 0;

function renderCrumbs() {
  const c = $("crumbs");
  const m = navigation.machine && data.machines.find((x) => x.code === navigation.machine);
  const sensor = m && navigation.sensor && m.sensors.find((s) => s.slot === navigation.sensor);
  const sig = `${navigation.level}|${navigation.machine}|${navigation.sensor}`;
  if (c.dataset.sig === sig) return;
  c.dataset.sig = sig;
  c.innerHTML = "";
  const parts = [{ label: "Plant", go: () => goPlant() }];
  if (m) parts.push({ label: m.area.name, go: () => goPlant() }, { label: m.name, go: () => openMachine(m.code) });
  if (sensor) parts.push({ label: sensor.name });
  parts.forEach((p, i) => {
    if (i) html("span", { class: "sep", text: "/" }, c);
    if (i === parts.length - 1) html("span", { class: "here", text: p.label }, c);
    else html("button", { type: "button", text: p.label }, c).addEventListener("click", p.go);
  });
}

function goPlant() {
  navigation.level = "plant";
  navigation.machine = null;
  navigation.sensor = null;
  setCameraTarget(0);
  resetUser();
  const subnav = $("machine-subnav");
  if (subnav) subnav.hidden = true;
  if (monitorSheet.isOpen() && ["per-cycle", "baseline"].includes(monitorSheet.getActiveSection())) {
    monitorSheet.close();
  }
}

window.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (techOverlay.isOpen()) return;
  if (paletteUI.isOpen()) {
    paletteUI.close();
    return;
  }
  if (monitorSheet.isOpen()) {
    monitorSheet.close();
    return;
  }
  if (navigation.level === "sensor") {
    navigation.level = "machine";
    navigation.sensor = null;
  } else if (navigation.level === "machine") {
    goPlant();
  }
});

// About box
$("about").innerHTML =
  "<p>This prototype demonstrates the grounded MedIQ predictive maintenance interface, connecting directly to real Console APIs and the read-only AI Assistant service.</p>" +
  "<p>Hydraulic Rig 01 simulates real TimescaleDB telemetry, deterministic detector episodes, and OPC UA device alarms.</p>" +
  "<p>The Copilot follows the real chat contract (POST /chat, claims, verified sources, safety flags, and follow-ups).</p>";

// Clock and event log
function renderClock(t) {
  const s = `${data.clockDate()} · ${data.clockTime(t)}`;
  if ($("clock").textContent !== s) $("clock").textContent = s;
}

let lastLogSig = null;
function renderLog(t) {
  $("event-log").hidden = navigation.view === "logical";
  const rows = data.eventLog(t, 4);
  const sig = rows.map((r) => r.t).join(",");
  if (sig === lastLogSig) return;
  lastLogSig = sig;
  const box = $("event-log");
  box.innerHTML = "";
  const head = html("div", { class: "el-head" }, box);
  html("span", { text: "Event log" }, head);
  html("span", { text: "newest first" }, head);
  if (!rows.length) {
    html("div", { class: "el-empty", text: "No events since 14:00." }, box);
    return;
  }
  for (const r of rows) {
    const row = html("div", { class: "el-row" }, box);
    html("time", { text: r.time }, row);
    if (r.kind === "ai") {
      html("span", { class: "el-mark" }, row).innerHTML = irisHTML("explaining");
    } else {
      html("span", { class: `mk ${r.kind === "warning" ? `ring ${r.priority === "critical" ? "critical" : "warning"}` : r.priority}`, "aria-hidden": "true" }, row);
    }
    html("span", { text: r.text, title: r.text }, row);
  }
}

// Render Loop
function frame(now) {
  requestAnimationFrame(frame);
  try {
    render(now);
  } catch (err) {
    console.error(err);
  }
}

function render(now) {
  const t = clock.time();
  stepCamera(now);
  applyCamera(now);
  const { overview } = plant.update(t, ui);
  logical.update(t, ui);
  if (camera.machine) {
    machineView.update(camera.machine, t, { reducedMotion: ui.reducedMotion, selectedSlot: navigation.sensor });
  }
  if (navigation.level === "sensor") {
    const m = data.machines.find((x) => x.code === navigation.machine);
    const st = data.aiState(t);
    const safety = st.state !== "watching" && st.state !== "looking" ? st.analysis.report.safety_flags[0] : null;
    sensorPanel.show(m, m.sensors.find((s) => s.slot === navigation.sensor), t, safety);
  } else {
    sensorPanel.hide();
  }
  renderStatus(overview, t);
  renderClock(t);
  renderLog(t);
  renderCrumbs();
  ai.update(t, navigation, ui);
  player.update(t);
  techOverlay.updateContext();
  monitorSheet.setTime(t);
  const subnav = $("machine-subnav");
  if (subnav && subnav.hidden !== (navigation.level !== "machine")) {
    subnav.hidden = navigation.level !== "machine";
  }
}

// Deep links
const linkMachine = data.machines.find((x) => x.code === params.get("m"));
if (linkMachine) {
  openMachine(linkMachine.code);
  camera.k = 1;
  camera.from = 1;
  if (linkMachine.sensors.some((x) => x.slot === params.get("s"))) {
    navigation.level = "sensor";
    navigation.sensor = params.get("s");
  }
}
if (params.get("view") === "logical") setView("logical");

const techOverlay = createTechOverlay({
  root: $("tech-overlay"),
  button: $("tech-btn"),
  getNavigation: () => navigation,
  data,
});
if (params.get("tech") === "1") techOverlay.open();

if (params.get("pause") !== "1") clock.play();
requestAnimationFrame(frame);
