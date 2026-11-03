import { test } from "node:test";
import assert from "node:assert/strict";
import { createDataLayer } from "../src/data/api.js";
import { PRESETS, hexToRgba, adjustHexBrightness, createPaletteEngine } from "../src/views/palette.js";

const data = createDataLayer({ source: "generated", seed: 447 });
const RIG = "hydraulic-rig-01";
const allMachines = (ov) =>
  ov.sites.flatMap((s) => s.areas.flatMap((a) => a.lines.flatMap((l) => l.cells.flatMap((c) => c.machines))));

test("grounded: machine rollup contains watch_state and watch_reason", () => {
  const ov = data.overview(300);
  const ms = allMachines(ov);
  const rig = ms.find((m) => m.code === RIG);
  assert.equal(rig.rollup.watch_state, "watched");
  assert.equal(rig.rollup.watch_reason, null);

  const illustrative = ms.find((m) => m.code !== RIG);
  assert.equal(illustrative.rollup.watch_state, "not_watched");
  assert.ok(illustrative.rollup.watch_reason.includes("waiting for model files"));
});

test("grounded: group rollup contains not_watched and stalled counts", () => {
  const ov = data.overview(300);
  assert.equal(typeof ov.rollup.not_watched, "number");
  assert.equal(typeof ov.rollup.stalled, "number");
  assert.equal(ov.rollup.not_watched, 2); // 2 illustrative machines
  assert.equal(ov.rollup.stalled, 0);
});

test("grounded: dashboard latest channels include range_low and range_high", () => {
  const d = data.dashboard(RIG, 500);
  const coolerTemp = d.latest.find((x) => x.slot === "temperature.cooler_inlet");
  assert.ok(coolerTemp.range_low !== null && coolerTemp.range_low !== undefined);
  assert.ok(coolerTemp.range_high !== null && coolerTemp.range_high !== undefined);
  assert.ok(coolerTemp.range_low < coolerTemp.range_high);
  assert.equal(coolerTemp.range_low, 38.5 - 2 * 0.5); // mean - 2*spread
  assert.equal(coolerTemp.range_high, 38.5 + 2 * 0.5);
});

test("grounded: cycles returns real cycle list matching Console API", () => {
  const c = data.cycles(RIG, 360);
  assert.ok(c.items.length >= 5);
  const first = c.items[0];
  assert.equal(first.complete, true);
  assert.equal(first.has_features, true);
  assert.equal(first.duration_s, 60.0);
  assert.ok(first.start_ts && first.end_ts);
});

test("grounded: overviewAnomalies lists active episodes across plant", () => {
  assert.equal(data.overviewAnomalies(300).items.length, 0);
  const an = data.overviewAnomalies(800);
  assert.ok(an.items.length >= 1);
  assert.equal(an.items[0].machine, RIG);
  assert.equal(an.items[0].component, "cooler");
});

test("grounded: overviewAlarms lists active alarms across plant", () => {
  assert.equal(data.overviewAlarms(300).items.length, 0);
  const al = data.overviewAlarms(990);
  assert.ok(al.items.length >= 1);
  assert.equal(al.items[0].machine, RIG);
  assert.ok(al.items[0].priority);
  assert.ok(al.items[0].name);
});

test("grounded: health returns gateway, ingester, db and intelligence status", () => {
  const h = data.health(300);
  assert.equal(h.gateway.status, "ok");
  assert.equal(h.gateway.reachable, true);
  assert.equal(h.ingester.status, "healthy");
  assert.equal(h.database.status, "connected");
  assert.equal(h.intelligence.status, "active");
});

test("palette: presets are properly configured with all tokens", () => {
  const keys = Object.keys(PRESETS);
  assert.ok(keys.includes("slate-teal"));
  assert.ok(keys.includes("industrial-amber"));
  assert.ok(keys.includes("nordic-blue"));
  assert.ok(keys.includes("emerald-scada"));
  assert.ok(keys.includes("high-contrast"));

  for (const key of keys) {
    const p = PRESETS[key];
    assert.ok(p.name);
    assert.ok(p.dark["--brand"]);
    assert.ok(p.dark["--bg"]);
    assert.ok(p.dark["--surface"]);
    assert.ok(p.light["--brand"]);
  }
});

test("palette: color utilities convert and adjust correctly", () => {
  const rgba = hexToRgba("#2CC5B0", 0.15);
  assert.equal(rgba, "rgba(44, 197, 176, 0.15)");

  const brighter = adjustHexBrightness("#101010", 10);
  assert.ok(brighter.startsWith("#"));
  assert.notEqual(brighter, "#101010");
});

test("palette: engine supports granular primary, secondary, tertiary, background and text choices", () => {
  const engine = createPaletteEngine();
  assert.equal(engine.getActivePreset(), "slate-teal");

  // Initial colors match preset
  const initial = engine.getCurrentColorValues();
  assert.equal(initial.primary, "#2CC5B0");
  assert.equal(initial.secondary, "#121D1D");
  assert.equal(initial.tertiary, "#273939");
  assert.equal(initial.background, "#0B1313");
  assert.equal(initial.text, "#E6EFEE");

  // Granular customization
  engine.setPrimaryColor("#F59E0B");
  assert.equal(engine.getActivePreset(), "custom");
  assert.equal(engine.getCurrentColorValues().primary, "#F59E0B");

  engine.setSecondaryColor("#1C1914");
  assert.equal(engine.getCurrentColorValues().secondary, "#1C1914");

  engine.setTertiaryColor("#3B3324");
  assert.equal(engine.getCurrentColorValues().tertiary, "#3B3324");

  engine.setBackgroundColor("#14120E");
  assert.equal(engine.getCurrentColorValues().background, "#14120E");

  engine.setTextColor("#F3EFE6");
  assert.equal(engine.getCurrentColorValues().text, "#F3EFE6");

  // Reset restores Phase 8 slate-teal
  engine.resetDefault();
  assert.equal(engine.getActivePreset(), "slate-teal");
  assert.equal(engine.getCurrentColorValues().primary, "#2CC5B0");
});
