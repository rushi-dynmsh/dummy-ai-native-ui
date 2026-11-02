# MedIQ Living Plant Prototype: Backend Backing Map

This document maps every data point and dynamic behaviour in the MedIQ "Living Plant" prototype (Approach 2) to its real backend source.

---

## 1. Executive Summary

| Category | Count | Percentage | Definition |
|---|---|---|---|
| **EXISTS** | 16 | 36.4% | Served today as the UI needs it via available APIs and DB models. |
| **PARTIAL** | 16 | 36.4% | Data exists in backend tables or single-machine APIs, but lacks the necessary shape, granularity, aggregation, or push delivery. |
| **MISSING** | 4 | 9.1% | Not provided by any current backend service, table, or endpoint. Linked to gaps. |
| **PRESENTATION** | 8 | 18.2% | Purely front-end visual choreography, easing, rendering, or client preference; no backend data required. |
| **Total** | **44** | **100%** | Comprehensive inventory across all prototype views and components. |

### Top 5 Blockers & Recommended Resolutions

1. **Proactive AI Agent Push (G24 — MISSING / PARTIAL)**
   - *Problem:* In the prototype, MedIQ's AI autonomously flies to the machine, displays live "looking into" steps, and writes proactive explanations when an anomaly opens. Today's AI agent (`assistant/proxy.py`, `use-the-chat-api_console.md`) is strictly **reactive**: it only executes and emits SSE streams when an operator submits a prompt (`POST /chat`) or clicks "Analyze".
   - *Recommendation:* **Add a backend capability.** Build an event-driven watcher service (or extend `mediq-intelligence` handoff) that triggers an automated agent run upon anomaly episode transitions and broadcasts structured notifications over SSE/WebSocket. *(UI fallback: show a prompt badge "MedIQ detected anomaly — click to investigate").*

2. **Real-time Push Channel for Telemetry and Alarms (G23 — PARTIAL)**
   - *Problem:* Live UI animations (continuous pipe fluid dashes, fan rotation, live alarm ring pulses) require sub-second updates. Today, the Console Monitor API is **polling-only HTTP GET** (`/overview`, `/dashboard`, `/plc-alarms/active`). Fast polling (e.g. 500 ms) overloads the single factory PC and wastes database connections.
   - *Recommendation:* **Add a backend capability.** Expose a Server-Sent Events (SSE) stream (`GET /api/monitor/stream` or `GET /machines/{m}/stream`) in FastAPI backed by PostgreSQL `LISTEN/NOTIFY` or an internal MQTT subscription for alarm transitions, cycle completions, and 1-second telemetry averages.

3. **Checked-Cycle Timestamp & Watch Sweep Trigger (G22 — MISSING)**
   - *Problem:* The prototype shows "Last cycle checked 14:05:12" and sweeps a scanning beam over each machine when MedIQ finishes evaluating a cycle. In the backend, `mediq-intelligence` writes `intelligence.processed_cycle.completed_at`, but **no Console API endpoint returns this timestamp**.
   - *Recommendation:* **Add a backend capability.** Add `last_cycle_checked_at` (and `last_cycle_number`) to `MachineRollup` in `mediq_console/monitor/overview.py` and `machine.py:MachineRollup` by joining `intelligence.processed_cycle` in `queries.py:SQL_ROLLUP_MACHINE`.

4. **Machine Type in Plant Overview (G21 — PARTIAL)**
   - *Problem:* The plant map needs each machine's type (`HydraulicPowerUnit`, `HydraulicPress`, `AirCompressor`) to draw the matching SVG glyph. Currently, `GET /api/monitor/overview` returns `OverviewMachine` without `asset_type`; only the single-machine page `GET /machines/{site}/{machine}` returns it.
   - *Recommendation:* **Add a backend capability.** Include `asset_type: { name, version }` in `OverviewMachine` (`mediq_console/monitor/overview.py:67-70`). The underlying query `SQL_MACHINE_DETAIL` already selects `t.name AS asset_type_name, t.version AS asset_type_version`; it only needs to be joined in `gather_snapshot` / `build_hierarchy`.

5. **PLC Alarm Limits with Live Telemetry and Series (G05 / G26 — PARTIAL)**
   - *Problem:* The sensor trace chart draws HI/HIHI/LO limit lines, and the sensor card displays limits (`HI 43 · HIHI 53`). The backend stores limits in `asset.device_alarm_version.limit_value`, but `GET .../dashboard` latest values and `GET .../series` only return raw sensor transducer ranges (`range_low`, `range_high`).
   - *Recommendation:* **Add a backend capability.** Extend `LatestValue` in `mediq_console/monitor/machine.py:359-379` to include `limits: list[AlarmLimitOut]` joined from `asset.device_alarm_version` in `queries.py:SQL_LATEST_VALUES`.

---

## 2. What Changed in the Console Since the Prototype

The Console codebase has evolved considerably since the prototype was drafted:
- **Assistant Proxy (`mediq_console.assistant.proxy`):** Reverse proxy installed on `/api/assistant/{path}` (`app.py:130`, `proxy.py:1-211`). Forwards `chat`, `threads`, `runs`, and `agents` to the upstream AI service. Full SSE streaming supported on `GET /api/assistant/threads/{id}/stream`.
- **Browser-based Machine Type & Rules Studio (`mediq_console.analysis`):** Complete workflow for drafting, validating, checking, and releasing machine types (`/api/analysis/types/...`), approving baselines, and editing statistical rule overrides across global, machine-type, site, and machine scopes (`overrides_api.py:1-462`).
- **Watch State on Rollups:** `MachineRollup` and `GroupRollup` now return `watch_state` (`"watched"` vs `"not_watched"`) and `watch_reason` (`machine.py:78-107`, `overview.py:54-65`), distinguishing unanalysed machines from healthy ones.
- **Suppressed Alarm Semantics:** `ActiveAlarm` and `AlarmInterval` gained `suppressed: bool` (`plc_alarms.py:82-86`), identifying alarms raised while the machine was stopped without polluting incidents.
- **Component Model Realism (G11 Closed):** Standard onboarding (`scenarios/rig-opcua/commissioning.yaml:25-32` and `asset_type.yaml:11-19`) now defines all 7 components (`main_pump`, `motor`, `accumulator`, `switching_valve`, `cooler`, `filter`, `tank`). `switching_valve` is properly created in `asset.component`, resolving gap G11.

---

## 3. Detailed Data & Behaviour Mapping by Screen

### 3.1 Plant View (Physical Floor)

#### 1. Machine Floor Layout & Spatial Hierarchy
- **UI Data Point:** Placement of halls, lines, and bays; machine position on plant floor.
- **Source Today:** `GET /api/monitor/overview` (`overview.py:108-113`), `asset.site`, `asset.area`, `asset.line`, `asset.cell`, `asset.machine` (`queries.py:204-209`). Producing service: `mediq-console` reading `mediq-ingester` tables.
- **Status:** `EXISTS`
- **Implementation:** Polled on load and every 10–30 s via `GET /api/monitor/overview`. The tree layout is static once loaded. If absent, fallback to an empty canvas with an alert; staleness limit 60 s.
- **Constraints on UI:** Real physical coordinates on a factory floor plan are not held (G18); positions are algorithmically laid out from ISA-95 parent-child hierarchy.

#### 2. Building Grid Markers (A..J, 1..6, Machine "C3")
- **UI Data Point:** Column letters, row numbers, and machine grid coordinate tag (`hydraulic-rig-01 · C3`).
- **Source Today:** Synthesized purely in client layout (`plant.js:156-166, :207`).
- **Status:** `PARTIAL` (Gap G18)
- **Implementation:** Computed from SVG stage dimensions and bounding box. True architectural column coordinates do not exist in the database.
- **Constraints on UI:** Coordinates are virtual; if floor dimensions change, labels shift.

#### 3. Machine SVG Drawing & Asset Type
- **UI Data Point:** Detailed top-down equipment representation (finned motor, pump, cooler fan, manifold).
- **Source Today:** `GET /api/monitor/machines/{site}/{machine}` (`machine.py:337-340`) field `asset_type: { name, version }`. Database table: `asset.asset_type`.
- **Status:** `PARTIAL` (Gap G21)
- **Implementation:** Today requires a separate fetch per machine because `GET /api/monitor/overview` does not include `asset_type`. A 10-machine plant requires 1 overview call plus 10 machine page calls.
- **Constraints on UI:** Plant view must either issue N HTTP calls on load, or default to a generic machine glyph until the single-machine endpoint resolves.

#### 4. Machine State Status Word & Hue
- **UI Data Point:** Status word ("Healthy", "Watch", "Needs attention", "Act now") and color token (`--ink-2`, `--medium`, `--high`, `--critical`).
- **Source Today:** `GET /api/monitor/overview` (`overview.py:67-70, :115-128`), `queries.py:SQL_ROLLUP_ALARMS`, `SQL_ROLLUP_ANOMALIES` over `telemetry.alarm_state` and `intelligence.anomaly_episode`. Logic mapped in `svg.js:41-50`.
- **Status:** `EXISTS`
- **Implementation:** Polled via `GET /api/monitor/overview` every 2–5 s. Worst open item takes precedence (urgent/critical alarm -> Act now; high alarm or critical anomaly -> Needs attention; medium/warning -> Watch; none -> Healthy).
- **Constraints on UI:** Latency is bounded by poll interval (2–5 s) plus query execution (~15 ms).

#### 5. Floor Alarm Glow
- **UI Data Point:** Pulsing radial glow beneath machine chassis in alarm color.
- **Source Today:** `GET /api/monitor/overview` (`overview.py:54-65`) fields `rollup.active_alarms > 0` and `rollup.highest_priority`. Table: `telemetry.alarm_state`.
- **Status:** `EXISTS`
- **Implementation:** Derived from the same overview poll. The pulsing animation (sinusoidal opacity) is client CSS/SVG driven.
- **Constraints on UI:** Pulse rate is purely decorative; state changes when poll returns new highest priority.

#### 6. Early-Warning Ring
- **UI Data Point:** Dashed rectangular bounding ring around machine (amber for warning, red for critical).
- **Source Today:** `GET /api/monitor/overview` (`overview.py:54-65`) fields `rollup.open_anomalies > 0` and `rollup.highest_severity`. Table: `intelligence.anomaly_episode`.
- **Status:** `EXISTS`
- **Implementation:** Polled via `GET /api/monitor/overview` every 2–5 s. Ring renders when `highest_severity` is non-null.
- **Constraints on UI:** Shows deterministic anomaly episode status only. Does not indicate root cause diagnosis.

#### 7. Pipe Fluid Flow Dash Animation
- **UI Data Point:** Dashes traveling along oil, water, or air conduits at sensor-proportional speed.
- **Source Today:** `GET /api/monitor/machines/{site}/{machine}/dashboard` (`machine.py:418-440`) field `latest[].value` where `slot == 'flow.working'` / `'flow.cooling'`. Table: `telemetry.measurement`.
- **Status:** `PARTIAL` (Gap G23)
- **Implementation:** Today requires polling `/dashboard` every 1–2 s for each active machine, reading `latest`. Client animation loop updates `stroke-dashoffset` frame-by-frame based on the last polled scalar value.
- **Constraints on UI:** In a multi-machine plant, polling `/dashboard` for every machine causes excessive backend query load. Flow speeds step discretely on each poll response rather than gliding continuously.

#### 8. Cooler Fan Rotation
- **UI Data Point:** 3-blade cooling fan spinning in cooler frame.
- **Source Today:** `GET /api/monitor/machines/{site}/{machine}/dashboard` (`machine.py:418-440`), reading `slot == 'flow.cooling'`. Table: `telemetry.measurement`.
- **Status:** `PARTIAL` (Gap G23)
- **Implementation:** Same as pipe fluid flow; updated via `/dashboard` polling.
- **Constraints on UI:** Requires live flow sensor readings. For machines without flow sensors, fan rotates at nominal baseline or stays static.

#### 9. Checked Cycle Sweep Animation
- **UI Data Point:** Scanning beam and bracket flash across machine when MedIQ finishes checking a cycle.
- **Source Today:** `intelligence.processed_cycle.completed_at` in `mediq-intelligence/src/mediq_intel/service/poller.py:48-60`. **Not returned by any API endpoint** (Gap G22).
- **Status:** `MISSING` (Gap G22)
- **Implementation:** Needs an API change in `overview.py` / `queries.py` to expose `last_cycle_completed_at` on `MachineRollup`. The UI would compare timestamp against previous poll and trigger the sweep animation when a new completion timestamp arrives.
- **Constraints on UI:** Currently impossible to drive with live backend data. Prototype synthesizes this from internal timer.

#### 10. Machine Hover & Click Navigation
- **UI Data Point:** Hover dashed boundary outline, cursor change, click/Enter opens machine drilldown.
- **Source Today:** Client interaction state (`plant.js:191-212`, `app.js:306-313`).
- **Status:** `PRESENTATION`
- **Implementation:** Handled entirely in DOM/SVG events. No backend interaction.
- **Constraints on UI:** None.

---

### 3.2 Machine View (Component & Sensor Schematic)

#### 11. Equipment Process Flow Schematic
- **UI Data Point:** P&ID process flow diagram: Reservoir -> Pump/Motor -> Valve Manifold -> Cooler -> Reservoir.
- **Source Today:** `GET /api/monitor/machines/{site}/{machine}` (`machine.py:346-349`) field `components: [ComponentOut]`. Table: `asset.component` (`queries.py:1134-1144`).
- **Status:** `PARTIAL` (Gap G19)
- **Implementation:** Polled on machine entry. The equipment codes and kinds exist in the DB, but the visual process connectivity (pipe routing, topology) is hardcoded SVG in `machine.js:30-70`.
- **Constraints on UI:** Schematic cannot be auto-generated for arbitrary foreign machines; requires pre-authored SVG per asset type.

#### 12. Component Fault Glow
- **UI Data Point:** Radial colored halo behind faulty equipment block (cooler, pump, tank, valve).
- **Source Today:** `GET /api/monitor/machines/{site}/{machine}/plc-alarms/active` (`plc_alarms.py:98-102`) field `alarms[].component`, and `GET .../anomalies` (`anomalies.py:67-78`) field `items[].component`.
- **Status:** `EXISTS`
- **Implementation:** Polled every 2 s while machine view is active. Active alarms and open episodes matching component ID trigger glow in highest priority color.
- **Constraints on UI:** Component codes in alarm definitions and anomaly episodes must match `asset.component.code`.

#### 13. Sensor Pin Spatial Anchors & Stem Lines
- **UI Data Point:** 13 pins positioned at physical measuring points with stems connecting to readout cards.
- **Source Today:** `GET /api/monitor/machines/{site}/{machine}/dashboard` (`machine.py:418-440`) `latest[]` (`channel_id`, `tag_id`, `name`, `component`, `slot`).
- **Status:** `EXISTS`
- **Implementation:** Polled via `/dashboard`. Pin coordinates (x,y) are authored per asset type in `machine.js:9-23`.
- **Constraints on UI:** Sensor-to-component association is dynamic; pin 2D coordinates are fixed in frontend asset templates.

#### 14. Live Sensor Numeric Values & Units
- **UI Data Point:** Formatted scalar readout (e.g. `38.5 °C`, `160 bar`, `0.55 mm/s`).
- **Source Today:** `GET /api/monitor/machines/{site}/{machine}/dashboard` (`machine.py:418-440`) fields `latest[].value`, `latest[].unit`, `latest[].stale`. Table: `telemetry.measurement` (`queries.py:521-546`).
- **Status:** `EXISTS`
- **Implementation:** Polled via `/dashboard` every 1–2 s. Values formatted with `formatValue()` in `svg.js:52-57`. If `stale: true`, display in muted styling.
- **Constraints on UI:** Update rate is limited by polling cadence (1 s). Sub-second fluctuations are not visible.

#### 15. Sensor Alarm Marker Badge on Pins
- **UI Data Point:** Priority shape glyph (urgent square, high triangle, medium diamond, low circle) and color on pin card.
- **Source Today:** `GET /api/monitor/machines/{site}/{machine}/plc-alarms/active` (`plc_alarms.py:64-87`). Table: `telemetry.alarm_state` join `asset.device_alarm_version`.
- **Status:** `PARTIAL` (Gap G05)
- **Implementation:** The active alarm API returns `component` and `alarm_id`, but does NOT directly expose `watched_tag_id` or `slot`. The client must match alarm naming conventions or cross-reference metadata.
- **Constraints on UI:** Requires client-side mapping until `watches_slot` is exposed in `ActiveAlarm`.

#### 16. Machine Fluid Loop Dashes & Cooler Fan
- **UI Data Point:** Animated fluid loop streams and spinning fan in side view.
- **Source Today:** `GET /api/monitor/machines/{site}/{machine}/dashboard` (`machine.py:418-440`).
- **Status:** `EXISTS`
- **Implementation:** Driven by live scalar values polled in `/dashboard` `latest` (`flow.working`, `flow.cooling`).
- **Constraints on UI:** Speeds step discretely on each poll response.

---

### 3.3 Sensor View (Trace & Limits Panel)

#### 17. 5-Minute Time Series Waveform
- **UI Data Point:** Polyline chart of sensor readings over preceding 300 seconds.
- **Source Today:** `GET /api/monitor/machines/{site}/{machine}/series?channel={id}&start={start}&end={end}` (`series_api.py:180-272`). Tables: `telemetry.measurement` or `telemetry.m_1s` (`queries.py:756-785`).
- **Status:** `PARTIAL` (Gap G25)
- **Implementation:** Polled on sensor open and refreshed every 2–5 s. Requires looking up integer `channel_id` from `/dashboard` or `/tags` first, as `/series` does not accept semantic slot strings (Gap G25).
- **Constraints on UI:** Two-step fetch required to initialize chart. Points are bucketed to 1s intervals.

#### 18. Alarm Limit Reference Threshold Lines
- **UI Data Point:** Horizontal dashed reference lines with labels (`HI 43`, `HIHI 53`, `LO 10.0`) in priority colors.
- **Source Today:** `asset.device_alarm_version.limit_value`, `kind`, `priority` (`queries.py:145-155`).
- **Status:** `PARTIAL` (Gap G05 / G26)
- **Implementation:** Limits exist in the database, but are **not returned** in `/dashboard` `latest` or `/series`. The client must either inspect the machine onboarding config file or make a dedicated call.
- **Constraints on UI:** Without backend gap closure (G05/G26), limit lines cannot be dynamically drawn for live machines.

#### 19. Sensor In-Alarm Subtitle
- **UI Data Point:** Text summary ("HI 43 · HIHI 53 · in alarm: TS3_HI").
- **Source Today:** `GET /api/monitor/machines/{site}/{machine}/plc-alarms/active` (`plc_alarms.py:98-102`).
- **Status:** `PARTIAL` (Gap G05)
- **Implementation:** Active alarm name is returned, but threshold numbers must be merged from configuration.
- **Constraints on UI:** In-alarm status is accurate; threshold text requires gap G05 resolution.

#### 20. Natural Language AI Trend Note
- **UI Data Point:** Concise observation sentence ("Rose 3.2 °C in the last 4 minutes while cooling flow fell").
- **Source Today:** Computed entirely in client heuristic script (`sensor.js:8-20`). No backend service provides sensor-level trend sentences (Gap G27).
- **Status:** `MISSING` (Gap G27)
- **Implementation:** In the real system, the AI copilot can answer trend questions via MCP tool `get_channel_trend`, but there is no standing REST endpoint providing pre-generated sentences for UI cards.
- **Constraints on UI:** UI should either compute simple delta text locally (as done today) or omit the note until an operator asks the assistant.

#### 21. Safety Alert Banner
- **UI Data Point:** Prominent safety alert banner above chart ("Oil is above 50 °C: do not open the cooler...").
- **Source Today:** Chat API `assistant_message.answer.safety_flags` (`use-the-chat-api_console.md:237`) or `mediq.evidence/1.0` `safety_flags`.
- **Status:** `PARTIAL` (Gap G24)
- **Implementation:** Safety flags are generated when an analysis run completes, but cannot be pushed proactively to the sensor panel without an active assistant thread.
- **Constraints on UI:** Stays hidden unless an AI diagnosis or chat run for the machine returned active safety flags.

---

### 3.4 Logical View (Structural Tree)

#### 22. 7-Column ISA-95 Tree Layout
- **UI Data Point:** Hierarchy columns: Site -> Area -> Line -> Cell -> Machine -> Component -> Sensor.
- **Source Today:** `GET /api/monitor/overview` (`overview.py:108-113`) for Site through Machine; `GET /machines/{site}/{machine}` for components; `/dashboard` or `/tags` for sensors.
- **Status:** `PARTIAL` (Gap G17 / G21)
- **Implementation:** Assembled by combining overview data with machine detail queries.
- **Constraints on UI:** Initial load requires multiple queries to fetch components and sensors for all machines in the plant.

#### 23. Node State Lighting & Tree Rollup
- **UI Data Point:** Border lighting and radial glow on nodes indicating operational health; parent nodes take worst child state.
- **Source Today:** `GET /api/monitor/overview` (`overview.py:115-128`), `GET .../plc-alarms/active`, `GET .../anomalies`.
- **Status:** `EXISTS`
- **Implementation:** Derived directly from rollups and alarm lists. Evaluated client-side in `logical.js:125-147`.
- **Constraints on UI:** Refresh cadence follows overview polling (2–5 s).

#### 24. Leaf Sensor Value Readout
- **UI Data Point:** Live value and unit displayed on each leaf sensor node in tree.
- **Source Today:** `GET /api/monitor/machines/{site}/{machine}/dashboard` (`machine.py:418-440`) `latest[]`.
- **Status:** `PARTIAL` (Gap G17)
- **Implementation:** Requires polling `/dashboard` for every machine in the plant.
- **Constraints on UI:** On plants with >10 machines, leaf values should be lazy-loaded on expansion rather than continuously polled plant-wide.

#### 25. Spatial Morph Animation
- **UI Data Point:** Smooth animation morphing machines from physical floor coordinates to logical grid coordinates.
- **Source Today:** Client animation logic (`logical.js:77-106`).
- **Status:** `PRESENTATION`
- **Implementation:** Cubic easing between `plantAnchor` and logical grid slot. No backend interaction.
- **Constraints on UI:** Respects `prefers-reduced-motion` (instant toggle when motion reduced).

---

### 3.5 AI Presence & Logbook Note

#### 26. AI Iris State Expressions
- **UI Data Point:** Thin-line iris SVG mark with 5 expressions (watching blink, looking scan, answering orbit, explaining open, urgent wide rim).
- **Source Today:** Reactive tool states available in SSE stream `GET /api/assistant/threads/{id}/stream` (`proxy.py:179-181`). Proactive autonomous state triggers do not exist (Gap G24).
- **Status:** `PARTIAL` (Gap G24)
- **Implementation:** When a user engages in chat, `proxy.py` relays SSE `step` (looking/answering) and `message` (explaining). Proactive state changes during background monitoring require gap G24.
- **Constraints on UI:** Iris expressions currently only animate during active user chat sessions.

#### 27. Inspection Brackets & Focus Pull
- **UI Data Point:** Four corner brackets locking onto target equipment with overshoot focus pull animation.
- **Source Today:** Target coordinates derived from UI element bounding boxes (`ai.js:124-128, :184-205`).
- **Status:** `PRESENTATION`
- **Implementation:** Pure client-side SVG rendering and physics-inspired easing.
- **Constraints on UI:** None.

#### 28. Scan Line & Spotlight Stage Dimming
- **UI Data Point:** Animated scanning line passing through brackets while looking; stage outside brackets dimmed by 28% while explaining.
- **Source Today:** Client SVG presentation (`ai.js:207-232`).
- **Status:** `PRESENTATION`
- **Implementation:** SVG path clipping and linear opacity transitions.
- **Constraints on UI:** Disabled under `reduce-motion`.

#### 29. Watching Patrol Tour
- **UI Data Point:** Brackets gliding across machines and visiting components sequentially on checked cycles.
- **Source Today:** Relies on cycle check trigger (Gap G22) and autonomous AI patrol daemon (Gap G24). Neither exists in backend.
- **Status:** `MISSING` (Gaps G22, G24)
- **Implementation:** Would require `processed_cycle` notification push from backend to initiate client visual patrol.
- **Constraints on UI:** In a live deployment, brackets should remain in resting frame around the current view unless an alarm or active query occurs.

#### 30. Proactive "Looking Into" Investigation Steps
- **UI Data Point:** Transient status note showing agent investigation steps ("Reading the cooler's last 10 cycles...").
- **Source Today:** SSE `event: step` (`use-the-chat-api_console.md:135-137`) via `/api/assistant/threads/{id}/stream`.
- **Status:** `PARTIAL` (Gap G24)
- **Implementation:** Emitted live while an agent processes a user request. Cannot run autonomously on telemetry events without gap G24.
- **Constraints on UI:** Visible only during active chat queries.

#### 31. AI Explanation Text & Typewriter Output
- **UI Data Point:** Natural-language paragraph explaining problem with reading-speed typewriter reveal.
- **Source Today:** Chat API `assistant_message.answer.answer` (`use-the-chat-api_console.md:225`) or stored diagnoses in `intelligence.diagnosis`.
- **Status:** `PARTIAL` (Gap G24)
- **Implementation:** Returned as Markdown content from `/api/assistant/chat`. Typewriter reveal is client-rendered (`CHARS_PER_S = 42`).
- **Constraints on UI:** Available when queried or when an incident has a pre-computed diagnosis. Spontaneous proactive popups require gap G24.

#### 32. Source Citations & Confidence Level
- **UI Data Point:** "Based on: Signal trend, Cycle statistics" chips and confidence badge.
- **Source Today:** Chat API `assistant_message.answer.claims[].sources` (`use-the-chat-api_console.md:227-233`) and `confidence`. Read-only MCP tools (`mediq-mcp-service`).
- **Status:** `EXISTS`
- **Implementation:** Returned inside the structured `answer` object of every assistant response.
- **Constraints on UI:** Sources reflect MCP tool calls (`get_channel_trend`, `get_cycle_statistics`, `compare_windows`) or manual document references.

#### 33. Suggested Follow-Up Question Chips
- **UI Data Point:** Clickable suggested prompt buttons ("Is the pump affected?", "How fast is it getting worse?").
- **Source Today:** Chat API `assistant_message.answer.follow_up_questions` (`use-the-chat-api_console.md:239`).
- **Status:** `EXISTS`
- **Implementation:** Delivered as an array of up to 3 strings in the assistant answer.
- **Constraints on UI:** Max 3 questions per turn.

#### 34. Interactive Copilot Conversation
- **UI Data Point:** Input field and back-and-forth Q&A loop.
- **Source Today:** `POST /api/assistant/chat` and `GET /api/assistant/threads/{id}/stream` via `mediq_console.assistant.proxy` (`proxy.py:204-211`).
- **Status:** `EXISTS`
- **Implementation:** Client submits `POST /api/assistant/chat`, receives `202 Accepted` with thread/run IDs, and opens `EventSource` on `links.stream` to render tokens and tool steps.
- **Constraints on UI:** Only one concurrent request per thread (`409 thread_busy`). Responses can take 5–30 s if deep analysis runs.

---

### 3.6 Header Bar & Status Line

#### 35. Plant Clock Time & Date
- **UI Data Point:** Formatted timestamp ("Fri 23 Oct 2026 · 14:12:05").
- **Source Today:** `asset.site.timezone` from `GET /api/monitor/overview` (`overview.py:101`). Formatted locally via browser `Intl.DateTimeFormat`.
- **Status:** `EXISTS`
- **Implementation:** Site timezone is fetched on load. Clock ticks via `requestAnimationFrame` using local machine time formatted in the site's timezone.
- **Constraints on UI:** All backend timestamps are UTC (`TIMESTAMPTZ`). The "14:00–14:17" demo time was an offline replay offset; in live operation, clock displays real wall-clock time in site timezone.

#### 36. Plant Alarm Count Badge
- **UI Data Point:** Top-right pill showing active alarm count and highest priority indicator.
- **Source Today:** `GET /api/monitor/overview` (`overview.py:110, :121-122`) fields `rollup.active_alarms`, `rollup.highest_priority`.
- **Status:** `EXISTS`
- **Implementation:** Polled via `/overview` every 2–5 s.
- **Constraints on UI:** Reflects unacknowledged and active PLC alarms.

#### 37. Operational Status Strip Sentence
- **UI Data Point:** Plain-language operational sentence ("3 of 3 machines running · 5 alarms · Early warning on the cooler since 14:11:05").
- **Source Today:** `GET /api/monitor/overview` (`overview.py:118-125`), assembled client-side in `app.js:316-354`.
- **Status:** `EXISTS`
- **Implementation:** Computed from `overview.rollup.online`, `overview.rollup.active_alarms`, and earliest active episode start time.
- **Constraints on UI:** When multiple machines fail, aggregates to count ("2 machines need attention").

#### 38. "Last Cycle Checked" in Status Strip
- **UI Data Point:** "Last cycle checked 14:05:12".
- **Source Today:** `intelligence.processed_cycle.completed_at`. **Not exposed by any API** (Gap G22).
- **Status:** `MISSING` (Gap G22)
- **Implementation:** Requires adding `last_cycle_checked_at` to overview rollup.
- **Constraints on UI:** Omitted or replaced with `last_data_at` until backend exposes cycle verification time.

---

### 3.7 Event Log Panel

#### 39. Chronological Event Log Rows
- **UI Data Point:** List of newest 4 system events (alarms raised, early warnings opened/escalated, AI notes ready).
- **Source Today:**
  - Alarms: `GET /api/monitor/plc-alarms?limit=4` (`plc_alarms.py:1384-1403`) from `telemetry.alarm_transition`.
  - Anomalies: `GET /api/monitor/anomalies?limit=4` (`anomalies.py:48-65`) from `intelligence.anomaly_episode`.
  - AI notes: Stored diagnoses in `intelligence.diagnosis` / runs.
- **Status:** `PARTIAL` (Gap G17)
- **Implementation:** Alarms and anomalies exist on separate endpoints with distinct schemas. The UI must poll both endpoints, normalize rows into a common shape, and merge-sort by timestamp.
- **Constraints on UI:** No unified `/events` endpoint exists. Polling two endpoints introduces occasional interleaving jitter.

#### 40. Event Row Priority Shape & Iris Mark
- **UI Data Point:** Priority shape glyph or mini iris icon beside event timestamp.
- **Source Today:** `ActiveAlarm.priority`, `Episode.severity`.
- **Status:** `EXISTS`
- **Implementation:** Evaluated directly from response fields.
- **Constraints on UI:** None.

---

### 3.8 Story Player & Simulation Controls

#### 41. Scrubber Track & Event Markers
- **UI Data Point:** Progress slider with colored tick marks indicating alarm/anomaly occurrences.
- **Source Today:** Prototype timeline scrubber. In live backend, corresponds to historical timeline (`GET .../dashboard` `timeline.alarms`, `timeline.episodes` in `machine.py:401-406`).
- **Status:** `PARTIAL` (Gap G17)
- **Implementation:** Single-machine timeline is available in `/dashboard`. Plant-level historical timeline across all machines does not exist (Gap G17).
- **Constraints on UI:** In live operation, scrubber is replaced by live monitoring or a historical time range picker.

#### 42. Play / Pause & Speed Controls (1x, 8x, 30x)
- **UI Data Point:** Playback speed buttons, pause/play toggle, restart.
- **Source Today:** Client simulation clock (`clock.js`).
- **Status:** `PRESENTATION`
- **Implementation:** Only relevant for recorded demo simulation. Live factory stack runs in wall-clock real time.
- **Constraints on UI:** Disabled when switched to live source.

#### 43. Reduce Motion Accessibility Switch
- **UI Data Point:** Button and `prefers-reduced-motion` integration disabling decorative transitions.
- **Source Today:** Browser media query and local state.
- **Status:** `PRESENTATION`
- **Implementation:** Toggles `.reduce-motion` class on root container.
- **Constraints on UI:** Strictly client-side.

#### 44. Theme Switcher (Auto / Light / Dark)
- **UI Data Point:** Header segment switch overriding OS color scheme.
- **Source Today:** Local CSS tokens and `localStorage`.
- **Status:** `PRESENTATION`
- **Implementation:** Modifies `data-theme` attribute on root element.
- **Constraints on UI:** Strictly client-side.

