# Living plant prototype: design

Status: Draft for review (2026-10-24)
Replaces, for the plant view only, the Stitch screen P01 version 1, which was rejected.

## 1. Why this prototype

The plant view has to show three things that a static screen cannot:
- the plant as a living model, where you can see data moving;
- drilling down from the plant to one sensor, and rolling up to the logical view;
- the AI as something alive, present at the problem, not a box.

So it is built as a clickable, animated web prototype. It is published as a private link that the team can open in any browser, to validate the direction before any real development.

## 2. What it is, and what it is not

| It is | It is not |
|---|---|
| One web page, published as a private link | Connected to the MedIQ stack (that comes later, section 7) |
| Playing a generated version of the 17-minute demo, compressed to about 2 minutes | Real recorded data |
| Built on the real simulator machine: its sensors, units, components, alarms, limits and demo timeline | An invented machine |
| Using data shaped exactly like the real Console and chat API responses | A mock-up with free-form fake data |
| 2D, with depth, light and motion | 3D (a later, separate layer) |
| The plant, machine, sensor and logical views, plus the AI presence | The Details layer, settings, the Engineering studio |

## 3. The experience

### 3.1 Story playback

The page plays the demo story on a clock:

| Story minute | What happens |
|---|---|
| 0–10 | Healthy: one cycle a minute. The AI light sweeps each machine as its cycle is checked. |
| 10 | The cooler starts to fail. Cooler flow pulses slow down; oil temperatures start to rise. |
| ~11 | The AI notices: an early warning opens on the cooler. The light flies to Hydraulic Rig 01 and starts "looking". |
| ~12 | First PLC alarms: `TS4_HI`, `PS5_LO`, `PS6_LO`. The AI explains in one sentence. |
| 12–14 | `TS1_HI`, `TS2_HI`, `TS3_HI`, `FS2_LO`. The early warning becomes critical. |
| ~16 | Escalation to HIHI on `TS1`–`TS4`, and `VS1_HI`. The AI's message gets a safety warning. |
| 17 | The story ends and stays on the last state. |

A small player sits at the bottom edge:
- play / pause;
- speed: 1×, 8× (the default, about 2 minutes) and 30×;
- a scrubber with event marks;
- "Restart".

A permanent badge says "Prototype · generated demo data".

### 3.2 Views

1. **Plant view (home).** A top-down 2D plant on a deep slate floor. Halls are drawn as softly lit zones, and machines as detailed top-down drawings with depth: a soft shadow and a light rim. The status of a machine shows as light: a glow on the floor beneath it, amber or red, pulsing gently while an alarm is unacknowledged. Healthy machines have no glow. Inside each machine, light pulses run along its pipes, at a speed taken from its flow sensor. A status sentence sits at the top. Hydraulic Rig 01 is real; "Press line 2" and "Compressor C-3" are illustrative healthy machines, labelled as such in the about box.
2. **Machine view.** Clicking a machine moves the camera into it (one smooth zoom). The machine becomes a side-view process drawing: reservoir → motor and pump → valve block → cooler → back to the reservoir, with the oil loop flowing and the cooling-water loop on the cooler. Each of the 13 sensors is a small pin at its place, on a thin stem, with its live value and unit. A pin in alarm takes its priority colour. The faulty component glows.
3. **Sensor view.** Clicking a pin opens a live trace beside it: the last few minutes of the value, its alarm limits (HI, HIHI, LO) as lines, and the AI's note on what changed.
4. **Logical view.** A switch, "Physical / Logical", changes the same scene into the structure: plant → area → line → cell → machine as connected nodes, and inside the machine its components and sensors. Every node carries its state. Machines and pipes animate from their physical place to their place in the structure, so the user sees that it is the same plant.

Breadcrumbs ("Plant A / Hydraulics / Hydraulic Rig 01 / Cooler inlet temperature") and the Escape key go back up.

### 3.3 The AI presence

The AI is a point of light: a white core with a soft petrol halo. It lives in the scene, never in a box.

| State | What it does | Trigger in the data |
|---|---|---|
| Watching | Drifts slowly over the plant. When a machine's cycle is checked, it sweeps a thin scanning beam across that machine. | A new checked cycle (the `processed_cycle` events) |
| Looking | Flies to the machine and circles it, its halo dashed | An early warning or alarm group opened; analysis running |
| Explaining | Hovers beside the faulty part. Its words appear in the scene as large serif subtitles, written out at reading speed, with the sources as small chips below. | Analysis finished (`final_report`) |
| Urgent | As explaining, with a safety line first and a coloured underline | High or urgent alarm, or `safety_flags` |
| Answering | Swirls; one line under it shows each real step: "Reading cooler temperatures..." | Chat `step` events |
| Listening | After it explains, 2–3 suggested questions float around it as chips. Tapping one plays the recorded answer. A text field also exists; free questions get "In this prototype I can answer the suggested questions." | `follow_up_questions` |

The answers are written in the exact structure of the AI service's answers: the answer, claims with sources, confidence, data gaps, safety flags and follow-up questions. They are clearly example answers, not output from the real AI.

## 4. Visual direction (new, replaces the v2 DESIGN.md look for this view)

- **Stage:** a deep slate floor (`#141A1D` to `#1B2327` from centre to edge), with very faint floor markings: walkways and hall boundaries. It is not a neon blueprint: no grid glow and no cyan lines.
- **Machines:** frosted light-grey bodies (`#C9D2D6` to `#E6ECEE`) with a soft drop shadow and a thin light rim, so they read as objects lit from above. Detailed but clean: motor fins, tank level line, pipe joints.
- **Flow:** small soft light dashes moving along pipes: warm white for oil, pale blue for cooling water.
- **Status as light:** glows in the reserved alarm colours (critical `#E5484D`, high `#F08C2E`, medium `#E8C547`, low `#7D93B2`, made brighter for a dark stage). Healthy means no glow. Shape markers stay on every alarm item, for colour-blind users.
- **AI:** a white core with a petrol `#2FA4AF` halo. Its subtitles are in Source Serif 4, large (24–28 px), warm white.
- **Interface text:** IBM Plex Sans, light on dark, small and sparse. Controls are translucent dark glass pills with no hard borders.
- **Motion:** every movement means something: flow speed, a checked cycle, an alarm pulse, the AI moving to attention. A "reduce motion" setting stops the decorative parts.

## 5. Data

### 5.1 Built from the real simulator machine

Taken from `gateway-config/machines/plant-a/hydraulic-rig-01.json` and the simulator, read-only:
- hierarchy Plant A / Hydraulics / HPU bay 4 / Test rig 1;
- components main pump (high), cooler (medium), reservoir (low);
- the 13 sensors with their slots, units and components;
- the 12 PLC alarms with their names, messages, priorities, kinds and limits;
- the demo timeline from `RUNNING_MEDIQ.md`.

Healthy value ranges come from the simulator's healthy dataset summaries (`MachineMedIQ/mediq-replay/data/*_healthy21.tsv`). Examples: supply pressure about 150–190 bar; cooler inlet temperature about 38.5 °C; cooling flow about 10–11 l/min.

### 5.2 Generated, consistently

- Values are generated per second from these ranges. The cooler fault is a slow loss of cooling from minute 10.
- **Alarms are not scripted separately:** they are computed from the generated values and the real limits. So an alarm is raised exactly when its value crosses its limit, and the alarms and values always agree. The fault curve is tuned so the alarms land at the documented minutes.
- Cycles close every 60 seconds; early-warning scores grow with the cooler drift.
- The generation is fixed (seeded), so every viewer sees the same story.

### 5.3 Shaped like the real APIs

The prototype's screens read only from a small data layer. It returns objects shaped like the real responses:
- `GET /overview`;
- `GET /machines/{site}/{machine}/plc-alarms/active`;
- `GET /machines/{site}/{machine}/anomalies`;
- `GET /machines/{site}/{machine}/dashboard` (latest values and time line);
- `GET /machines/{site}/{machine}/series`;
- the AI service runs and `final_report`;
- the chat API message and `step` events.

The data layer has two sources: "generated" (built) and "live" (an empty slot, section 7).

## 6. Delivery

- One self-contained HTML file: plain JavaScript and SVG, no build step. Fonts come from Google Fonts, which is allowed for a published prototype; the real product would bundle them (DESIGN.md "Where MedIQ runs").
- Source kept in `product-revamp/v2-ai-native/prototype/`.
- Published as a private Artifact link. You decide whether and with whom to share it.

## 7. Later: switching to live

The "live" source would call the Console API and the chat API of a running stack instead of generating data. The screens stay the same. It only works where the stack runs (no internet), and gaps G21 and G22 need workarounds or API work. Not built now.

## 8. Success

A team member who opens the link, without explanation, can:
1. tell within ten seconds that the plant is healthy, and later that Hydraulic Rig 01 has a problem;
2. read what the AI says about it without hunting for it;
3. go from the plant to the cooler inlet temperature trace in three clicks, and back;
4. switch to the logical view and understand it is the same plant;
5. tap a suggested question and get an answer with sources.

## 9. Out of scope for this prototype

The Details layer, conversation history, more than one site, wall-screen auto-tour (the story playback already behaves like it), settings, and any change to MedIQ services.

## 10. Visual revision 2 (2026-10-24)

Version 1 was judged to look AI-generated around the animation: a dark background with one glowing accent, frosted rounded capsules everywhere, a glowing orb as the AI, a centred hero headline, tagline copy, and no sign of a real plant on a real afternoon. This revision replaces section 4 where they differ. Data, story, views and interactions stay the same.

### 10.1 Grounded in time and place
- **Header bar:** a solid full-width bar. Left: the MedIQ wordmark and the breadcrumb. Right: the date and the plant's clock time ("Fri 23 Oct 2026 · 14:12:05"), the Physical / Logical switch, the theme switch, and the alarm count. There is no shift: MedIQ does not hold shifts.
- **Story time is clock time:** the story runs from 14:00:00 to 14:17:00 plant time (site time zone Europe/Berlin), everywhere: the player, the log and MedIQ's notes.
- **Status strip:** a left-aligned line under the header, in operational words:
  - healthy: "3 of 3 machines running · No alarms · Last cycle checked 14:05:12";
  - problem: "Hydraulic Rig 01 needs attention · 5 alarms · Early warning on the cooler since 14:11:05".
- **Event log:** a solid panel at the bottom right with the four newest events, timestamped in mono figures:
  - alarms raised;
  - the early warning opened, and when it turned critical;
  - MedIQ analyses finished.

  Like an alarm banner in a control room.

### 10.2 The plant's own visual language
- **A building-plan grid:** column letters (A, B, C…) along the top edge and row numbers along the left edge of the floor, with faint grid lines. Each machine label carries its grid square ("C3").
- **Aisles:** dashed, light aisle markings between halls.
- **Machine labels:** the name, then the real machine code in mono (`hydraulic-rig-01`) and the grid square. No invented equipment tags.
- **Shapes:** solid panels, 2–4 px corners, 1 px rules. No backdrop blur and no capsule shapes, except small status chips. Glow is reserved for alarms and early warnings.

### 10.3 MedIQ as an inspection mark and a logbook
- **On the drawing:** four corner brackets lock onto the part MedIQ is talking about, with a small "MedIQ" label at the top-left bracket.
  - Looking: the brackets are dashed and a scan line passes inside them.
  - Explaining: the brackets are solid.
  - Watching: small brackets briefly lock onto each machine as its cycle is checked.

  There is no orb or halo.
- **Words:** MedIQ's text is a logbook note in the left column. It is a solid panel with a 3 px petrol rule on the left, and contains:
  1. a header line: "MedIQ · 14:11:45 · Hydraulic Rig 01 / Cooler";
  2. the note in Source Serif 4;
  3. "Based on: Alarm states, Service guide 6.2" as plain text;
  4. the follow-up questions as square outlined buttons;
  5. the question field.

### 10.4 Copy
Operational, plain, no taglines. Times are clock times. The badge reads "Prototype · generated data" and sits at the right end of the player bar.

### 10.5 Light and dark
- **Light:** a cool grey drafting sheet with dark ink lines, for offices and bright floors. It is not cream.
- **Dark:** control-room graphite.
- **Default:** follows the system setting. A header switch overrides it, and the choice is remembered in the browser where storage is allowed.
- **Colours:** every colour is a token, including the SVG gradients and glows. Status colours keep their hue in both themes, darkened in light mode for contrast.

## 11. MedIQ presence, revision 3 (2026-10-24)

The brackets of section 10.3 felt like a plain rectangle, and while watching they blinked in and out. This revision changes only how MedIQ is drawn and how it moves.

### 11.1 The mark
MedIQ gets a small thin-line iris mark, used next to its name on the brackets, in every logbook note header and on MedIQ rows in the event log. It has one expression per state:

| State | Expression |
|---|---|
| Watching | Blinks slowly now and then |
| Looking | The pupil moves side to side |
| Answering | The pupil circles |
| Explaining | Steady and open |
| Urgent | Wider, with a rim in the high-priority colour |

It is not a character. A full illustrated mascot could later replace the mark in the same places.

### 11.2 The brackets
- **Focus pull:** each new lock starts about 25 % wider and tightens onto its target with a small overshoot (about 450 ms).
- **Glow:** a thin halo follows the bracket lines only. It pulses while looking or answering and is steady while explaining.
- **Trail:** a short fading trace marks the brackets' path when they move.
- **Spotlight:** while explaining or urgent, everything outside the brackets dims slightly.
- **Scan line:** stays while looking.

### 11.3 Watching: always present, never blinking out
- **At rest:** a loose, faint frame around the whole plant. In the machine view, the frame is around the machine.
- **When a machine's cycle is checked:**
  1. the brackets glide to the machine and tighten;
  2. they visit each of its components in turn (MedIQ scores each component's features on every cycle);
  3. they return to the resting frame.
- **In the machine view:** only that machine's checks start a tour, and the tour visits its parts.
- **Alarms and early warnings** interrupt the tour, as before.
- **Reduce motion:** no travel and no trail. The brackets appear where the attention is.
