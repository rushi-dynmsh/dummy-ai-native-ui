import { test } from "node:test";
import assert from "node:assert/strict";
import { createClock } from "../src/clock.js";

function fakeNow() {
  let ms = 0;
  const now = () => ms;
  now.advance = (s) => { ms += s * 1000; };
  return now;
}

test("time advances by elapsed real time times speed", () => {
  const now = fakeNow();
  const c = createClock({ lengthS: 1020, speed: 8, now });
  c.play();
  now.advance(2);
  assert.equal(c.time(), 16);
});

test("pause freezes time", () => {
  const now = fakeNow();
  const c = createClock({ lengthS: 1020, speed: 8, now });
  c.play();
  now.advance(1);
  c.pause();
  now.advance(5);
  assert.equal(c.time(), 8);
  assert.equal(c.isPlaying(), false);
});

test("seek sets time and keeps playing from there", () => {
  const now = fakeNow();
  const c = createClock({ lengthS: 1020, speed: 1, now });
  c.play();
  c.seek(600);
  now.advance(3);
  assert.equal(c.time(), 603);
});

test("speed change keeps the current time", () => {
  const now = fakeNow();
  const c = createClock({ lengthS: 1020, speed: 1, now });
  c.play();
  now.advance(10);
  c.setSpeed(30);
  now.advance(1);
  assert.equal(c.time(), 40);
  assert.equal(c.speed(), 30);
});

test("time clamps at the end and stops playing", () => {
  const now = fakeNow();
  const c = createClock({ lengthS: 1020, speed: 30, now });
  c.play();
  now.advance(100);
  assert.equal(c.time(), 1020);
  assert.equal(c.isPlaying(), false);
});

test("RF2: a long gap between reads advances by the whole gap", () => {
  const now = fakeNow();
  const c = createClock({ lengthS: 1020, speed: 8, now });
  c.play();
  now.advance(10); // a hidden tab: no frames for 10 s
  assert.equal(c.time(), 80);
});

test("seek clamps to the story", () => {
  const c = createClock({ lengthS: 1020, speed: 8, now: fakeNow() });
  c.seek(-5);
  assert.equal(c.time(), 0);
  c.seek(5000);
  assert.equal(c.time(), 1020);
});

test("finding 9: seek ignores a value that is not a number", () => {
  const c = createClock({ lengthS: 1020, speed: 8, now: fakeNow() });
  c.seek(300);
  c.seek(Number("abc"));
  assert.equal(c.time(), 300);
});
