import { test } from "node:test";
import assert from "node:assert/strict";
import { TECH_NOTES, VALID_STATUSES, getAllTechNotes, computeSummaryCounts } from "../src/data/tech-notes.js";

test("tech-notes: all categories exist and contain feature lists", () => {
  const expectedScreens = ["plant", "machine", "sensor", "logical", "ai", "status", "events", "player"];
  for (const screen of expectedScreens) {
    assert.ok(Array.isArray(TECH_NOTES[screen]), `Screen ${screen} should have an array of features`);
    assert.ok(TECH_NOTES[screen].length > 0, `Screen ${screen} should not be empty`);
  }
});

test("tech-notes: every feature has a valid status, source, and 2–3 bullets", () => {
  const allNotes = getAllTechNotes();
  assert.ok(allNotes.length >= 35, `Expected at least 35 features, got ${allNotes.length}`);

  const seenIds = new Set();

  for (const item of allNotes) {
    // ID uniqueness
    assert.ok(item.id && typeof item.id === "string", `Feature missing string id: ${JSON.stringify(item)}`);
    assert.ok(!seenIds.has(item.id), `Duplicate feature id: ${item.id}`);
    seenIds.add(item.id);

    // Name
    assert.ok(item.name && typeof item.name === "string", `Feature ${item.id} missing name`);

    // Valid status
    assert.ok(
      VALID_STATUSES.includes(item.status),
      `Feature ${item.id} has invalid status '${item.status}'. Must be one of: ${VALID_STATUSES.join(", ")}`
    );

    // Source string
    assert.ok(
      item.source && typeof item.source === "string" && item.source.trim().length > 0,
      `Feature ${item.id} missing source description`
    );

    // 2 to 3 bullets
    assert.ok(Array.isArray(item.bullets), `Feature ${item.id} bullets must be an array`);
    assert.ok(
      item.bullets.length >= 2 && item.bullets.length <= 3,
      `Feature ${item.id} must have 2 or 3 bullets, got ${item.bullets.length}`
    );
    for (const b of item.bullets) {
      assert.ok(typeof b === "string" && b.trim().length > 0, `Feature ${item.id} bullet is not a valid string`);
    }

    // Gap ID if present
    if (item.gap !== null) {
      assert.match(item.gap, /^G\d+$/, `Feature ${item.id} gap ID '${item.gap}' should match G<number> format`);
    }
  }
});

test("tech-notes: summary counts correctly sum up", () => {
  const allNotes = getAllTechNotes();
  const counts = computeSummaryCounts(allNotes);
  assert.equal(counts.total, allNotes.length);
  assert.equal(
    counts.EXISTS + counts.PARTIAL + counts.MISSING + counts.PRESENTATION,
    counts.total,
    "Sum of categories must equal total"
  );
  assert.ok(counts.EXISTS > 0, "EXISTS count should be > 0");
  assert.ok(counts.PARTIAL > 0, "PARTIAL count should be > 0");
  assert.ok(counts.MISSING > 0, "MISSING count should be > 0");
  assert.ok(counts.PRESENTATION > 0, "PRESENTATION count should be > 0");
});

