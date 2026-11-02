// Seeded story generator: one value per second for every sensor, the cooler fault from
// minute 10, cycles, checked-cycle events, the early-warning episode, and alarm transitions
// computed from the values against the real limits.

import { MACHINES, STORY } from "./machine.js";

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// How the cooler fault moves each rig sensor: the change at full fault (D) and the curve
// exponent (p), solved from when each sensor should cross its alarm limits:
// D·u(t1)^p = d1 and D·u(t2)^p = d2, with u(t) = (t - 600) / 420.
const u = (t) => (t - STORY.faultStartS) / (STORY.lengthS - STORY.faultStartS);
function twoPoint(d1, t1, d2, t2) {
  const p = Math.log(d1 / d2) / Math.log((t1 - STORY.faultStartS) / (t2 - STORY.faultStartS));
  return { D: d2 / u(t2) ** p, p };
}
function onePoint(d, t, p) {
  return { D: d / u(t) ** p, p };
}

const FAULT = {
  "temperature.cooler_outlet": twoPoint(35 - 31, 720, 45 - 31, 950),
  "temperature.cooler_inlet": twoPoint(43 - 38.5, 770, 53 - 38.5, 955),
  "temperature.oil_a": twoPoint(40 - 36, 790, 50 - 36, 960),
  "temperature.oil_b": twoPoint(46 - 42, 800, 56 - 42, 965),
  "pressure.cooling_a": { ...onePoint(10.0 - 9.6, 715, 1.2), sign: -1 },
  "pressure.cooling_b": { ...onePoint(9.9 - 9.5, 725, 1.2), sign: -1 },
  "flow.cooling": { ...onePoint(10.6 - 10.0, 810, 1.2), sign: -1 },
  "vibration.velocity": onePoint(0.7 - 0.55, 975, 2.5),
};

// In-cycle shape for signals that follow the duty cycle (valve shut, transient, stepped and
// steady load), as a factor of the sensor's spread.
const CYCLE_SHAPED = new Set(["pressure.supply", "pressure.valve_downstream", "power.motor_input", "flow.working", "pressure.main", "flow.oil", "power.motor_input"]);
function cycleShape(t) {
  const s = t % STORY.cycleS;
  if (s < 5) return -1.2;
  if (s < 15) return -1.2 + (2.2 * (s - 5)) / 10;
  if (s < 35) return 1.0 - 0.3 * Math.floor((s - 15) / 5);
  return 0.4;
}

function sensorSeries(machine, sensor, rand) {
  const { mean, spread } = sensor.healthy;
  const phaseA = rand() * Math.PI * 2;
  const phaseB = rand() * Math.PI * 2;
  const fault = machine.illustrative ? null : FAULT[sensor.slot];
  const out = new Array(STORY.lengthS + 1);
  for (let t = 0; t <= STORY.lengthS; t++) {
    const wander = 0.5 * Math.sin(t / 97 + phaseA) + 0.3 * Math.sin(t / 23 + phaseB);
    const noise = (rand() - 0.5) * 0.5;
    const shape = CYCLE_SHAPED.has(sensor.slot) ? 0.9 * cycleShape(t) : 0;
    let v = mean + spread * (0.5 * wander + noise + shape);
    if (fault && t > STORY.faultStartS) v += (fault.sign ?? 1) * fault.D * u(t) ** fault.p;
    out[t] = Math.round(v * 1000) / 1000;
  }
  return out;
}

function alarmTransitions(machine, values) {
  const out = [];
  for (const al of machine.alarms) {
    const series = values[al.slot];
    const low = al.kind.startsWith("LO");
    const past = (v) => (low ? v < al.limit : v > al.limit);
    const back = (v) => (low ? v > al.limit + al.hysteresis * 0.1 : v < al.limit - al.hysteresis);
    let since = null;
    let open = null;
    for (let t = 0; t <= STORY.lengthS; t++) {
      const v = series[t];
      if (!open) {
        since = past(v) ? (since ?? t) : null;
        if (since !== null && t - since >= al.onDelayS) {
          open = { machine: machine.code, alarmName: al.name, raisedS: t, clearedS: null };
          out.push(open);
        }
      } else if (back(v)) {
        open.clearedS = t;
        open = null;
        since = null;
      }
    }
  }
  return out.sort((a, b) => a.raisedS - b.raisedS);
}

export function generateStory(seed) {
  const rand = mulberry32(seed);
  const values = {};
  const cycles = {};
  const checkedCycles = [];
  let transitions = [];
  for (const m of MACHINES) {
    values[m.code] = {};
    for (const s of m.sensors) values[m.code][s.slot] = sensorSeries(m, s, rand);
    cycles[m.code] = [];
    const offset = m.illustrative ? 20 + Math.floor(rand() * 20) : 0;
    for (let i = 0; i * STORY.cycleS + STORY.cycleS + offset <= STORY.lengthS || i < 17; i++) {
      const startS = i * STORY.cycleS + offset;
      const endS = startS + STORY.cycleS;
      if (endS > STORY.lengthS) break;
      cycles[m.code].push({ number: STORY.firstCycleNumber + i, startS, endS, complete: true });
      checkedCycles.push({ machine: m.code, cycleNumber: STORY.firstCycleNumber + i, atS: endS + 5 });
    }
    transitions = transitions.concat(alarmTransitions(m, values[m.code]));
  }
  checkedCycles.sort((a, b) => a.atS - b.atS);

  // The early warning opens at the first checked rig cycle after the fault starts,
  // and turns critical at the checked cycle where the cooler drift passes half of its range.
  const rigChecks = checkedCycles.filter((c) => c.machine === MACHINES[0].code);
  const openedS = rigChecks.find((c) => c.atS > STORY.faultStartS + 30).atS;
  const criticalS = rigChecks.find((c) => c.atS > 780).atS;
  const episode = {
    episodeId: "ep-1",
    machine: MACHINES[0].code,
    component: "cooler",
    kind: "machine_fault",
    openedS,
    criticalS,
  };
  // Not enumerable, so two stories compare equal on their data.
  Object.defineProperty(episode, "severityAt", {
    value: (t) => (t < openedS ? null : t < criticalS ? "warning" : "critical"),
  });

  return { values, cycles, alarmTransitions: transitions, episode, checkedCycles };
}
