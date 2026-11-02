# Living plant prototype: implementation plan

> For agentic workers: implement natively, task by task, in order (the user's standing preference). Steps use checkbox syntax. One review of the whole prototype at the end. Plans are prose: the implementer writes the code.

**Goal:** a clickable, animated 2D web prototype of the MedIQ plant view, playing a generated version of the 17-minute demo, published as a private Artifact link.

**Architecture:** plain ES modules and SVG in the browser, no build step and no framework. A data layer produces objects shaped like the real Console and AI service responses, from a seeded generator built on the real simulator machine. The views only read from that data layer. A story clock drives everything from one time value, so scrubbing and pausing are exact.

**Tech stack:** HTML, CSS, JavaScript ES modules, inline SVG, Web Animations / requestAnimationFrame. Google Fonts (IBM Plex Sans, Source Serif 4, IBM Plex Mono). Node 24's built-in test runner (`node --test`) for the data layer. No npm packages.

**Spec:** `product-revamp/v2-ai-native/prototype/DESIGN.md` (read it first; this plan argues from it).

## Global constraints

- Everything lives in `product-revamp/v2-ai-native/prototype/`. No change to any MedIQ service or to approach 1 files.
- Real machine facts come from `gateway-config/machines/plant-a/hydraulic-rig-01.json` (read-only): 13 sensors (tags 1–13; tags 14–15 are the cycle counter and phase, not shown as sensors), 3 components with criticality, 12 alarms with name, message, priority, kind, limit, hysteresis 1.0 and on-delay 3000 ms.
- Hierarchy: site "Plant A" (`plant-a`), area "Hydraulics", line "HPU bay 4", cell "Test rig 1", machine "Hydraulic Rig 01" (`hydraulic-rig-01`). Illustrative healthy machines: "Press line 2" (Forming / Line 2 / Press cell) and "Compressor C-3" (Utilities / Compressor house / Bay 1).
- Story length 17 minutes (1020 s), one cycle per 60 s, healthy until minute 10, cooler fault from minute 10.
- Fixed seed; the same story for every viewer.
- Status colours on the dark stage: critical `#E5484D`, high `#F08C2E`, medium `#E8C547`, low `#7D93B2`. AI halo `#2FA4AF`. Stage `#141A1D` → `#1B2327`. Machine bodies `#C9D2D6` → `#E6ECEE`.
- All copy in sentence case; no all-caps; badge text exactly "Prototype · generated demo data".
- AI subtitles in Source Serif 4; all other text IBM Plex Sans; alarm codes IBM Plex Mono.
- Default speed 8×; speeds 1×, 8×, 30×.

## Review focus

1. **Scrubbing backwards or jumping** must give exactly the state of that minute (alarms, values, AI state), not an accumulation of past events. Every view is a function of story time.
2. **A hidden or throttled browser tab** must not desynchronise the story: the clock uses elapsed real time times speed, not frame counts.
3. **Resizing the window** (1280 to 2560 px wide) keeps the plant fitted and nothing cut off.
4. **Clicking around while the AI is writing a subtitle** (drilling down, scrubbing, tapping a chip) must not leave half-written or duplicated subtitles.
5. **Reduced motion** (the OS setting or the toggle) stops decorative motion (flow pulses, drift, sweep) but keeps state changes and alarm pulses replaced by a steady glow.

Each item has a test or a check in the owning task (marked RF1–RF5).

---

## File structure

| File | Responsibility |
|---|---|
| `index.html` | Page shell: the SVG stage, the overlay layer for UI, font links, module entry |
| `styles.css` | All styling: stage, glass controls, subtitles, glows, reduced motion |
| `src/data/machine.js` | Constant facts of the real machine and the two illustrative machines (hierarchy, components, sensors, alarms, healthy ranges) |
| `src/data/generate.js` | Seeded generator: sensor values per second, cycles, alarm transitions, early-warning episode, checked-cycle events |
| `src/data/ai-script.js` | The example AI analyses, chat answers, steps and follow-up questions, in the AI service's answer structure |
| `src/data/api.js` | The data layer: API-shaped responses for a given story time, with the "generated" source (and an empty "live" slot) |
| `src/clock.js` | Story clock: time, play, pause, speed, seek, subscribe |
| `src/views/plant.js` | Plant view: halls, machines, glows, flow pulses, status line |
| `src/views/machine.js` | Machine view: side-view process drawing, sensor pins with values |
| `src/views/sensor.js` | Sensor view: live trace with limits and the AI note |
| `src/views/logical.js` | Logical view and the physical ↔ logical morph |
| `src/views/ai.js` | The AI light, its states, subtitles, chips and the question field |
| `src/views/player.js` | Bottom player: play/pause, speed, scrubber with event marks, restart, badge |
| `src/app.js` | Wiring: navigation state (level, selection), breadcrumbs, Escape, render loop |
| `test/*.test.js` | Data layer tests (`node --test test/`) |

---

### Task 1: Machine facts and the seeded generator

**Files:** create `src/data/machine.js`, `src/data/generate.js`, `test/generate.test.js`.

**Interfaces produced:**
- `machine.js` exports `SITE`, `MACHINES` (array; each with `code`, `name`, `area`, `line`, `cell`, `assetType`, `illustrative` boolean, `components`, `sensors`, `alarms`), and for each sensor: `tag`, `slot`, `name` (plain English, e.g. "Cooler inlet temperature"), `unit`, `component`, `healthy` `{mean, spread}`.
- `generate.js` exports `generateStory(seed)` returning `{ values, cycles, alarmTransitions, episode, checkedCycles }`:
  - `values`: per machine, per sensor, an array of 1021 numbers (one per second, 0–1020);
  - `cycles`: per machine, `{number, startS, endS, complete}` every 60 s;
  - `alarmTransitions`: `{machine, alarmName, raisedS, clearedS|null}`, computed from `values` against each alarm's limit, kind (HI/HIHI above, LO below), hysteresis and 3 s on-delay;
  - `episode`: for the rig, `{component: "cooler", openedS, severityAt(s)}` with severity "warning" then "critical";
  - `checkedCycles`: `{machine, cycleNumber, atS}`, a few seconds after each cycle end.

- [ ] **Step 1: Write the failing tests** in `test/generate.test.js`:
  - `same seed gives identical story` (deep-equal of two runs).
  - `healthy minutes have no alarms`: no `raisedS` below 600.
  - `healthy values stay in range`: for every rig sensor, every value in 0–600 s is within `mean ± 3·spread`.
  - `first alarms land near minute 12`: `TS4_HI`, `PS5_LO` and `PS6_LO` each raised between 660 and 780 s.
  - `second wave between minutes 12 and 14`: `TS1_HI`, `TS2_HI`, `TS3_HI`, `FS2_LO` raised between 720 and 870 s.
  - `escalation near minute 16`: `TS1_HIHI`, `TS2_HIHI`, `TS3_HIHI`, `TS4_HIHI`, `VS1_HI` raised between 900 and 1015 s.
  - `alarms agree with values`: at each `raisedS`, the alarm's sensor value is past its limit.
  - `illustrative machines stay healthy`: no transitions for "Press line 2" and "Compressor C-3".
  - `early warning opens before the first alarm`: `episode.openedS` between 630 and 680 s; severity "critical" by 840 s.
- [ ] **Step 2: Run** `node --test test/` from the prototype folder. Expected: fails (modules missing).
- [ ] **Step 3: Implement `machine.js`.** Copy sensors, components and alarms from the machine file. Healthy means from the simulator summaries: supply pressure about 160 bar, valve downstream about 110, throttle about 1.8 (use the dataset's healthy ranges, not the polluted means), cooling pressures about 10.0 and 9.9, motor power about 2500 W, working flow about 6–9 l/min, cooling flow about 10.6, oil temperatures A about 36 and B about 42, cooler inlet about 38.5, outlet about 31, vibration about 0.55 mm/s. Give the illustrative machines 4–6 sensors each, no alarms tied to the story.
- [ ] **Step 4: Implement `generate.js`.** Use a small seeded PRNG (for example mulberry32). Values = healthy mean + slow wander + small noise, plus the in-cycle shape for pressures and power. The cooler fault is one smooth "cooling loss" curve from 0 at 600 s to 1 at 1020 s, which lowers cooling flow and cooling pressures and raises the four temperatures and, late, vibration. Tune the curve's coefficients until the minute tests pass. Then compute alarm transitions by walking the values.
- [ ] **Step 5: Run** `node --test test/`. Expected: all pass.
- [ ] **Step 6: Commit** (only when the user says; the user stages). Message: "prototype: machine facts and story generator".

### Task 2: AI script and the API-shaped data layer

**Files:** create `src/data/ai-script.js`, `src/data/api.js`, `test/api.test.js`.

**Interfaces:**
- Consumes `generateStory`, `MACHINES`, `SITE`.
- `ai-script.js` exports `ANALYSES` (one per trigger: early warning opened, first alarm group, escalation), each `{trigger, startS, durationS, steps: [string], report}`. `report` has the AI answer fields: `answer_type`, `answer`, `claims[{statement, sources[{kind, ref, detail}]}]`, `confidence`, `machine_id`, `data_gaps`, `safety_flags`, `follow_up_questions` (up to 3). It also exports `CHAT` (answers to each follow-up question, same structure, with their `steps`). The answers name real sensors and real values from the generated story; the escalation report carries a safety flag.
- `api.js` exports `createDataLayer({source: "generated", seed})` returning an object whose methods take the story time `t` (seconds):
  - `overview(t)` → shaped like `GET /overview` (sites → areas → lines → cells → machines with `rollup` `{online, last_data_at, active_alarms, highest_priority, unknown_alarms, open_anomalies, highest_severity}`, plus the top-level `rollup`);
  - `activeAlarms(machine, t)` → like `plc-alarms/active` (`alarms[]` with `alarm_id`, `name`, `message`, `priority`, `kind`, `component`, `state`, `active`, `active_since`);
  - `anomalies(machine, t)` → like `/anomalies` (`items[]` with `episode_id`, `component`, `state`, `severity`, `started_at`);
  - `dashboard(machine, t)` → like `/dashboard` (`latest[]` with `name`, `unit`, `component`, `slot`, `value`, `at`, `stale`, plus alarm `limits` per sensor, and `timeline`);
  - `series(machine, slot, fromT, toT)` → like `/series` (points `{t, v}`);
  - `checkedCycles(t, windowS)` → recent checked-cycle events;
  - `aiState(t)` → `{state: "watching"|"looking"|"explaining"|"urgent", machine, component, analysis, stepIndex}`;
  - `chat(question)` → the scripted answer for a known follow-up question, or the fixed reply "In this prototype I can answer the suggested questions." for anything else.
  - `source: "live"` throws "Live source not connected yet".
  - Timestamps are ISO strings from a fixed story start, 2026-10-23T14:00:00Z + t.

- [ ] **Step 1: Write the failing tests** in `test/api.test.js`:
  - `overview at minute 5 is all healthy` (top rollup: 3 machines, 3 online, 0 alarms, 0 anomalies).
  - `overview at minute 13 shows the rig needs attention` (rig rollup `active_alarms` ≥ 3, `open_anomalies` 1; others 0).
  - `RF1: state is a function of time` (calling `overview(800)`, then `overview(300)`, then `overview(800)` gives equal first and third results).
  - `dashboard has 13 sensors for the rig with limits` (cooler inlet temperature has limits HI 43 and HIHI 53).
  - `aiState follows the story` (at 300 s "watching"; just after episode open "looking"; after the first analysis duration "explaining"; after escalation "urgent" with a safety flag in the report).
  - `chat answers a suggested question and refuses others`.
  - `live source is not connected`.
- [ ] **Step 2: Run** `node --test test/`. Expected: the new tests fail.
- [ ] **Step 3: Implement `ai-script.js` and `api.js`.** All results are computed from the story and `t` on each call (no hidden state).
- [ ] **Step 4: Run** `node --test test/`. Expected: all pass.
- [ ] **Step 5: Commit** when told. Message: "prototype: AI script and API-shaped data layer".

### Task 3: Page shell, clock and player

**Files:** create `index.html`, `styles.css`, `src/clock.js`, `src/views/player.js`, `src/app.js`, `test/clock.test.js`.

**Interfaces:**
- `clock.js` exports `createClock({lengthS: 1020, speed: 8, now = () => performance.now()})` with `time()`, `play()`, `pause()`, `isPlaying()`, `setSpeed(n)`, `seek(t)`, `onTick(fn)`. Time = start time + elapsed real time × speed, clamped to 0–1020 (RF2).
- `player.js` exports `mountPlayer(rootEl, clock, events)`, where `events` is a list of `{t, label, priority}` used as scrubber marks.
- `app.js` holds `navigation = {level: "plant"|"machine"|"sensor", view: "physical"|"logical", machine, sensor}` and renders on each animation frame from `clock.time()`.

- [ ] **Step 1: Write failing tests** in `test/clock.test.js` with an injected `now`: time advances by elapsed × speed; pause freezes time; seek sets time; time clamps at 1020 and stops; RF2: a 10-second gap between ticks advances time by 10 × speed, not by one frame.
- [ ] **Step 2: Run** `node --test test/`; the clock tests fail.
- [ ] **Step 3: Implement** the clock, the shell (full-window SVG stage plus an HTML overlay layer), base styles from the global constraints, and the player: dark glass pills at the bottom centre, play/pause, 1×/8×/30×, scrubber with event marks coloured by priority, "Restart", and the badge "Prototype · generated demo data" at the bottom left. Clicking the badge opens a short about note: the data is generated from the real simulator machine; "Press line 2" and "Compressor C-3" are illustrative; AI answers are examples.
- [ ] **Step 4: Run** `node --test test/`. Expected: pass. Then open `index.html` through a local server (`python -m http.server` in the prototype folder; ES modules need http). Check: the player plays, pauses, scrubs, and the time display moves at 8×.
- [ ] **Step 5: Commit** when told. Message: "prototype: shell, story clock and player".

### Task 4: Plant view

**Files:** create `src/views/plant.js`; modify `src/app.js`, `styles.css`.

**Interfaces:**
- Consumes `overview(t)`, `checkedCycles(t, 3)`, `dashboard(machine, t)` (for flow speed).
- Produces `renderPlant(svgLayer, data, t, {onMachineClick})` and `machineAnchor(code)` → `{x, y, r}` (used by the AI view and the zoom).

- [ ] **Step 1: Implement the automatic layout** from the overview hierarchy: halls (areas) as softly lit zones with their name; rows (lines) and bays (cells) as faint floor markings with small labels; machines centred in their bays, scaled so the plant fills the window with margin (RF3: recompute on resize).
- [ ] **Step 2: Draw the three machine types** as detailed top-down SVG drawings with depth (soft shadow, light rim): the hydraulic power unit (reservoir tank with level line, motor with fins, pump, valve block, finned cooler, pipes), the press, the compressor.
- [ ] **Step 3: Add the living layers:**
  - flow pulses along each machine's pipes, with speed proportional to its flow sensor (the rig's cooler loop uses cooling flow, so it slows as the fault grows);
  - the status glow under each machine, from its rollup (priority colour, gentle pulse for an active alarm, a dashed ring for an open early warning with no alarm);
  - the checked-cycle sweep: a thin line passing across a machine for about 1.2 s after each checked cycle;
  - the status line at the top ("All 3 machines running normally" / "1 machine needs attention").
- [ ] **Step 4: Check in the browser:** at minute 5 all calm with sweeps once a minute per machine; at minute 13 the rig glows with its cooler pulses visibly slower; resize from 1280 to 2560 px keeps it fitted (RF3); with reduced motion on, pulses, sweeps and drift stop and the alarm glow is steady (RF5).
- [ ] **Step 5: Commit** when told. Message: "prototype: plant view".

### Task 5: Machine and sensor views, with zoom

**Files:** create `src/views/machine.js`, `src/views/sensor.js`; modify `src/app.js`, `styles.css`.

**Interfaces:**
- Consumes `dashboard(machine, t)`, `activeAlarms(machine, t)`, `anomalies(machine, t)`, `series(machine, slot, t-300, t)`, `aiState(t)`.
- Produces `renderMachine(svgLayer, data, t, {onSensorClick})`, `sensorAnchor(slot)` → `{x, y}`, `renderSensor(overlayEl, data, t, slot)`.

- [ ] **Step 1: Zoom.** Clicking a machine animates the view (about 600 ms) from the plant to the machine view, centred on the machine. Breadcrumbs update; Escape or a breadcrumb goes back with the reverse animation.
- [ ] **Step 2: Machine view.** The rig is a side-view process drawing: reservoir → motor and pump → valve block → cooler → back to the reservoir, the oil loop flowing (speed from working flow), the cooling-water loop on the cooler (speed from cooling flow). The 13 sensors are pins on thin stems at their slot positions, showing the name, value and unit (tabular figures). A pin in alarm takes its priority colour and its shape marker; the component with the open early warning glows. The illustrative machines open to a simpler drawing with their few sensors.
- [ ] **Step 3: Sensor view.** Clicking a pin opens a trace panel beside it (dark glass): the last 5 story minutes of the value, the alarm limits as labelled lines, the current value large, and the AI's note when the sensor is part of the current analysis ("Rose 6 °C in 4 minutes while cooling flow fell").
- [ ] **Step 4: Check in the browser:** plant → rig → cooler inlet temperature in three clicks and back with Escape; values tick each second; at minute 16 the HIHI pins show red with square markers; scrubbing to minute 5 while in the sensor view shows healthy values (RF1).
- [ ] **Step 5: Commit** when told. Message: "prototype: machine and sensor views".

### Task 6: The AI presence

**Files:** create `src/views/ai.js`; modify `src/app.js`, `styles.css`.

**Interfaces:**
- Consumes `aiState(t)`, `chat(question)`, `machineAnchor(code)`, `sensorAnchor(slot)`, `checkedCycles(t, 3)`.
- Produces `renderAI(svgLayer, overlayEl, data, t, navigation)`.

- [ ] **Step 1: The light.** A white core with a petrol halo. States as in the spec, section 3.3: watching (slow drift; it moves to each checked machine just before its sweep), looking (flies to the rig's cooler and circles it with a dashed halo), explaining and urgent (hovers beside the faulty part), answering (swirls). In the machine view it hovers at the cooler; in the logical view, at the cooler node.
- [ ] **Step 2: Subtitles.** The analysis report's answer is written out in large serif text near the light, at about 40 characters per second of real time (not story time). The sources are small chips below; a safety flag comes first with an orange line. While an analysis is running, one line under the light shows the current step from `steps`.
- [ ] **Step 3: Conversation.** After a report is shown, its follow-up questions float around the light as chips. Tapping a chip shows "answering" with the scripted steps, then the scripted answer as a new subtitle, with its own chips. A small text field ("Ask MedIQ...") sends free text to `chat()`, which gives the fixed prototype reply for unknown questions.
- [ ] **Step 4: Robustness (RF4).** Any navigation, scrub or new chip tap cancels the subtitle being written and starts the right one; there is never more than one subtitle at a time. Scrubbing back to before the episode returns the light to watching and clears the subtitle.
- [ ] **Step 5: Check in the browser:** play from 0 at 8×; the light visibly sweeps machines in the healthy minutes, flies to the rig around minute 11, explains around 12, turns urgent around 16; tapping a chip mid-subtitle and scrubbing back and forth leave one clean subtitle.
- [ ] **Step 6: Commit** when told. Message: "prototype: AI presence".

### Task 7: Logical view

**Files:** create `src/views/logical.js`; modify `src/app.js`, `styles.css`.

**Interfaces:**
- Consumes `overview(t)`, `dashboard(machine, t)`, `machineAnchor`.
- Produces `renderLogical(svgLayer, data, t, navigation)` and a toggle "Physical / Logical" in the top bar.

- [ ] **Step 1: The structure.** Nodes for Plant A → areas → lines → cells → machines, left to right, connected by thin lines; inside the selected machine, its components and their sensors. Every node shows its state with the same glows and markers as the physical view.
- [ ] **Step 2: The morph.** Switching animates each machine from its physical position to its node position over about 800 ms (and back), so it reads as the same plant. Reduced motion switches without the animation (RF5).
- [ ] **Step 3: Check in the browser:** switching at minute 13 shows the rig's path to the cooler node lit; clicking a node behaves like clicking the machine or sensor in the physical view.
- [ ] **Step 4: Commit** when told. Message: "prototype: logical view".

### Task 8: Finish, review and publish

**Files:** modify any; create `README.md` in the prototype folder (how to open it locally, what is generated, how the live source would plug in).

- [ ] **Step 1: Load the `artifact-design` skill** and check the page against its contract (title, colour tokens, dark/light handling, allowed script and font sources). Adjust what it requires.
- [ ] **Step 2: Walk the success list** in the spec, section 8, in the browser, from a fresh load, and fix what fails.
- [ ] **Step 3: Run** `node --test test/`. Expected: all pass.
- [ ] **Step 4: One review** of the whole prototype against the spec and the Review Focus list, by a fresh reviewer, then fix the confirmed findings.
- [ ] **Step 5: Publish** with the Artifact tool: `index.html` as the page, the CSS and `src/**` files through `files`, icon "factory". Record the link in the prototype `README.md` and in `v2-ai-native/README.md`.
- [ ] **Step 6: Commit** when told. Message: "prototype: living plant v1".
