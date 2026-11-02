import { test } from "node:test";
import assert from "node:assert/strict";
import { MACHINES } from "../src/data/machine.js";
import { generateStory } from "../src/data/generate.js";

const story = generateStory(447);
const RIG = "hydraulic-rig-01";
const rig = MACHINES.find((m) => m.code === RIG);
const raised = (name) =>
  story.alarmTransitions.find((a) => a.machine === RIG && a.alarmName === name)?.raisedS;

test("same seed gives identical story", () => {
  assert.deepEqual(generateStory(447), story);
});

test("healthy minutes have no alarms", () => {
  const early = story.alarmTransitions.filter((a) => a.raisedS < 600);
  assert.deepEqual(early, []);
});

test("healthy values stay in range", () => {
  for (const s of rig.sensors) {
    const series = story.values[RIG][s.slot];
    assert.equal(series.length, 1021);
    for (let t = 0; t <= 600; t++) {
      const v = series[t];
      const lo = s.healthy.mean - 3 * s.healthy.spread;
      const hi = s.healthy.mean + 3 * s.healthy.spread;
      assert.ok(v >= lo && v <= hi, `${s.slot} at ${t}s = ${v} outside ${lo}..${hi}`);
    }
  }
});

test("first alarms land near minute 12", () => {
  for (const n of ["TS4_HI", "PS5_LO", "PS6_LO"]) {
    const r = raised(n);
    assert.ok(r >= 660 && r <= 780, `${n} raised at ${r}`);
  }
});

test("second wave between minutes 12 and 14", () => {
  for (const n of ["TS1_HI", "TS2_HI", "TS3_HI", "FS2_LO"]) {
    const r = raised(n);
    assert.ok(r >= 720 && r <= 870, `${n} raised at ${r}`);
  }
});

test("escalation near minute 16", () => {
  for (const n of ["TS1_HIHI", "TS2_HIHI", "TS3_HIHI", "TS4_HIHI", "VS1_HI"]) {
    const r = raised(n);
    assert.ok(r >= 900 && r <= 1015, `${n} raised at ${r}`);
  }
});

test("alarms agree with values", () => {
  for (const tr of story.alarmTransitions) {
    const m = MACHINES.find((x) => x.code === tr.machine);
    const al = m.alarms.find((a) => a.name === tr.alarmName);
    const v = story.values[tr.machine][al.slot][tr.raisedS];
    const past = al.kind.startsWith("LO") ? v < al.limit : v > al.limit;
    assert.ok(past, `${tr.alarmName} raised at ${tr.raisedS} with value ${v} vs limit ${al.limit}`);
  }
});

test("illustrative machines stay healthy", () => {
  const other = story.alarmTransitions.filter((a) => a.machine !== RIG);
  assert.deepEqual(other, []);
});

test("early warning opens before the first alarm", () => {
  assert.ok(story.episode.openedS >= 630 && story.episode.openedS <= 680, `opened ${story.episode.openedS}`);
  assert.equal(story.episode.component, "cooler");
  assert.equal(story.episode.severityAt(840), "critical");
  assert.equal(story.episode.severityAt(story.episode.openedS), "warning");
});

test("cycles and checked cycles every minute", () => {
  assert.equal(story.cycles[RIG].length, 17);
  const checked = story.checkedCycles.filter((c) => c.machine === RIG);
  assert.equal(checked.length, 17);
  assert.ok(checked.every((c, i) => c.atS > story.cycles[RIG][i].endS));
});
