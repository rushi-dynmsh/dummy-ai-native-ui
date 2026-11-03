# MedIQ Living Plant Prototype: Backend Backing Map

This document maps every data point and dynamic behaviour in the MedIQ "Living Plant" prototype (Approach 2, grounded UI) to its real backend source.

---

## 1. Executive Summary

| Category | Count | Percentage | Definition |
|---|---|---|---|
| **EXISTS** | 21 | 44.7% | Served today as the UI needs it via available APIs and DB models. |
| **PARTIAL** | 15 | 31.9% | Data exists in backend tables or single-machine APIs, but lacks the necessary shape, granularity, aggregation, or push delivery. |
| **MISSING** | 1 | 2.1% | Not provided by any current backend service, table, or endpoint. Linked to gaps. |
| **PRESENTATION** | 10 | 21.3% | Purely front-end visual choreography, calm outlining, easing, palette studio, or client preference; no backend data required. |
| **Total** | **47** | **100%** | Comprehensive inventory across all prototype views and components. |

### Top 5 Blockers & Recommended Resolutions

1. **Unified Plant-Wide Events & Hierarchy Aggregation (G17 — PARTIAL)**
   - *Problem:* Displaying the full ISA-95 logical tree, recent multi-machine events feed, and multi-machine timelines requires the client to issue separate N+1 queries across `/overview`, `/machines/.../dashboard`, `/plc-alarms`, and `/anomalies`.
   - *Recommendation:* **Add a backend capability.** Add a unified plant-level `/api/monitor/events` endpoint that returns a merged, time-ordered feed of alarms and anomaly episodes, and provide a single hierarchy payload including component counts.

2. **Real-time Push Channel for Telemetry and Alarms (G23 — PARTIAL)**
   - *Problem:* Sub-second animations (pipe fluid dash travel, cooler fan rotation, immediate alarm state transitions) currently rely on polling HTTP GET (`/overview`, `/dashboard`, `/plc-alarms/active`). Fast polling (e.g. 500 ms) stresses the local factory PC and risks HTTP thread exhaustion.
   - *Recommendation:* **Add a backend capability.** Expose a Server-Sent Events (SSE) stream (`GET /api/monitor/stream` or `GET /machines/{m}/stream`) in FastAPI backed by PostgreSQL `LISTEN/NOTIFY` or an internal MQTT subscription for alarm transitions, cycle completions, and 1-second telemetry averages.

3. **Multi-tier Alarm Limit Setpoints on Series and Dashboard (G05 / G26 — PARTIAL)**
   - *Problem:* The sensor trace chart and sensor cards display HI/HIHI/LO limit thresholds (`HI 43 · HIHI 53`). The backend stores limits in `asset.device_alarm_version.limit_value`, but `GET .../dashboard` latest values and `GET .../series` only expose transducer engineering limits (`range_low`, `range_high`).
   - *Recommendation:* **Add a backend capability.** Extend `LatestValue` in `mediq_console/monitor/machine.py:359-379` to include `limits: list[AlarmLimitOut]` joined from `asset.device_alarm_version` in `queries.py:SQL_LATEST_VALUES`.

4. **Machine Type in Plant Overview (G21 — PARTIAL)**
   - *Problem:* The plant map needs each machine's type (`HydraulicPowerUnit`, `HydraulicPress`, `AirCompressor`) to draw the matching SVG glyph. Currently, `GET /api/monitor/overview` returns `OverviewMachine` without `asset_type`; only the single-machine page `GET /machines/{site}/{machine}` returns it.
   - *Recommendation:* **Add a backend capability.** Include `asset_type: { name, version }` in `OverviewMachine` (`mediq_console/monitor/overview.py:67-70`). The underlying query `SQL_MACHINE_DETAIL` already selects `t.name AS asset_type_name, t.version AS asset_type_version`; it only needs to be joined in `gather_snapshot` / `build_hierarchy`.

5. **Cycle Completed Timestamp on Overview Rollups (G22 — PARTIAL)**
   - *Problem:* While `MachineRollup` now provides `watch_state` (`"watched" | "not_watched" | "stalled"`) and `watch_reason`, the exact `completed_at` timestamp of the latest evaluated cycle is only available on `GET /machines/{site}/{machine}/cycles` and is absent from plant overview rollups.
   - *Recommendation:* **Add a backend capability.** Add `last_cycle_checked_at: datetime | None` to `MachineRollup` in `mediq_console/monitor/overview.py` by selecting `max(completed_at)` from `intelligence.processed_cycle`.

---

## 2. What Changed in the Console Since the Prototype

The Console codebase has evolved considerably since the prototype was drafted:
- **Assistant Proxy (`mediq_console.assistant.proxy`):** Reverse proxy installed on `/api/assistant/{path}` (`app.py:130`, `proxy.py:1-211`). Forwards `chat`, `threads`, `runs`, and `agents` to the upstream AI service. Full SSE streaming supported on `GET /api/assistant/threads/{id}/stream`.
- **Docked Assistant Interface (`mediq-console/frontend/src/assistant/AnswerView.tsx`):** Official Console copilot architecture with prominent `safety_flags` hazard alerts, Markdown analysis text, confidence and machine pills, expandable claims citing read-only MCP tools (`get_channel_trend`, `compare_windows`), `data_gaps` disclosure, and suggested follow-up prompts.
- **Watch State on Rollups:** `MachineRollup` and `GroupRollup` now return `watch_state` (`"watched"`, `"not_watched"`, `"stalled"`) and `watch_reason` (`machine.py:78-107`, `overview.py:54-65`), distinguishing unanalysed machines from healthy ones.
- **Transducer Limits in Dashboard:** `GET /api/monitor/machines/{site}/{machine}/dashboard` and `GET .../tags` now return `range_low` and `range_high` directly on each channel (`machine.py:394`, `series_api.py:66`).
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
- **Implementation:** Polled via `GET /api/monitor/overview` every 2–5 s. Worst open condition takes precedence (urgent/critical alarm -> Act now; high alarm or critical anomaly -> Needs attention; medium/warning -> Watch; none -> Healthy).
- **Constraints on UI:** Latency is bounded by poll interval (2–5 s) plus query execution (~15 ms).

#### 5. Floor Alarm Glow
- **UI Data Point:** Radial glow beneath machine chassis in alarm color.
- **Source Today:** `GET /api/monitor/overview` (`overview.py:54-65`) fields `rollup.active_alarms > 0` and `rollup.highest_priority`. Table: `telemetry.alarm_state`.
- **Status:** `EXISTS`
- **Implementation:** Derived from the same overview poll. The glow rendering is client SVG driven.
- **Constraints on UI:** Glow disappears as soon as active alarms clear.

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
- **Implementation:** Polled via single-machine `/dashboard` every 1–2 s. Dash offset updates via CSS/JS animation loop.
- **Constraints on UI:** Requires polling individual machine dashboards; not available on plant overview.

#### 8. Cooler Fan Rotation
- **UI Data Point:** Rotation of cooler impeller at rate proportional to cooling water flow.
- **Source Today:** `GET /api/monitor/machines/{site}/{machine}/dashboard` (`machine.py:418-440`) field `latest[].value` for `flow.cooling`.
- **Status:** `PARTIAL` (Gap G23)
- **Implementation:** Driven by scalar value from `/dashboard`. Rotation stops if reading is zero or stale.
- **Constraints on UI:** Requires `/dashboard` polling.

#### 9. Eliminated Cycle Sweep Beam (Grounded)
- **UI Data Point:** Simulated laser scanning sweep removed in grounded UI.
- **Source Today:** Client presentation; previously simulated laser scanning beam across plant.
- **Status:** `PRESENTATION`
- **Implementation:** Sweeping beam eliminated to prevent visual clutter. Deterministic cycle verification is now communicated truthfully through `watch_state` chips on the machine cards and status strip.
- **Constraints on UI:** None.

#### 10. Machine Hover & Drilldown
- **UI Data Point:** Cursor pointer, hover focus ring, and click navigation into machine view.
- **Source Today:** Client DOM & SVG event handlers (`plant.js:191-212`, `app.js:306-313`).
- **Status:** `PRESENTATION`
- **Implementation:** Smooth cubic easing camera transition (600 ms).
- **Constraints on UI:** Instant viewport cut when `prefers-reduced-motion` is active.

---

### 3.2 Machine View (Process Flow Schematic)

#### 11. Process Flow Schematic & Components
- **UI Data Point:** Layout of pump, motor, switching valve, cooler, and tank with connecting piping.
- **Source Today:** `GET /api/monitor/machines/{site}/{machine}` (`machine.py:346-350`), table `asset.component`.
- **Status:** `PARTIAL` (Gap G19)
- **Implementation:** Component inventory is queried from DB. Physical piping schematic is rendered from SVG template for `HydraulicPowerUnit`.
- **Constraints on UI:** Schematic layout is template-based, not dynamically wired from P&ID graph in DB.

#### 12. Component Fault Glow
- **UI Data Point:** Radial glow around individual equipment blocks matching fault severity.
- **Source Today:** `GET /machines/.../plc-alarms/active` (`plc_alarms.py:98`) and `GET .../anomalies` (`anomalies.py:67`).
- **Status:** `EXISTS`
- **Implementation:** Cross-references active alarms and open episodes by `component` code every 2 s.
- **Constraints on UI:** Updates whenever machine alarms or anomalies update.

#### 13. Sensor Pins & Stem Lines
- **UI Data Point:** Physical pin locations and connecting lines to sensor readout cards.
- **Source Today:** `GET /api/monitor/machines/{site}/{machine}/dashboard` (`machine.py:418-440`), table `asset.channel`.
- **Status:** `EXISTS`
- **Implementation:** 13 channels returned with slot, name, engineering unit, and parent component.
- **Constraints on UI:** Stem anchor coordinates are defined in machine type SVG templates.

#### 14. Live Sensor Values & Engineering Units
- **UI Data Point:** Scalar readouts (e.g. `45.2 bar`, `42.1 °C`) and stale indicator.
- **Source Today:** `GET /api/monitor/machines/{site}/{machine}/dashboard` (`machine.py:418`), table `telemetry.measurement`.
- **Status:** `EXISTS`
- **Implementation:** Polled via `/dashboard` every 1–2 s. Stale flag evaluated server-side.
- **Constraints on UI:** Bound to polling interval.

#### 15. Sensor Alarm Marker Glyphs
- **UI Data Point:** ISA-18.2 shape glyphs (urgent square, high triangle, medium diamond, low circle) beside out-of-spec sensors.
- **Source Today:** `GET /machines/.../plc-alarms/active` (`plc_alarms.py:64`), table `telemetry.alarm_state`.
- **Status:** `PARTIAL` (Gap G05)
- **Implementation:** Active alarm endpoint returns alarm list. Requires client to match alarm name or component to channel slot.
- **Constraints on UI:** Direct channel slot mapping requires gap G05 resolution.

#### 16. Process Fluid Loops & Cooler Fan
- **UI Data Point:** Animated fluid dash streams along oil and water circuits; spinning cooler impeller.
- **Source Today:** `GET /api/monitor/machines/{site}/{machine}/dashboard` (`machine.py:418-440`).
- **Status:** `EXISTS`
- **Implementation:** Dashes update at 60 fps client-side with speed keyed to live flow readings.
- **Constraints on UI:** Motion pauses when `prefers-reduced-motion` is enabled.

---

### 3.3 Sensor Trace View

#### 17. 5-Minute Waveform Chart
- **UI Data Point:** Continuous sensor history line over the last 300 seconds.
- **Source Today:** `GET /api/monitor/machines/{site}/{machine}/series` (`series_api.py:180-240`), table `telemetry.measurement`.
- **Status:** `PARTIAL` (Gap G25)
- **Implementation:** Queries raw or 1s downsampled points with `bucket_s = 1`. Requires resolving slot to integer `channel_id` before querying.
- **Constraints on UI:** Polled every 2–5 s.

#### 18. Alarm Limit Threshold Lines
- **UI Data Point:** Horizontal dashed reference lines (HI, HIHI, LO) with priority labels.
- **Source Today:** Transducer limits (`range_low`, `range_high`) in `GET /dashboard` (`machine.py:394`) and `GET /tags` (`series_api.py:66`); alarm setpoints in `asset.device_alarm_version` (`queries.py:196`).
- **Status:** `PARTIAL` (Gap G05 / G26)
- **Implementation:** Operational engineering ranges are served live in `/dashboard`. Multi-tier alarm limits (HI, HIHI) require joining `device_alarm_version` (gap G26).
- **Constraints on UI:** Renders operational ranges immediately; setpoint lines populate from config fallback.

#### 19. In-Alarm Subtitle Readout
- **UI Data Point:** Status subtitle indicating active alarm code (e.g. `in alarm: TS3_HI`).
- **Source Today:** `GET /machines/.../plc-alarms/active` (`plc_alarms.py:98`).
- **Status:** `PARTIAL` (Gap G05)
- **Implementation:** Read from active alarms array for the machine.
- **Constraints on UI:** Requires matching alarm tag to channel.

#### 20. AI Trend Observation Note
- **UI Data Point:** Natural language sensor summary note ("Rose 3.2 °C in last 4 minutes...").
- **Source Today:** Client heuristic in `sensor.js:8-20`. No backend standing REST endpoint generates card trend text.
- **Status:** `MISSING` (Gap G27)
- **Implementation:** MCP tool `get_channel_trend` exists for Copilot queries, but no automated card summarizer exists.
- **Constraints on UI:** Omitted or triggered via user prompt in docked Copilot.

#### 21. Safety Warning Banner
- **UI Data Point:** High-priority safety alert when oil temperature or pressure reaches unsafe thresholds.
- **Source Today:** `POST /api/assistant/chat` (`AnswerView.tsx:75`), field `assistant_message.answer.safety_flags`.
- **Status:** `EXISTS`
- **Implementation:** Displayed prominently when `safety_flags` are returned in an analysis response for the channel or equipment.
- **Constraints on UI:** Grounded strictly in safety limits verified by domain experts.

---

### 3.4 Logical Hierarchy View

#### 22. 7-Column ISA-95 Tree Layout
- **UI Data Point:** Structural hierarchy from Site → Area → Line → Cell → Machine → Component → Sensor.
- **Source Today:** `GET /overview` (`overview.py:108`), `GET /machines/...` (`machine.py:346`), `GET .../tags` (`series_api.py:30`).
- **Status:** `PARTIAL` (Gap G17)
- **Implementation:** Top 5 tiers (Site to Machine) come from `/overview`. Components and sensors require separate machine-level calls.
- **Constraints on UI:** Requires plant-level structural query to avoid N+1 fetches on large facilities.

#### 23. Node State Lighting & Rollup
- **UI Data Point:** Node health borders and parent line/area worst-state aggregation.
- **Source Today:** `GET /api/monitor/overview` (`overview.py:115-128`), table `intelligence.anomaly_episode`.
- **Status:** `EXISTS`
- **Implementation:** Evaluated deterministically using ISA-18.2 priority ranking.
- **Constraints on UI:** Updates with every overview poll.

#### 24. Leaf Sensor Value Readouts
- **UI Data Point:** Live value and unit displayed on each leaf sensor node in tree.
- **Source Today:** `GET /api/monitor/machines/{site}/{machine}/dashboard` (`machine.py:418-440`) `latest[]`.
- **Status:** `PARTIAL` (Gap G17)
- **Implementation:** Requires polling `/dashboard` for every machine in the plant.
- **Constraints on UI:** Leaf values should be lazy-loaded on expansion rather than continuously polled plant-wide.

#### 25. Physical-to-Logical Morph Animation
- **UI Data Point:** Smooth animation morphing machines from physical floor coordinates to logical grid coordinates.
- **Source Today:** Client SVG coordinate interpolation (`logical.js:77-106`).
- **Status:** `PRESENTATION`
- **Implementation:** Cubic easing between floor anchor and logical grid coordinate (800 ms).
- **Constraints on UI:** Instant toggle when `prefers-reduced-motion` is enabled.

---

### 3.5 AI Copilot & Analysis Interface

#### 26. AI Iris State Expressions
- **UI Data Point:** Compact geometric terminal mark reflecting agent operational state (watching, answering, explaining, urgent).
- **Source Today:** SSE stream `GET /api/assistant/threads/{id}/stream` (`proxy.py:179-181`). Autonomous state triggers do not exist (Gap G24).
- **Status:** `PARTIAL` (Gap G24)
- **Implementation:** In reactive chat, `proxy.py` relays SSE `step` (looking/answering) and `message` (explaining). Proactive state changes during background monitoring require gap G24.
- **Constraints on UI:** Animate during active user chat or incident triage.

#### 27. Contextual Equipment Bounding Outline
- **UI Data Point:** Subtle 1.5px high-contrast bounding outline around active equipment during alert inspection.
- **Source Today:** Client SVG presentation (`ai.js:31-43`), targeting equipment SVG anchors.
- **Status:** `PRESENTATION`
- **Implementation:** Replaced bouncing spring overshoot animations with calm, static bounding geometry.
- **Constraints on UI:** Purely client-side presentation driven by current machine or component focus.

#### 28. Eliminated Laser Scan & Dimming
- **UI Data Point:** Removal of artificial stage dimming and sweeping laser scan lines.
- **Source Today:** Client presentation; previously dimmed background by 28% with sweep line.
- **Status:** `PRESENTATION`
- **Implementation:** Eliminated artificial darkening to preserve operator situational awareness across all lines.
- **Constraints on UI:** Focus is conveyed through crisp status chips and structural outlines.

#### 29. Eliminated Camera Patrol Tour
- **UI Data Point:** Removal of autonomous camera roving between machines.
- **Source Today:** Client presentation; previously commandeered camera to glide across equipment.
- **Status:** `PRESENTATION`
- **Implementation:** Autonomous roving camera tours removed; camera remains stable where the operator points.
- **Constraints on UI:** Eliminates operator disorientation and motion sickness during live control-room monitoring.

#### 30. Investigation Step Status Line
- **UI Data Point:** Live streaming tool executions (`🔧 Calling get_channel_trend...`, `🔧 compare_windows`).
- **Source Today:** SSE event: `step` from `/api/assistant/threads/{id}/stream` (`use-the-chat-api_console.md:135`).
- **Status:** `EXISTS`
- **Implementation:** Emitted live over the Assistant SSE proxy during reactive technician queries.
- **Constraints on UI:** Provides complete transparency into data retrieval without fake autonomous simulation.

#### 31. Safety Hazard Instruction Banner
- **UI Data Point:** Prominent amber/red alert banner rendered at the top of Copilot when safety flags are present.
- **Source Today:** `POST /api/assistant/chat`, field `assistant_message.answer.safety_flags` (`AnswerView.tsx:75`).
- **Status:** `EXISTS`
- **Implementation:** Rendered directly from `safety_flags` array in assistant answer payload.
- **Constraints on UI:** Alerts technicians to critical physical hazards before they approach equipment.

#### 32. Copilot Structured Diagnosis & Findings
- **UI Data Point:** Structured markdown explanation rendered in docked Copilot panel with findings.
- **Source Today:** `POST /api/assistant/chat` (`proxy.py:204`), field `assistant_message.answer.answer` (`AnswerView.tsx:85`).
- **Status:** `EXISTS`
- **Implementation:** Returned as Markdown content from `/api/assistant/chat`. Rendered directly into conversation view.
- **Constraints on UI:** Reactive to operator prompts and alarm triage.

#### 33. Verified Claims & MCP Tool Citations
- **UI Data Point:** Expandable claims list citing read-only MCP tools (`get_channel_trend`, `compare_windows`).
- **Source Today:** `POST /api/assistant/chat`, field `assistant_message.answer.claims[].sources` (`AnswerView.tsx:106`).
- **Status:** `EXISTS`
- **Implementation:** Directly populated from `claims` and `sources` in structured answer object. Displays confidence pill and data gaps.
- **Constraints on UI:** AI explains detector evidence; detection remains deterministic with zero ML.

#### 34. Suggested Follow-Up Prompt Chips
- **UI Data Point:** Clickable suggested prompt buttons ("Is the pump affected?", "What should I check first?").
- **Source Today:** `POST /api/assistant/chat`, field `assistant_message.answer.follow_up_questions` (`AnswerView.tsx:136`).
- **Status:** `EXISTS`
- **Implementation:** Returned as an array of up to 3 strings in the assistant answer.
- **Constraints on UI:** Clicking sends the prompt directly into the active session without re-typing.

#### 35. Docked Copilot Q&A Composer
- **UI Data Point:** Docked chat composer with multi-turn conversation thread support.
- **Source Today:** `POST /api/assistant/chat` and `/api/assistant/threads/{id}/stream` (`proxy.py:204-211`).
- **Status:** `EXISTS`
- **Implementation:** Client submits `POST /api/assistant/chat`, receives run ID, and streams tokens and tool events over SSE.
- **Constraints on UI:** Single-concurrency thread isolation (`409 thread_busy`).

---

### 3.6 Header Bar & Status Line

#### 36. Plant Clock Time & Date
- **UI Data Point:** Formatted timestamp ("Fri 23 Oct 2026 · 14:12:05").
- **Source Today:** `asset.site.timezone` from `GET /api/monitor/overview` (`overview.py:101`). Formatted locally via `Intl.DateTimeFormat`.
- **Status:** `EXISTS`
- **Implementation:** Site timezone is fetched on load. Formatted using site timezone offset.
- **Constraints on UI:** All backend timestamps are UTC (`TIMESTAMPTZ`). Production runs wall-clock time in site timezone.

#### 37. Plant Alarm Count Badge
- **UI Data Point:** Top-right pill showing active alarm count and highest priority indicator.
- **Source Today:** `GET /api/monitor/overview` (`overview.py:110, :121-122`) fields `rollup.active_alarms`, `rollup.highest_priority`.
- **Status:** `EXISTS`
- **Implementation:** Polled via `/overview` every 2–5 s.
- **Constraints on UI:** Reflects unacknowledged and active PLC alarms.

#### 38. Operational Status Strip Sentence
- **UI Data Point:** Plain-language operational sentence ("3 of 3 machines running · 5 alarms · Early warning on the cooler since 14:11:05").
- **Source Today:** `GET /api/monitor/overview` (`overview.py:118-125`), assembled client-side in `app.js:316-354`.
- **Status:** `EXISTS`
- **Implementation:** Computed from `overview.rollup.online`, `overview.rollup.active_alarms`, and earliest active episode start time.
- **Constraints on UI:** Plain English status summary for wall-board readability.

#### 39. Machine Watch State & Staleness
- **UI Data Point:** Status badge displaying deterministic watch state (`WATCHED`, `NOT_WATCHED`, `STALLED`) and `watch_reason`.
- **Source Today:** `GET /api/monitor/overview` (`overview.py:118`) and `/machines/{site}/{machine}` (`machine.py:82-152`).
- **Status:** `EXISTS`
- **Implementation:** Computed server-side from recent cycle processing timestamps in `intelligence.processed_cycle`.
- **Constraints on UI:** Replaces speculative cycle sweep animations with an explicit, verified status badge.

#### 40. Last Cycle Checked Timestamp
- **UI Data Point:** Timestamp of the most recently verified machine cycle.
- **Source Today:** `GET /api/monitor/machines/{site}/{machine}/cycles` (`machine.py:382`), table `intelligence.processed_cycle`.
- **Status:** `PARTIAL` (Gap G22)
- **Implementation:** Available on single-machine `/cycles` endpoint; omitted from overview rollups.
- **Constraints on UI:** Requires query to `/cycles` for machine view; plant-level overview rollup requires gap G22 resolution.

#### 41. Live Palette Studio & Theme Tokens
- **UI Data Point:** Color Palette Studio with live interactive Primary, Secondary, Tertiary, and Background custom controls + 5 presets.
- **Source Today:** Client CSS token engine in `palette.js` and `styles.css`.
- **Status:** `PRESENTATION`
- **Implementation:** Modifies CSS root variables dynamically and persists in `localStorage` while adhering to WCAG contrast standards.
- **Constraints on UI:** Strictly client-side presentation.

---

### 3.7 Event Log Panel

#### 42. Chronological Event Log Rows
- **UI Data Point:** List of newest 4 system events (alarms raised, early warnings opened/escalated, AI notes ready).
- **Source Today:** `GET /api/monitor/plc-alarms?limit=4` (`plc_alarms.py:1384`) and `GET /api/monitor/anomalies?limit=4` (`anomalies.py:48`).
- **Status:** `PARTIAL` (Gap G17)
- **Implementation:** Alarms and anomalies exist on separate endpoints with distinct schemas. UI polls both and merge-sorts by timestamp.
- **Constraints on UI:** No unified `/events` endpoint exists. Polling two endpoints introduces occasional interleaving jitter.

#### 43. Event Row Priority Shape & Iris Mark
- **UI Data Point:** Priority shape glyph or mini iris icon beside event timestamp.
- **Source Today:** `ActiveAlarm.priority`, `Episode.severity`.
- **Status:** `EXISTS`
- **Implementation:** Evaluated directly from response fields.
- **Constraints on UI:** None.

---

### 3.8 Story Player & Simulation Controls

#### 44. Scrubber Track & Event Markers
- **UI Data Point:** Progress slider with colored tick marks indicating alarm/anomaly occurrences.
- **Source Today:** In live backend, corresponds to historical timeline (`GET .../dashboard` `timeline.alarms`, `timeline.episodes` in `machine.py:401-406`).
- **Status:** `PARTIAL` (Gap G17)
- **Implementation:** Single-machine timeline is available in `/dashboard`. Plant-level historical timeline across all machines does not exist (Gap G17).
- **Constraints on UI:** In live operation, scrubber is replaced by live monitoring or a historical time range picker.

#### 45. Play / Pause & Speed Controls (1x, 8x, 30x)
- **UI Data Point:** Playback speed buttons, pause/play toggle, restart.
- **Source Today:** Client simulation clock (`clock.js`).
- **Status:** `PRESENTATION`
- **Implementation:** Only relevant for recorded demo simulation. Live factory stack runs in wall-clock real time.
- **Constraints on UI:** Disabled when switched to live source.

#### 46. Reduce Motion Accessibility Switch
- **UI Data Point:** Button and `prefers-reduced-motion` integration disabling decorative transitions.
- **Source Today:** Browser media query and local state.
- **Status:** `PRESENTATION`
- **Implementation:** Toggles `.reduce-motion` class on root container.
- **Constraints on UI:** Strictly client-side.

#### 47. Theme Switcher (Auto / Light / Dark)
- **UI Data Point:** Header segment switch overriding OS color scheme.
- **Source Today:** Local CSS tokens and `localStorage`.
- **Status:** `PRESENTATION`
- **Implementation:** Modifies `data-theme` attribute on root element.
- **Constraints on UI:** Strictly client-side.
