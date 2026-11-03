// Structured map of prototype UI behaviours and data points to real MedIQ backend sources.
// Rendered by the "How this works" overlay panel on each screen.
// Each entry contains: id, name, status, source, bullets (2-3 short strings), gap ID, and DOM selector.

export const VALID_STATUSES = ["EXISTS", "PARTIAL", "MISSING", "PRESENTATION"];

export const TECH_NOTES = {
  plant: [
    {
      id: "plant-hierarchy-layout",
      name: "Floor layout & hierarchy",
      status: "EXISTS",
      source: "GET /api/monitor/overview (overview.py:108), tables asset.site, asset.area, asset.line, asset.cell, asset.machine",
      bullets: [
        "Polled every 10–30 s from the Console overview endpoint, returning the full ISA-95 asset hierarchy.",
        "Static once loaded; areas become halls, lines become rows, and cells become equipment bays.",
        "Shows empty stage with reconnect alert if the gateway or database is unreachable.",
      ],
      gap: null,
      selector: "#layer-plant",
    },
    {
      id: "plant-grid-coordinates",
      name: "Building-plan grid coordinates",
      status: "PARTIAL",
      source: "Client-side SVG geometry in plant.js:156-166; real coordinates missing in asset schema",
      bullets: [
        "Grid letters A–J and row numbers 1–6 are calculated geometrically from the SVG viewBox.",
        "Machine code hydraulic-rig-01 exists in DB, but its grid location 'C3' is synthesized.",
        "Requires real plant floor-plan coordinates and drawing dimensions in asset metadata (gap G18).",
      ],
      gap: "G18",
      selector: "#layer-plant .t-grid",
    },
    {
      id: "plant-machine-drawing",
      name: "Machine SVG glyph & asset type",
      status: "PARTIAL",
      source: "GET /api/monitor/machines/{site}/{machine} (machine.py:337), table asset.asset_type",
      bullets: [
        "Machine type name HydraulicPowerUnit exists in DB and is served on the single-machine page.",
        "GET /overview does not return asset_type on machines, requiring N round-trips for N machines (gap G21).",
        "Frontend falls back to generic box if asset type is missing or unmodeled.",
      ],
      gap: "G21",
      selector: "#layer-plant [data-machine]",
    },
    {
      id: "plant-machine-state",
      name: "Machine state word & color",
      status: "EXISTS",
      source: "GET /api/monitor/overview (overview.py:67-70), queries.py:SQL_ROLLUP_ALARMS, SQL_ROLLUP_ANOMALIES",
      bullets: [
        "Polled via /overview every 2–5 s; computes rollup across active alarms and anomaly episodes.",
        "Worst open condition sets state word: Act now (urgent), Needs attention (high/critical), Watch, Healthy.",
        "Deterministic rule with zero ML; state updates within one polling cycle of backend transition.",
      ],
      gap: null,
      selector: "#layer-plant .t-mach-sub",
    },
    {
      id: "plant-floor-glow",
      name: "Floor alarm radial glow",
      status: "EXISTS",
      source: "GET /api/monitor/overview (overview.py:54-65), table telemetry.alarm_state",
      bullets: [
        "Driven by rollup.active_alarms > 0 and rollup.highest_priority from the overview response.",
        "Renders radial SVG glow under chassis; pulse opacity eases via client animation loop.",
        "Glow disappears when all active alarms for the machine are cleared.",
      ],
      gap: null,
      selector: "#layer-plant ellipse[fill*='glow']",
    },
    {
      id: "plant-early-warning-ring",
      name: "Early-warning dashed ring",
      status: "EXISTS",
      source: "GET /api/monitor/overview (overview.py:54-65), table intelligence.anomaly_episode",
      bullets: [
        "Driven by rollup.open_anomalies > 0 and rollup.highest_severity (warning = amber, critical = red).",
        "Reflects statistical baseline drift detected per 60s cycle by mediq-intelligence.",
        "Indicates early anomaly detection, strictly separated from diagnosis or alarm limits.",
      ],
      gap: null,
      selector: "#layer-plant rect[stroke-dasharray='7 6']",
    },
    {
      id: "plant-pipe-flow",
      name: "Pipe fluid flow speed",
      status: "PARTIAL",
      source: "GET /api/monitor/machines/{site}/{machine}/dashboard (machine.py:418), table telemetry.measurement",
      bullets: [
        "Flow sensor scalars (flow.working, flow.cooling) are read from /dashboard latest values.",
        "Requires polling /dashboard for each machine; no real-time push channel exists (gap G23).",
        "Dash offset animates at 60 fps client-side, stepping speed discretely on each poll response.",
      ],
      gap: "G23",
      selector: "#layer-plant path[stroke*='oil'], #layer-plant path[stroke*='water']",
    },
    {
      id: "plant-cooler-fan",
      name: "Cooler fan rotation",
      status: "PARTIAL",
      source: "GET /api/monitor/machines/{site}/{machine}/dashboard (machine.py:418), table telemetry.measurement",
      bullets: [
        "Rotation speed scales with flow.cooling reading relative to nominal baseline (10.6 l/min).",
        "Data exists in single-machine dashboard, but missing from plant-level overview.",
        "Fan stays static or at resting speed when sensor is stale or offline.",
      ],
      gap: "G23",
      selector: "#layer-plant .fan",
    },
    {
      id: "plant-cycle-sweep",
      name: "Eliminated cycle sweep beam",
      status: "PRESENTATION",
      source: "Client presentation; previously simulated laser scanning sweep across plant floor",
      bullets: [
        "Simulated laser scanning sweep removed to eliminate imaginary background animations.",
        "Cycle verification status is now communicated truthfully via watch_state on machine cards.",
        "Eliminates distraction for wall-board and desktop monitoring operations.",
      ],
      gap: null,
      selector: "#layer-ai",
    },
    {
      id: "plant-navigation",
      name: "Machine hover & drilldown",
      status: "PRESENTATION",
      source: "Client DOM & SVG interaction in plant.js:191-212 and app.js:306-313",
      bullets: [
        "Hover outline ring, pointer cursor, and click/Enter navigation into side-view machine camera.",
        "Camera smoothly zooms into machine anchor using cubic easing (600 ms).",
        "Respects prefers-reduced-motion by cutting straight to target view without travel.",
      ],
      gap: null,
      selector: "#layer-plant .clickable",
    },
  ],

  machine: [
    {
      id: "mach-schematic-layout",
      name: "Process flow schematic",
      status: "PARTIAL",
      source: "GET /api/monitor/machines/{site}/{machine} (machine.py:346), table asset.component",
      bullets: [
        "Component list (main_pump, motor, switching_valve, cooler, tank) is queried from asset.component.",
        "Physical P&ID layout and pipe connections are hardcoded SVG per asset type, not modeled in DB (gap G19).",
        "Component naming now matches asset_type.yaml and commissioning.yaml (gap G11 closed).",
      ],
      gap: "G19",
      selector: "#layer-machine",
    },
    {
      id: "mach-component-glow",
      name: "Component fault glow",
      status: "EXISTS",
      source: "GET /machines/.../plc-alarms/active (plc_alarms.py:98) and GET .../anomalies (anomalies.py:67)",
      bullets: [
        "Cross-references active alarms and open anomaly episodes by component code.",
        "Faulty equipment block glows with pulsing radial halo matching the highest severity.",
        "Updates dynamically every 2 s while machine page is active.",
      ],
      gap: null,
      selector: "#layer-machine ellipse[fill*='glow']",
    },
    {
      id: "mach-sensor-pins",
      name: "Sensor pins & stem lines",
      status: "EXISTS",
      source: "GET /api/monitor/machines/{site}/{machine}/dashboard (machine.py:418), table asset.channel",
      bullets: [
        "13 sensors are queried via /dashboard latest list, carrying name, slot, unit, and component.",
        "Pin stem lines and readout cards connect physical measuring locations to readable cards.",
        "Pin (x, y) coordinates on the equipment body are defined in asset layout templates.",
      ],
      gap: null,
      selector: "#layer-machine .clickable",
    },
    {
      id: "mach-live-values",
      name: "Live sensor readouts & units",
      status: "EXISTS",
      source: "GET /api/monitor/machines/{site}/{machine}/dashboard (machine.py:418), table telemetry.measurement",
      bullets: [
        "Polled via /dashboard latest values every 1–2 s; shows scalar value and engineering unit.",
        "Stale flag is evaluated server-side (source_ts older than 2 × stale_after_ms).",
        "Numeric formatting adjusts decimal precision automatically based on magnitude.",
      ],
      gap: null,
      selector: "#layer-machine .t-pin-v",
    },
    {
      id: "mach-alarm-markers",
      name: "Sensor alarm marker glyphs",
      status: "PARTIAL",
      source: "GET /machines/.../plc-alarms/active (plc_alarms.py:64), table telemetry.alarm_state",
      bullets: [
        "Alarm markers use ISA-18.2 shapes: urgent square, high triangle, medium diamond, low circle.",
        "Active alarm endpoint returns alarm_id and component, but omits watched_slot or tag_id (gap G05).",
        "Frontend must cross-reference alarm name to slot until limit attributes are exposed directly.",
      ],
      gap: "G05",
      selector: "#layer-machine path[d*='M']",
    },
    {
      id: "mach-fluid-loops",
      name: "Process fluid loops & cooler fan",
      status: "EXISTS",
      source: "GET /api/monitor/machines/{site}/{machine}/dashboard (machine.py:418), table telemetry.measurement",
      bullets: [
        "Side-view oil and cooling-water pipe loops flow proportionally to working and cooling flow.",
        "Cooler fan rotates according to live cooling water flow sensor rate.",
        "Disables motion smoothly when reduce motion mode is activated.",
      ],
      gap: null,
      selector: "#layer-machine path[stroke*='oil'], #layer-machine path[stroke*='water']",
    },
  ],

  sensor: [
    {
      id: "sensor-waveform-chart",
      name: "5-minute waveform chart",
      status: "PARTIAL",
      source: "GET /api/monitor/machines/{site}/{machine}/series (series_api.py:180), table telemetry.measurement",
      bullets: [
        "Queries raw measurements or 1s rollups over the last 300 seconds (bucket_s = 1).",
        "Series route requires integer channel_id; does not accept semantic slot names (gap G25).",
        "Requires resolving slot to channel_id via /dashboard or /tags before querying series.",
      ],
      gap: "G25",
      selector: ".sp-chart",
    },
    {
      id: "sensor-limit-lines",
      name: "Alarm limit threshold lines",
      status: "PARTIAL",
      source: "GET /dashboard (machine.py:394 range_low/high) & asset.device_alarm_version (queries.py:196)",
      bullets: [
        "Draws horizontal dashed reference lines (HI, HIHI, LO) with labels in priority colors.",
        "Transducer engineering limits (range_low/high) exist in /dashboard; multi-tier alarm limits require joining gap G26.",
        "Sensor chart renders available operational limits without blocking on full alarm tiers.",
      ],
      gap: "G05",
      selector: ".sp-chart line",
    },
    {
      id: "sensor-in-alarm-subtitle",
      name: "In-alarm subtitle readout",
      status: "PARTIAL",
      source: "GET /machines/.../plc-alarms/active (plc_alarms.py:98), table telemetry.alarm_state",
      bullets: [
        "Displays alarm limits and identifies active alarm name (e.g. in alarm: TS3_HI).",
        "Active alarm state is served live, but limit threshold values must be merged from configuration.",
        "Requires extending ActiveAlarm with threshold numbers or joining limits in dashboard.",
      ],
      gap: "G05",
      selector: ".sp-sub",
    },
    {
      id: "sensor-ai-observation",
      name: "AI trend observation note",
      status: "MISSING",
      source: "Client heuristic in sensor.js:8-20; no backend endpoint generates sensor-level trend text",
      bullets: [
        "Generates natural language summary (e.g. Rose 3.2 °C in last 4 minutes while cooling flow fell).",
        "MCP tool get_channel_trend exists for AI copilot, but no standing REST endpoint provides card notes.",
        "Requires dedicated trend summarizer or omitting note in favor of user copilot prompt (gap G27).",
      ],
      gap: "G27",
      selector: ".sp-note",
    },
    {
      id: "sensor-safety-alert",
      name: "Safety warning banner",
      status: "EXISTS",
      source: "POST /api/assistant/chat (AnswerView.tsx:75), field assistant_message.answer.safety_flags",
      bullets: [
        "Displays high-priority safety banner when oil temperature or pressure reaches unsafe thresholds.",
        "Populated directly from the safety_flags array in the assistant structured answer object.",
        "Grounded in real physical operating bounds verified by domain experts.",
      ],
      gap: null,
      selector: ".sp-safety",
    },
  ],

  logical: [
    {
      id: "logical-tree-structure",
      name: "7-column ISA-95 tree layout",
      status: "PARTIAL",
      source: "GET /overview (overview.py:108), GET /machines/... (machine.py:346), GET .../tags (series_api.py:30)",
      bullets: [
        "Organizes equipment into Site → Area → Line → Cell → Machine → Component → Sensor columns.",
        "Site to Machine comes from /overview; components and sensors require separate machine-level calls.",
        "Requires plant-level structural query to avoid N+1 queries on large facilities (gap G17).",
      ],
      gap: "G17",
      selector: "#layer-logical",
    },
    {
      id: "logical-state-propagation",
      name: "Node state lighting & rollup",
      status: "EXISTS",
      source: "GET /api/monitor/overview (overview.py:115-128), table intelligence.anomaly_episode",
      bullets: [
        "Nodes glow with their operational health; parent lines and areas reflect the worst child state.",
        "Sensor leaves take alarm color; components reflect active episode severities.",
        "Calculated deterministically using ISA-18.2 priority rankings.",
      ],
      gap: null,
      selector: "#layer-logical rect[stroke]",
    },
    {
      id: "logical-leaf-readouts",
      name: "Leaf sensor value readouts",
      status: "PARTIAL",
      source: "GET /api/monitor/machines/{site}/{machine}/dashboard (machine.py:418), table telemetry.measurement",
      bullets: [
        "Numeric value and unit are printed on each sensor node in the rightmost tree column.",
        "Requires polling /dashboard for every machine in the plant; not aggregated in overview.",
        "For large plants, values should be fetched on node hover/expansion rather than polled continuously.",
      ],
      gap: "G17",
      selector: "#layer-logical .t-node-sub",
    },
    {
      id: "logical-morph-animation",
      name: "Physical-to-logical morphing",
      status: "PRESENTATION",
      source: "Client SVG coordinate interpolation in logical.js:77-106",
      bullets: [
        "Smoothly animates machine nodes from their physical floor anchors to tree coordinates (800 ms).",
        "Reinforces that the logical tree and the physical floor are views of the exact same plant.",
        "Instant transition when reduce motion is enabled.",
      ],
      gap: null,
      selector: "#layer-logical",
    },
  ],

  ai: [
    {
      id: "ai-iris-expressions",
      name: "AI iris mark expressions",
      status: "PARTIAL",
      source: "SSE /api/assistant/threads/{id}/stream (proxy.py:179); autonomous states missing in backend",
      bullets: [
        "Compact geometric terminal mark reflects agent operational state: watching, answering, explaining, or urgent.",
        "Answering and thinking states are synchronized with reactive SSE stream events during user chat.",
        "Unprompted autonomous state switches are grounded in background anomaly transitions (gap G24).",
      ],
      gap: "G24",
      selector: ".iris, .ai-status-pill",
    },
    {
      id: "ai-brackets-focus",
      name: "Contextual equipment bounding outline",
      status: "PRESENTATION",
      source: "Client SVG presentation in ai.js:31-43; targets equipment anchors",
      bullets: [
        "Subtle 1.5px high-contrast bounding outline around active equipment during alert triage.",
        "Replaced bouncing spring overshoot animations with calm, static bounding geometry.",
        "Pure client-side presentation driven by the currently focused machine or component.",
      ],
      gap: null,
      selector: ".ai-focus-group rect",
    },
    {
      id: "ai-spotlight-scan",
      name: "Eliminated laser scan & dimming",
      status: "PRESENTATION",
      source: "Client presentation; previously dimmed background by 28% with sweep line",
      bullets: [
        "Artificial stage dimming and sweeping laser scan lines have been completely eliminated.",
        "Preserves full plant visibility across all equipment bays so operators maintain total situational awareness.",
        "Focus is conveyed through crisp status chips and structural outlines rather than stage darkening.",
      ],
      gap: null,
      selector: ".ai-copilot-panel",
    },
    {
      id: "ai-patrol-tour",
      name: "Eliminated camera patrol tour",
      status: "PRESENTATION",
      source: "Client presentation; previously commandeered camera to glide between machines",
      bullets: [
        "Autonomous roving camera tours have been removed; camera remains stable where the operator points.",
        "Deterministic detector evaluations operate silently in the background without stealing the viewport.",
        "Eliminates operator disorientation and motion sickness during live control-room monitoring.",
      ],
      gap: null,
      selector: ".ai-copilot-panel",
    },
    {
      id: "ai-looking-steps",
      name: "Investigation step status line",
      status: "EXISTS",
      source: "SSE event: step from /api/assistant/threads/{id}/stream (use-the-chat-api_console.md:135)",
      bullets: [
        "Streams live tool executions (e.g. Calling get_channel_trend, compare_windows) in the docked Copilot.",
        "Emitted live over the Assistant SSE proxy during reactive technician queries.",
        "Provides complete transparency into data retrieval without fake autonomous simulation.",
      ],
      gap: null,
      selector: ".ai-pending-step",
    },
    {
      id: "ai-safety-banner",
      name: "Safety hazard instruction banner",
      status: "EXISTS",
      source: "POST /api/assistant/chat, field assistant_message.answer.safety_flags (AnswerView.tsx:75)",
      bullets: [
        "Prominent amber/red alert banner rendered at top of Copilot when safety flags are present.",
        "Alerts technicians to critical physical hazards before they approach equipment on the floor.",
        "Directly rendered from the assistant answer payload per official Console specifications.",
      ],
      gap: null,
      selector: ".ai-safety-banner",
    },
    {
      id: "ai-explanation-text",
      name: "Copilot structured diagnosis & findings",
      status: "EXISTS",
      source: "POST /api/assistant/chat (proxy.py:204), field assistant_message.answer.answer / AnswerView.tsx:85",
      bullets: [
        "Structured markdown explanation rendered in docked Copilot panel with safety findings.",
        "Directly matches Console AnswerView schema (answer_type, claims, confidence, safety_flags).",
        "Reactive to operator prompts and alarm triage rather than unprompted popup windows.",
      ],
      gap: null,
      selector: ".ai-content-text",
    },
    {
      id: "ai-source-citations",
      name: "Verified claims & MCP tool citations",
      status: "EXISTS",
      source: "POST /api/assistant/chat, field assistant_message.answer.claims[].sources (AnswerView.tsx:106)",
      bullets: [
        "Expandable claims list citing exact read-only MCP tools (get_channel_trend, compare_windows).",
        "Displays confidence pill (high/medium/low) and data gaps disclosure directly from response.",
        "Guarantees deterministic, verifiable audit trail: AI explains detector evidence, never diagnoses alone.",
      ],
      gap: null,
      selector: ".ai-claims-details",
    },
    {
      id: "ai-followup-chips",
      name: "Suggested follow-up prompt chips",
      status: "EXISTS",
      source: "POST /api/assistant/chat, field assistant_message.answer.follow_up_questions (AnswerView.tsx:136)",
      bullets: [
        "Renders contextual follow-up question buttons returned directly in the assistant payload.",
        "Clicking dispatches prompt into the active thread session without requiring operator re-typing.",
        "Accelerates multi-turn root-cause investigation across complex multi-machine plants.",
      ],
      gap: null,
      selector: ".ai-chip",
    },
    {
      id: "ai-interactive-chat",
      name: "Docked Copilot Q&A composer",
      status: "EXISTS",
      source: "POST /api/assistant/chat and /api/assistant/threads/{id}/stream (proxy.py:204-211)",
      bullets: [
        "Docked chat composer with multi-turn conversation thread support via Console Assistant proxy.",
        "Invokes read-only MCP tools on the local machine with single-concurrency thread isolation.",
        "Grounds answers strictly on TimescaleDB measurements and deterministic detector outputs.",
      ],
      gap: null,
      selector: ".ai-composer",
    },
  ],

  status: [
    {
      id: "status-plant-clock",
      name: "Plant clock time & date",
      status: "EXISTS",
      source: "GET /api/monitor/overview (overview.py:101) field sites[0].timezone; formatted via Intl.DateTimeFormat",
      bullets: [
        "Displays local plant time (e.g. Fri 23 Oct 2026 · 14:12:05) formatted using the site's timezone (Europe/Berlin).",
        "All database timestamps are stored in UTC; the client applies site timezone offset.",
        "Demo 14:00–14:17 was recorded replay time; production uses wall-clock time in site timezone.",
      ],
      gap: null,
      selector: "#clock",
    },
    {
      id: "status-alarm-count",
      name: "Alarm count badge",
      status: "EXISTS",
      source: "GET /api/monitor/overview (overview.py:110) fields rollup.active_alarms, highest_priority",
      bullets: [
        "Displays count of active unacknowledged PLC alarms and highest priority indicator.",
        "Updates with every overview poll (2–5 s).",
        "Shows quiet styling when count is zero (No alarms).",
      ],
      gap: null,
      selector: "#alarm-count",
    },
    {
      id: "status-operational-line",
      name: "Operational status strip",
      status: "EXISTS",
      source: "GET /api/monitor/overview (overview.py:118-125), assembled client-side in app.js:316-354",
      bullets: [
        "Plain-language status: 3 of 3 machines running · 5 alarms · Early warning on the cooler since 14:11:05.",
        "Combines online machine count, active alarm totals, and earliest active anomaly timestamp.",
        "Shows urgent square or warning ring matching highest active severity in plant.",
      ],
      gap: null,
      selector: "#status-line",
    },
    {
      id: "status-machine-watch-state",
      name: "Machine watch state & staleness",
      status: "EXISTS",
      source: "GET /api/monitor/overview (overview.py:118) and /machines/{site}/{machine} (machine.py:82-152)",
      bullets: [
        "Displays deterministic watch state (WATCHED, NOT_WATCHED, STALLED) and watch_reason.",
        "Computed server-side from recent cycle processing timestamps in intelligence.processed_cycle.",
        "Replaces speculative cycle sweep animations with an explicit, verified status badge.",
      ],
      gap: null,
      selector: "#status-line .badge-watch",
    },
    {
      id: "status-last-checked-cycle",
      name: "Last cycle checked timestamp",
      status: "PARTIAL",
      source: "GET /api/monitor/machines/{site}/{machine}/cycles (machine.py:382), table intelligence.processed_cycle",
      bullets: [
        "Exact completed_at timestamp is available on machine cycles endpoint, but omitted from overview rollups.",
        "Overview serves watch_state and watch_reason, while granular cycle timestamps require querying /cycles.",
        "Fully resolved for machine view; plant-level timestamp requires adding field to overview (gap G22).",
      ],
      gap: "G22",
      selector: "#status-line",
    },
    {
      id: "status-palette-studio",
      name: "Live Palette Studio & Theme Tokens",
      status: "PRESENTATION",
      source: "Client CSS token engine in palette.js and styles.css",
      bullets: [
        "Interactive studio to customize Primary (brand), Secondary (surfaces), Tertiary (borders), and Background live.",
        "Includes 5 calibrated industrial presets (MedIQ Slate Teal, Industrial Amber, Nordic Steel, SCADA, Monochrome).",
        "Persists custom palette choices in localStorage while strictly adhering to WCAG contrast standards.",
      ],
      gap: null,
      selector: "#btn-palette, #palette-popover",
    },
  ],

  events: [
    {
      id: "events-log-list",
      name: "Chronological event log rows",
      status: "PARTIAL",
      source: "GET /plc-alarms (plc_alarms.py:1384), GET /anomalies (anomalies.py:48), and stored diagnoses",
      bullets: [
        "Lists newest 4 events: PLC alarms raised, early warnings opened/escalated, and AI notes ready.",
        "Alarms and anomalies exist on separate endpoints; requires client to poll both and merge-sort (gap G17).",
        "No single unified plant-wide /events feed endpoint exists in Console today.",
      ],
      gap: "G17",
      selector: "#event-log",
    },
    {
      id: "events-priority-marker",
      name: "Event priority glyph & iris mark",
      status: "EXISTS",
      source: "ActiveAlarm.priority (plc_alarms.py:70) and Episode.severity (anomalies.py:53)",
      bullets: [
        "Rows carry ISA-18.2 shape glyphs for alarms/warnings and iris mark for AI analysis notes.",
        "Rendered directly from priority/severity enum fields in API responses.",
        "Supports color-blind users by pairing distinct shapes with status hues.",
      ],
      gap: null,
      selector: ".el-row .mk, .el-row .el-mark",
    },
  ],

  player: [
    {
      id: "player-scrubber-timeline",
      name: "Scrubber track & event marks",
      status: "PARTIAL",
      source: "GET /machines/.../dashboard (machine.py:401), timeline.alarms and timeline.episodes",
      bullets: [
        "Slider track showing event ticks for alarms and anomalies across the timeline.",
        "Single-machine timeline exists in /dashboard, but plant-level timeline across all machines does not (gap G17).",
        "In production, scrubber is replaced by live monitoring mode or a historical range picker.",
      ],
      gap: "G17",
      selector: ".pl-track",
    },
    {
      id: "player-speed-controls",
      name: "Playback speed controls (1x/8x/30x)",
      status: "PRESENTATION",
      source: "Client simulation clock in clock.js",
      bullets: [
        "Demo speed buttons (1× real-time, 8× default 2-minute run, 30× fast review).",
        "Relevant only for recorded demonstration replay; live plant runs strictly in real time.",
        "Disabled when prototype is switched to live data source.",
      ],
      gap: null,
      selector: ".pl-speed",
    },
    {
      id: "player-reduced-motion",
      name: "Reduce motion toggle",
      status: "PRESENTATION",
      source: "Browser prefers-reduced-motion media query and local UI state",
      bullets: [
        "Disables fluid dashes, focus pull overshoots, spotlight dimming, and fan spinning.",
        "Ensures accessibility compliance for operators sensitive to continuous motion.",
        "Synchronizes with OS accessibility settings and persists user override.",
      ],
      gap: null,
      selector: ".pl-motion",
    },
    {
      id: "player-theme-toggle",
      name: "Theme switcher (Auto/Light/Dark)",
      status: "PRESENTATION",
      source: "CSS custom properties in styles.css:4-59 and localStorage",
      bullets: [
        "Toggles between control-room graphite dark theme and drafting-sheet light theme.",
        "All visual elements use semantic CSS tokens; status colors maintain WCAG contrast in both themes.",
        "Remembers user choice in localStorage across sessions.",
      ],
      gap: null,
      selector: "#theme-system, #theme-light, #theme-dark",
    },
  ],
};

export function getAllTechNotes() {
  return Object.values(TECH_NOTES).flat();
}

export function getTechNotesForScreen(screen, context = {}) {
  // If a specific screen is requested, return that screen's features
  // plus global items if desired.
  return TECH_NOTES[screen] || [];
}

export function computeSummaryCounts(notes) {
  const list = notes || getAllTechNotes();
  const counts = { EXISTS: 0, PARTIAL: 0, MISSING: 0, PRESENTATION: 0, total: list.length };
  for (const n of list) {
    if (counts[n.status] !== undefined) counts[n.status]++;
  }
  return counts;
}
