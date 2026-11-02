import { test } from "node:test";
import assert from "node:assert/strict";
import { createDataLayer } from "../src/data/api.js";
import { ANALYSES, CHAT } from "../src/data/ai-script.js";

const data = createDataLayer({ source: "generated", seed: 447 });
const RIG = "hydraulic-rig-01";
const machinesOf = (ov) =>
  ov.sites.flatMap((s) => s.areas.flatMap((a) => a.lines.flatMap((l) => l.cells.flatMap((c) => c.machines))));

test("overview at minute 5 is all healthy", () => {
  const ov = data.overview(300);
  assert.equal(ov.rollup.machines, 3);
  assert.equal(ov.rollup.online, 3);
  assert.equal(ov.rollup.active_alarms, 0);
  assert.equal(ov.rollup.open_anomalies, 0);
});

test("overview at minute 13 shows the rig needs attention", () => {
  const ms = machinesOf(data.overview(780));
  const rig = ms.find((m) => m.code === RIG);
  assert.ok(rig.rollup.active_alarms >= 3);
  assert.equal(rig.rollup.open_anomalies, 1);
  assert.equal(rig.rollup.highest_priority, "medium");
  for (const m of ms.filter((x) => x.code !== RIG)) {
    assert.equal(m.rollup.active_alarms, 0);
    assert.equal(m.rollup.open_anomalies, 0);
  }
});

test("RF1: state is a function of time", () => {
  const a = data.overview(800);
  data.overview(300);
  assert.deepEqual(data.overview(800), a);
});

test("active alarms at minute 16.5 include the HIHI escalation", () => {
  const al = data.activeAlarms(RIG, 990).alarms;
  assert.ok(al.some((a) => a.name === "TS3_HIHI" && a.priority === "high" && a.kind === "HIHI"));
  assert.equal(al[0].priority, "high"); // highest first
  for (const a of al) for (const k of ["alarm_id", "name", "message", "priority", "kind", "component", "state", "active", "active_since"]) assert.ok(k in a, k);
});

test("anomalies follow the episode", () => {
  assert.equal(data.anomalies(RIG, 600).items.length, 0);
  const ep = data.anomalies(RIG, 800).items[0];
  assert.equal(ep.component, "cooler");
  assert.equal(ep.state, "open");
  assert.equal(ep.severity, "critical");
});

test("dashboard has 13 sensors for the rig with limits", () => {
  const d = data.dashboard(RIG, 500);
  assert.equal(d.latest.length, 13);
  const inlet = d.latest.find((x) => x.slot === "temperature.cooler_inlet");
  assert.equal(inlet.name, "Cooler inlet temperature");
  assert.equal(inlet.unit, "°C");
  assert.deepEqual(inlet.limits.map((l) => [l.kind, l.value]), [["HI", 43], ["HIHI", 53]]);
  assert.equal(inlet.stale, false);
  assert.ok(Array.isArray(d.timeline.alarms) && Array.isArray(d.timeline.episodes));
});

test("series returns one point per second", () => {
  const s = data.series(RIG, "flow.cooling", 700, 760);
  assert.equal(s.points.length, 61);
  assert.equal(s.points[0].t, 700);
});

test("aiState follows the story", () => {
  assert.equal(data.aiState(300).state, "watching");
  const opened = ANALYSES[0].startS;
  assert.equal(data.aiState(opened + 1).state, "looking");
  assert.equal(data.aiState(opened + ANALYSES[0].durationS + 1).state, "explaining");
  const esc = ANALYSES[ANALYSES.length - 1];
  const late = data.aiState(esc.startS + esc.durationS + 1);
  assert.equal(late.state, "urgent");
  assert.ok(late.analysis.report.safety_flags.length > 0);
  assert.equal(late.machine, RIG);
  assert.equal(late.component, "cooler");
});

test("reports have the AI service answer structure", () => {
  for (const a of ANALYSES) {
    const r = a.report;
    for (const k of ["answer_type", "answer", "claims", "confidence", "machine_id", "data_gaps", "safety_flags", "follow_up_questions"]) assert.ok(k in r, k);
    assert.ok(r.follow_up_questions.length <= 3);
    assert.ok(r.claims.every((c) => c.sources.length > 0));
  }
});

test("chat answers a suggested question and refuses others", () => {
  const q = ANALYSES[1].report.follow_up_questions[0];
  const ans = data.chat(q);
  assert.ok(ans.report.answer.length > 20);
  assert.ok(ans.steps.length > 0);
  assert.ok(Object.keys(CHAT).includes(q));
  assert.equal(data.chat("what is the weather").report.answer, "In this prototype I can answer the suggested questions.");
});

test("live source is not connected", () => {
  assert.throws(() => createDataLayer({ source: "live" }), /Live source not connected yet/);
});

test("clock times are plant time, 14:00 to 14:17", () => {
  assert.equal(data.clockTime(0), "14:00:00");
  assert.equal(data.clockTime(717), "14:11:57");
  assert.equal(data.clockTime(1020), "14:17:00");
  assert.equal(data.clockDate(), "Fri 23 Oct 2026");
});

test("event log is newest first and names what happened", () => {
  const log = data.eventLog(800, 4);
  assert.equal(log.length, 4);
  for (let i = 1; i < log.length; i++) assert.ok(log[i - 1].t >= log[i].t);
  assert.equal(log[0].time, data.clockTime(log[0].t));
  const all = data.eventLog(800, 50);
  assert.ok(all.some((e) => e.text.includes("PS5_LO")));
  assert.ok(all.some((e) => e.kind === "warning" && e.text.includes("Early warning")));
  assert.ok(all.some((e) => e.kind === "ai"));
});

test("RF1: the event log never shows the future", () => {
  assert.deepEqual(data.eventLog(300, 10), []);
  for (const e of data.eventLog(700, 50)) assert.ok(e.t <= 700);
});
