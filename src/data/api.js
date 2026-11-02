// The data layer. Every method returns an object shaped like the matching real response
// (Console Monitor API and the AI service), computed only from the story and the time t
// in seconds, so the screens are a pure function of time.

import { MACHINES, SITE, STORY } from "./machine.js";
import { generateStory } from "./generate.js";
import { ANALYSES, CHAT, FALLBACK } from "./ai-script.js";

const PRIORITY_RANK = { urgent: 4, high: 3, medium: 2, low: 1 };
const SEVERITY_RANK = { critical: 3, warning: 2, info: 1 };
const START_MS = Date.parse(STORY.startIso);
const iso = (t) => new Date(START_MS + t * 1000).toISOString();
const CLOCK = new Intl.DateTimeFormat("en-GB", { timeZone: SITE.timezone, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
const DATE = new Intl.DateTimeFormat("en-GB", { timeZone: SITE.timezone, weekday: "short", day: "numeric", month: "short", year: "numeric" });
const highest = (items, rank) => items.reduce((best, x) => (best && rank[best] >= rank[x] ? best : x), null);

export function createDataLayer({ source = "generated", seed = 447 } = {}) {
  if (source === "live") throw new Error("Live source not connected yet");
  const story = generateStory(seed);
  const byCode = Object.fromEntries(MACHINES.map((m) => [m.code, m]));
  const clampT = (t) => Math.max(0, Math.min(STORY.lengthS, Math.floor(t)));

  function activeAlarms(code, t) {
    const m = byCode[code];
    const alarms = story.alarmTransitions
      .filter((a) => a.machine === code && a.raisedS <= t && (a.clearedS === null || a.clearedS > t))
      .map((a) => {
        const def = m.alarms.find((x) => x.name === a.alarmName);
        return {
          device_alarm_id: m.alarms.indexOf(def) + 1,
          alarm_id: `${code}:${def.name}`,
          name: def.name,
          message: def.message,
          code: null,
          priority: def.priority,
          kind: def.kind,
          component: def.component,
          state: "active",
          active: true,
          active_since: iso(a.raisedS),
          raised_s: a.raisedS,
          slot: def.slot,
        };
      })
      .sort((x, y) => PRIORITY_RANK[y.priority] - PRIORITY_RANK[x.priority] || x.raised_s - y.raised_s);
    return { alarms, path: { stale: false, sequence_gaps: 0 }, checked_at: iso(t) };
  }

  function anomalies(code, t) {
    const ep = story.episode;
    const items =
      ep.machine === code && t >= ep.openedS
        ? [{
            episode_id: ep.episodeId,
            component: ep.component,
            kind: ep.kind,
            state: "open",
            severity: ep.severityAt(t),
            started_at: iso(ep.openedS),
            started_s: ep.openedS,
            closed_at: null,
            has_evidence: true,
          }]
        : [];
    return { items, total: items.length, detection_configured: !byCode[code].illustrative };
  }

  function rollup(code, t) {
    const al = activeAlarms(code, t).alarms;
    const an = anomalies(code, t).items;
    return {
      online: true,
      last_data_at: iso(t),
      active_alarms: al.length,
      highest_priority: highest(al.map((a) => a.priority), PRIORITY_RANK),
      unknown_alarms: 0,
      open_anomalies: an.length,
      highest_severity: highest(an.map((a) => a.severity), SEVERITY_RANK),
    };
  }

  function overview(t) {
    t = clampT(t);
    const areas = [];
    for (const m of MACHINES) {
      let area = areas.find((a) => a.code === m.area.code);
      if (!area) areas.push((area = { ...m.area, lines: [] }));
      let line = area.lines.find((l) => l.code === m.line.code);
      if (!line) area.lines.push((line = { ...m.line, cells: [] }));
      let cell = line.cells.find((c) => c.code === m.cell.code);
      if (!cell) line.cells.push((cell = { ...m.cell, machines: [] }));
      cell.machines.push({ site: SITE.code, code: m.code, name: m.name, machine_id: MACHINES.indexOf(m) + 1, rollup: rollup(m.code, t) });
    }
    const all = areas.flatMap((a) => a.lines.flatMap((l) => l.cells.flatMap((c) => c.machines)));
    const group = (ms) => ({
      machines: ms.length,
      online: ms.filter((x) => x.rollup.online).length,
      active_alarms: ms.reduce((n, x) => n + x.rollup.active_alarms, 0),
      highest_priority: highest(ms.map((x) => x.rollup.highest_priority).filter(Boolean), PRIORITY_RANK),
      unknown_alarms: 0,
      open_anomalies: ms.reduce((n, x) => n + x.rollup.open_anomalies, 0),
      highest_severity: highest(ms.map((x) => x.rollup.highest_severity).filter(Boolean), SEVERITY_RANK),
    });
    for (const a of areas) {
      for (const l of a.lines) {
        for (const c of l.cells) c.rollup = group(c.machines);
        l.rollup = group(l.cells.flatMap((c) => c.machines));
      }
      a.rollup = group(a.lines.flatMap((l) => l.cells.flatMap((c) => c.machines)));
    }
    return {
      sites: [{ ...SITE, rollup: group(all), areas, unassigned: [] }],
      rollup: group(all),
      gateway_reachable: true,
      checked_at: iso(t),
    };
  }

  function dashboard(code, t) {
    t = clampT(t);
    const m = byCode[code];
    const latest = m.sensors.map((s) => ({
      channel_id: s.tag,
      tag_id: String(s.tag),
      name: s.name,
      unit: s.unit,
      component: s.component,
      slot: s.slot,
      value: story.values[code][s.slot][t],
      at: iso(t),
      stale: false,
      limits: m.alarms.filter((a) => a.slot === s.slot).map((a) => ({ kind: a.kind, value: a.limit, priority: a.priority })),
    }));
    const timeline = {
      start: iso(Math.max(0, t - 86400)),
      end: iso(t),
      alarms: story.alarmTransitions
        .filter((a) => a.machine === code && a.raisedS <= t)
        .map((a) => ({ alarm_id: `${code}:${a.alarmName}`, name: a.alarmName, priority: m.alarms.find((x) => x.name === a.alarmName).priority, started_at: iso(a.raisedS), ended_at: a.clearedS !== null && a.clearedS <= t ? iso(a.clearedS) : null })),
      episodes: anomalies(code, t).items.map((e) => ({ episode_id: e.episode_id, component: e.component, kind: e.kind, state: e.state, severity: e.severity, started_at: e.started_at, ended_at: null })),
    };
    return { machine: { site: SITE.code, machine: code, name: m.name, asset_type: m.assetType }, has_data: true, latest, timeline, checked_at: iso(t) };
  }

  function series(code, slot, fromT, toT) {
    const from = clampT(fromT);
    const to = clampT(toT);
    const values = story.values[code][slot];
    const points = [];
    for (let t = from; t <= to; t++) points.push({ t, at: iso(t), v: values[t] });
    return { slot, points };
  }

  function checkedCycles(t, windowS) {
    return story.checkedCycles.filter((c) => c.atS <= t && c.atS > t - windowS);
  }

  function aiState(t) {
    const started = ANALYSES.filter((a) => a.startS <= t);
    if (started.length === 0) return { state: "watching", machine: null, component: null, analysis: null, stepIndex: null, progress: null };
    const current = started[started.length - 1];
    const elapsed = t - current.startS;
    const base = { machine: MACHINES[0].code, component: current.component };
    if (elapsed < current.durationS) {
      const progress = elapsed / current.durationS;
      const previous = started.length > 1 ? started[started.length - 2] : null;
      return { ...base, state: "looking", analysis: current, previous, progress, stepIndex: Math.min(current.steps.length - 1, Math.floor(progress * current.steps.length)) };
    }
    const urgent =
      current.report.safety_flags.length > 0 ||
      activeAlarms(MACHINES[0].code, t).alarms.some((a) => PRIORITY_RANK[a.priority] >= PRIORITY_RANK.high);
    return { ...base, state: urgent ? "urgent" : "explaining", analysis: current, progress: 1, stepIndex: null };
  }

  function chat(question) {
    return CHAT[question?.trim()] ?? FALLBACK;
  }

  function events() {
    const marks = story.alarmTransitions.map((a) => ({ t: a.raisedS, label: a.alarmName, priority: byCode[a.machine].alarms.find((x) => x.name === a.alarmName).priority }));
    marks.push({ t: story.episode.openedS, label: "Early warning: cooler", priority: "warning" });
    return marks.sort((a, b) => a.t - b.t);
  }

  // plant clock time (site time zone) for a story second
  const clockTime = (t) => CLOCK.format(new Date(START_MS + Math.round(t) * 1000));
  const clockDate = () => DATE.format(new Date(START_MS)).replace(",", "");

  // newest-first log of what happened up to t: alarms, the early warning, MedIQ analyses
  const LOG = (() => {
    const out = story.alarmTransitions.map((a) => {
      const def = byCode[a.machine].alarms.find((x) => x.name === a.alarmName);
      return { t: a.raisedS, kind: "alarm", priority: def.priority, text: `${def.name} ${def.message}, ${byCode[a.machine].name}` };
    });
    const ep = story.episode;
    out.push({ t: ep.openedS, kind: "warning", priority: "warning", text: `Early warning opened: cooler, ${byCode[ep.machine].name}` });
    out.push({ t: ep.criticalS, kind: "warning", priority: "critical", text: `Early warning on the cooler is now critical` });
    for (const a of ANALYSES) out.push({ t: a.startS + a.durationS, kind: "ai", priority: null, text: `MedIQ note ready: ${a.title.toLowerCase()}` });
    return out.sort((x, y) => y.t - x.t);
  })();
  function eventLog(t, n) {
    return LOG.filter((e) => e.t <= t).slice(0, n).map((e) => ({ ...e, time: clockTime(e.t) }));
  }

  return { clockTime, clockDate, eventLog, overview, activeAlarms, anomalies, dashboard, series, checkedCycles, aiState, chat, events, machines: MACHINES, story };
}
