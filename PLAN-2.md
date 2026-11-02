# Living plant prototype: visual revision 2, plan

Implements `DESIGN.md` section 10. Native execution, one review at the end. No commits unless the user says so.

## Global constraints
- Data, story, views and interactions do not change. Tests stay green.
- Every colour is a CSS token defined light-first on `:root`, redefined under `prefers-color-scheme: dark` (guarded by `:root:not([data-theme="light"])`) and under `:root[data-theme="dark"]`.
- No backdrop blur, no capsule shapes except status chips, corner radius 2–4 px.
- Copy is operational and uses plant clock times (Europe/Berlin), 14:00:00–14:17:00.

## Tasks
1. **Clock times and the event log (data, test first).**
   - Move the story start to 12:00Z, so it is 14:00 in Berlin.
   - Add `clockTime(t)` → "14:11:57" and `clockDate()` → "Thu 23 Oct 2026" to the data layer, in the site time zone.
   - Add `eventLog(t, n)` → the newest-first entries `{t, time, kind, priority, text}`: alarm raised, early warning opened, early warning critical, analysis ready.
   - Tests:
     - clockTime(0) is 14:00:00 and clockTime(717) is 14:11:57;
     - the event log at 800 s starts with the newest event and contains "PS5_LO" before 717 s is passed;
     - entries never come from the future (RF1).
2. **Theme tokens and the toggle.**
   - Rewrite `styles.css` with light and dark tokens.
   - Gradients and glows in the SVG defs use tokens via `style="stop-color:var(--…)"`.
   - Replace hard-coded fills in the machine, logical and sensor views with tokens.
   - Add a theme switch in the header: System, Light, Dark. It sets `data-theme` and is remembered with try/catch storage.
3. **Header, status strip, event log panel, player bar.** Lay these out as section 10.1 and 10.4 describe. Remove the centred status line and the floating badge.
4. **Floor plan grid, aisles and labels** in the plant view (section 10.2).
5. **MedIQ brackets and logbook** (section 10.3): replace the orb, halo, ring and orbit, and restyle the subtitle as a logbook note with a clock-time header.
6. **Check and publish:**
   - browser screenshots in both themes at 1440×900 and 1280×720, at minutes 5, 11.5, 13 and 16.5, and in the machine and logical views;
   - one fresh review;
   - fix the confirmed findings;
   - republish to the same link.
