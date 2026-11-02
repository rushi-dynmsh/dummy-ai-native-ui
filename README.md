# Living plant prototype

A clickable, animated 2D prototype of the MedIQ plant view (approach 2). It plays a generated version of the 17-minute demo in about 2 minutes. Design: `DESIGN.md`. Build plan: `PLAN.md`.

## Open it

- **Published link:** https://claude.ai/artifact/5TzVuAqhbgWgMHdbyyiF2q (private until shared).
- **Locally:** ES modules need a web server.

  ```
  cd product-revamp/v2-ai-native/prototype
  python -m http.server 8765
  ```

  Then open http://127.0.0.1:8765/index.html.

Moving around: drag the drawing to move it; zoom with the mouse wheel, the + / − buttons (bottom left) or the + / − keys. "Fit" (or the 0 key) returns to the automatic fit, which keeps the drawing in the space left free by MedIQ's note, the sensor panel, the event log and the bars. Opening a machine, going back, or switching views also returns to the fit.

URL options for demos and screenshots:
- `t`: start at a story second (for example `?t=780`, minute 13);
- `speed`: 1, 8 or 30;
- `pause=1`: start paused;
- `m=hydraulic-rig-01`: open the machine;
- `s=temperature.cooler_inlet`: open a sensor;
- `view=logical`: open the logical view.

## Tests

```
node --test test/*.test.js
```

The tests check:
- the generator is deterministic;
- the alarms land at the documented demo minutes and agree with the values;
- the API-shaped responses;
- the AI script;
- the story clock, including a throttled tab.

## What is real and what is generated

- **Real**, from `gateway-config/machines/plant-a/hydraulic-rig-01.json` and the simulator:
  - the hierarchy, components, 13 sensors and units;
  - the 12 alarms with priorities and limits;
  - the demo timeline;
  - the healthy value ranges.
- **Generated:** the values (seed 447). Alarms are computed from the values against the real limits.
- **Illustrative:** "Press line 2" and "Compressor C-3".
- **Example AI answers:** written in the AI service's answer format (`src/data/ai-script.js`). They are not output of the real AI.

## Code map

| File | What |
|---|---|
| `src/data/machine.js` | Machine facts |
| `src/data/generate.js` | Seeded story generator |
| `src/data/ai-script.js` | Example analyses and chat answers |
| `src/data/api.js` | Data layer shaped like the real Console and AI service responses |
| `src/clock.js` | Story clock |
| `src/views/plant.js` | Plant view |
| `src/views/machine.js` | Machine view |
| `src/views/sensor.js` | Sensor trace |
| `src/views/logical.js` | Logical view |
| `src/views/ai.js` | The AI light, subtitles and conversation |
| `src/views/player.js` | Story player |
| `src/app.js` | Wiring and the render loop |

## Switching to live data later

`createDataLayer({ source: "live" })` is the slot for a source that calls the real Console API and the chat API on a running stack. Every view reads only these methods:
- `overview`, `activeAlarms`, `anomalies`, `dashboard`, `series`, `checkedCycles`;
- `aiState`, `chat`, `events`.

A live source that returns the same shapes replaces the generated one without changing the views. Gaps to solve first: G21 (machine type in the overview) and G22 (checked-cycle times), see `../../SYSTEM_GAPS.md`.

## Known small issues (from the review, not fixed yet)

- Hidden plant machines stay reachable with the Tab key while a machine or the logical view is open.
- Escape also navigates while typing in "Ask MedIQ", and does not close the About box.
- Keyboard focus is lost after tapping a chip; screen readers hear the subtitle letter by letter.
- Logical nodes react to Enter but not Space; halls show a pointer cursor but do nothing.
- Between 15:53 and 16:10 the AI light is "urgent" before the safety analysis has arrived.
- The status line marks a critical early warning with a red square, the shape used for urgent alarms.
- Group nodes in the logical view take the first problem state, not the worst (not visible with one faulty machine).
- Scrubbing makes the cycle sweep flash on machines.
- While another machine is open, the AI light points at the rig's spot off screen.
- While MedIQ speaks, plant text gets small at 1440 px, and very wide screens leave a large gap.
- Limit labels in the sensor chart touch the trace at the right edge.
- Opening another machine during a zoom-out jumps the view.
- The story slider lacks a spoken time value and Home/End keys.

### From the review of visual revision 2 (not fixed yet)

- While watching, the brackets glide across the floor between machines instead of snapping, and they are full machine size.
- The status line repeats itself when there is only an early warning ("Early warning on … · Early warning on the cooler since …").
- Event-log rows lead with the alarm code, so the machine name is cut off when space is short.
- Very large screens (2560 px): the header, log and note stay small next to a large drawing.
- A `?theme=` link option is remembered as the viewer's own choice.
- Tab order visits the drawing before the header; hidden plant machines can take focus under the logical view.
- The brackets stay solid while MedIQ answers a question (they should be dashed, as when looking).
- The time in a "looking into" note does not move until the next step.
- Sensor chart limit labels sit where the line ends.
- The note's size is measured every frame while it is shown.
- "No events since 14:00." is written as fixed text.
- Fonts load from Google Fonts; the offline factory deployment must bundle them.
