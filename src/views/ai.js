// MedIQ on the drawing: brackets that lock onto what it is looking at, with a thin glow, a
// focus pull on each new lock, a short trail when they move, and a spotlight while it
// explains. While all is well they never disappear: they rest around the whole plant (or
// machine) and tour each machine's parts as its cycle is checked. A small iris mark gives
// MedIQ an expression per state. Its words are a logbook note in the left column.

import { el, html } from "./svg.js";

const SOURCE_NAMES = {
  get_channel_trend: "Signal trend",
  get_cycle_statistics: "Cycle statistics",
  compare_windows: "Compared with normal cycles",
  get_alarm_states: "Alarm states",
  machine_live_status: "Live status",
};
const sourceName = (src) => (src.kind === "document" ? `Service guide, ${src.detail}` : SOURCE_NAMES[src.ref] || src.ref);
const CHARS_PER_S = 42;
const PULL_MS = 450; // focus pull on each new lock
const TOUR_MACHINE_MS = 1800; // a tour: the machine, then each part, then back to rest
const TOUR_PART_MS = 1400;
const TRAIL_MS = 420;

// the iris mark as inline SVG for HTML places (logbook header, event log)
export function irisHTML(state = "watching") {
  return `<svg class="iris" data-state="${state}" viewBox="0 0 20 14" width="20" height="14" aria-hidden="true">` +
    `<path class="iris-lid" d="M1 7 Q10 -1 19 7 Q10 15 1 7 Z" fill="none" stroke="currentColor" stroke-width="1.4"/>` +
    `<circle class="iris-pupil" cx="10" cy="7" r="2.6" fill="currentColor"/></svg>`;
}

const easeOutBack = (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };

export function createAI(svgLayer, overlay, data, { anchorFor, restAnchor, worldToScreen, plantCenter, zone, onChatStart, onChatEnd }) {
  const defs = document.getElementById("defs");
  const glowF = el("filter", { id: "f-ai-glow", x: "-50%", y: "-50%", width: "200%", height: "200%" }, defs);
  el("feGaussianBlur", { stdDeviation: 3.2 }, glowF);

  // spotlight: the world outside the brackets dims a little while MedIQ explains
  const spot = el("path", { "fill-rule": "evenodd", fill: "var(--bg)", opacity: 0, "pointer-events": "none" }, svgLayer);
  const trail = el("path", { fill: "none", stroke: "var(--ai)", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: 0, "pointer-events": "none" }, svgLayer);
  const g = el("g", { "pointer-events": "none" }, svgLayer);
  const glow = el("g", { filter: "url(#f-ai-glow)", opacity: 0.5 }, g);
  const glowCorners = [0, 1, 2, 3].map(() => el("path", { fill: "none", stroke: "var(--ai)", "stroke-width": 6, "stroke-linecap": "square" }, glow));
  const corners = [0, 1, 2, 3].map(() => el("path", { fill: "none", stroke: "var(--ai)", "stroke-width": 2.5, "stroke-linecap": "square" }, g));
  const scan = el("line", { stroke: "var(--ai)", "stroke-width": 1.2, opacity: 0 }, g);
  // tag with the iris mark and the name
  const tag = el("g", {}, g);
  el("rect", { x: 0, y: 0, height: 18, width: 70, rx: 2, fill: "var(--ai)" }, tag);
  const lid = el("path", { d: "M5 9 Q13 2 21 9 Q13 16 5 9 Z", fill: "none", style: "stroke:var(--panel)", "stroke-width": 1.4 }, tag);
  const pupil = el("circle", { cx: 13, cy: 9, r: 2.4, style: "fill:var(--panel)" }, tag);
  const name = el("text", { x: 26, y: 13, class: "t-ai", style: "fill:var(--panel)" }, tag);
  name.textContent = "MedIQ";

  const box = { x: plantCenter.x, y: plantCenter.y, w: 300, h: 200 };
  let currentT = 0;
  let lastReal = performance.now();
  let say = null;
  let chat = null;
  let lastAnalysisKey = null;
  let draft = "";
  let speaking = false;
  let tour = null; // { key, machine, start, parts }
  let lastCheckKey = null;
  let lastTargetKey = null;
  let pullStart = -1;
  const trailPts = [];

  const machineOf = (code) => data.machines.find((m) => m.code === code);
  const componentName = (machine, comp) => machineOf(machine)?.components.find((c) => c.code === comp)?.name || comp;
  const machineName = (machine) => machineOf(machine)?.name || machine;

  function clearSay() { if (say) say.root.remove(); say = null; }

  function mountSay(key, { head, state, safety, answer, sources, meta, chips, ask, step, back }) {
    clearSay();
    const root = html("div", { class: "ai-say", role: "status", "aria-live": "polite" }, overlay);
    const parts = { root };
    const h = html("div", { class: "ai-head" }, root);
    const mark = html("span", { class: "ai-mark" }, h);
    mark.innerHTML = irisHTML(state);
    html("b", { text: "MedIQ" }, h);
    for (const piece of head) html("span", { text: piece }, h);
    if (step) parts.step = html("div", { class: "ai-step", text: step }, root);
    if (safety) {
      const s = html("div", { class: "ai-safety" }, root);
      html("span", { class: "mk high", "aria-hidden": "true" }, s);
      html("span", { text: safety }, s);
    }
    if (answer) { parts.text = html("p", { class: "ai-text" }, root); parts.full = answer; }
    if (sources?.length || meta) {
      parts.meta = html("div", { class: "ai-meta" }, root);
      if (sources?.length) { html("b", { text: "Based on: " }, parts.meta); html("span", { text: sources.join(", ") }, parts.meta); }
      if (meta) html("span", { text: `${sources?.length ? " · " : ""}${meta}` }, parts.meta);
      parts.meta.hidden = true;
    }
    if (chips?.length) {
      parts.chips = html("div", { class: "ai-chips" }, root);
      for (const q of chips) html("button", { class: "ai-chip", type: "button", text: q }, parts.chips).addEventListener("click", () => ask(q));
      parts.chips.hidden = true;
    }
    if (ask && answer) {
      const f = html("form", { class: "ai-ask" }, root);
      const inp = html("input", { id: "ai-question", type: "text", placeholder: "Ask MedIQ about this machine", "aria-label": "Ask MedIQ", maxlength: "200" }, f);
      inp.value = draft;
      inp.addEventListener("input", () => { draft = inp.value; });
      html("button", { type: "submit", text: "Ask" }, f);
      f.addEventListener("submit", (e) => { e.preventDefault(); const q = inp.value.trim(); if (q) { draft = ""; ask(q); } });
      parts.form = f;
      f.hidden = true;
    }
    if (back && answer) {
      parts.back = html("button", { class: "ai-back", type: "button", text: "Back to MedIQ’s note" }, root);
      parts.back.addEventListener("click", back);
      parts.back.hidden = true;
    }
    say = { key, ...parts, startReal: performance.now() };
  }

  function reportContent(report, extra = {}) {
    const sources = [...new Set(report.claims.flatMap((c) => c.sources.map(sourceName)))];
    const meta = report.confidence ? `confidence ${report.confidence}` : null;
    return { safety: report.safety_flags[0], answer: report.answer, sources, meta, chips: report.follow_up_questions, ...extra };
  }

  function bracketPaths(x, y, w, h) {
    const c = Math.max(10, Math.min(w, h) * 0.4);
    return [[x - w, y - h, 1, 1], [x + w, y - h, -1, 1], [x + w, y + h, -1, -1], [x - w, y + h, 1, -1]].map(([px, py, sx, sy]) =>
      `M${(px + sx * c).toFixed(1)} ${py.toFixed(1)} L${px.toFixed(1)} ${py.toFixed(1)} L${px.toFixed(1)} ${(py + sy * c).toFixed(1)}`);
  }

  // where the brackets should be while watching: a tour of the checked machine, else rest
  function watchTarget(t, nav, now, reducedMotion) {
    const check = data.checkedCycles(t, 12).pop();
    const key = check ? `${check.machine}|${check.cycleNumber}` : null;
    const inMachine = nav.level !== "plant" && nav.machine;
    if (key && key !== lastCheckKey) {
      lastCheckKey = key;
      // a tour runs to its end; checks that arrive meanwhile wait for that machine's next cycle
      if (!tour && (!inMachine || check.machine === nav.machine)) {
        tour = { key, machine: check.machine, start: now, parts: machineOf(check.machine).components.map((c) => c.code) };
      }
    }
    if (!key) lastCheckKey = null;
    if (tour && !reducedMotion) {
      const e = now - tour.start;
      if (e < TOUR_MACHINE_MS) return { key: `tour|${tour.key}|m`, a: inMachine ? restAnchor(nav) : anchorFor(nav, tour.machine, null), rest: false };
      const i = Math.floor((e - TOUR_MACHINE_MS) / TOUR_PART_MS);
      if (i < tour.parts.length) return { key: `tour|${tour.key}|${i}`, a: anchorFor(nav, tour.machine, tour.parts[i]), rest: false };
      tour = null;
    }
    return { key: "rest", a: restAnchor(nav), rest: true };
  }

  return {
    isSpeaking: () => speaking,
    update(t, nav, { reducedMotion }) {
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastReal) / 1000);
      lastReal = now;
      currentT = t;
      const st = data.aiState(t);
      const analysisKey = st.analysis ? `${st.analysis.startS}|${st.state === "looking" ? "run" : "done"}` : "none";
      if (analysisKey !== lastAnalysisKey) {
        if (chat) { chat = null; onChatEnd?.(false); }
        lastAnalysisKey = analysisKey;
        tour = null;
      }
      let mode = st.state;
      if (chat) mode = now - chat.startReal < chat.reply.steps.length * 1100 ? "answering" : "explaining";
      const face = st.state === "urgent" && mode !== "answering" ? "urgent" : mode;

      // target
      let target;
      let targetKey;
      let resting = false;
      if (st.state === "watching") {
        const w = watchTarget(t, nav, now, reducedMotion);
        target = w.a; targetKey = w.key; resting = w.rest;
      } else {
        target = anchorFor(nav, st.machine, st.component);
        targetKey = `${st.machine}|${st.component}|${nav.level}|${nav.view}`;
      }
      if (targetKey !== lastTargetKey) { lastTargetKey = targetKey; if (!resting) pullStart = now; }

      // move, with the focus pull on a new lock
      const tw = target.w ?? target.r * 1.15;
      const th = target.h ?? target.r * 0.9;
      // calm glides while watching; quicker when MedIQ goes to a problem
      const ease = reducedMotion ? 1 : Math.min(1, dt * (st.state === "watching" ? (resting ? 1.4 : 2.6) : 5));
      box.x += (target.x - box.x) * ease;
      box.y += (target.y - box.y) * ease;
      box.w += (tw - box.w) * ease;
      box.h += (th - box.h) * ease;
      const p = reducedMotion ? 1 : Math.min(1, (now - pullStart) / PULL_MS);
      const pull = pullStart > 0 ? 1 + 0.25 * (1 - easeOutBack(p)) : 1;
      const w = box.w * pull;
      const h = box.h * pull;
      const d = bracketPaths(box.x, box.y, w, h);
      d.forEach((path, i) => { corners[i].setAttribute("d", path); glowCorners[i].setAttribute("d", path); });
      const dashed = mode === "looking" || mode === "answering";
      for (const c of corners) c.setAttribute("stroke-dasharray", dashed ? "5 3" : "none");
      g.setAttribute("opacity", resting ? "0.45" : "1");
      const pulse = reducedMotion ? 0.5 : 0.35 + 0.3 * (0.5 + 0.5 * Math.sin(now / 260));
      glow.setAttribute("opacity", (dashed ? pulse : resting ? 0.2 : 0.55 + (1 - p) * 0.4).toFixed(3));
      tag.setAttribute("transform", `translate(${(box.x - w).toFixed(1)} ${(box.y - h - 24).toFixed(1)})`);

      // scan line while looking or answering
      if (dashed && !reducedMotion) {
        const y = box.y - h + ((now / 900) % 1) * 2 * h;
        scan.setAttribute("x1", (box.x - w).toFixed(1)); scan.setAttribute("x2", (box.x + w).toFixed(1));
        scan.setAttribute("y1", y.toFixed(1)); scan.setAttribute("y2", y.toFixed(1));
        scan.setAttribute("opacity", 0.7);
      } else scan.setAttribute("opacity", 0);

      // trail of the last moments of travel
      trailPts.push({ x: box.x, y: box.y, at: now });
      while (trailPts.length && now - trailPts[0].at > TRAIL_MS) trailPts.shift();
      const travel = trailPts.length > 1 ? Math.hypot(box.x - trailPts[0].x, box.y - trailPts[0].y) : 0;
      if (!reducedMotion && travel > 12) {
        trail.setAttribute("d", trailPts.map((q, i) => `${i ? "L" : "M"}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(" "));
        trail.setAttribute("opacity", Math.min(0.45, travel / 200).toFixed(3));
      } else trail.setAttribute("opacity", 0);

      // spotlight while explaining or urgent
      const spotOn = !resting && (mode === "explaining" || st.state === "urgent") && st.state !== "watching";
      const curSpot = Number(spot.getAttribute("opacity"));
      const wantSpot = spotOn ? 0.28 : 0;
      const nextSpot = reducedMotion ? wantSpot : curSpot + (wantSpot - curSpot) * Math.min(1, dt * 4);
      spot.setAttribute("opacity", nextSpot.toFixed(3));
      if (nextSpot > 0.005) {
        const pad = 14;
        spot.setAttribute("d", `M-4000 -4000 H8000 V8000 H-4000 Z M${(box.x - w - pad).toFixed(1)} ${(box.y - h - pad).toFixed(1)} H${(box.x + w + pad).toFixed(1)} V${(box.y + h + pad).toFixed(1)} H${(box.x - w - pad).toFixed(1)} Z`);
      }

      // the iris expression
      const k = now / 1000;
      let lidSy = 1;
      let px = 13;
      let py = 9;
      let pr = 2.4;
      if (!reducedMotion) {
        if (face === "watching") { const b = (k % 4.2) / 4.2; lidSy = b > 0.94 ? Math.abs(Math.cos(((b - 0.94) / 0.06) * Math.PI)) * 0.9 + 0.1 : 1; }
        if (face === "looking") px = 13 + 3 * Math.sin(k * 3.2);
        if (face === "answering") { px = 13 + 2.4 * Math.cos(k * 5); py = 9 + 1.6 * Math.sin(k * 5); }
      }
      if (face === "urgent") pr = 3.2;
      lid.setAttribute("transform", `translate(0 ${(9 * (1 - lidSy)).toFixed(2)}) scale(1 ${lidSy.toFixed(3)})`);
      lid.setAttribute("style", face === "urgent" ? "stroke:var(--high)" : "stroke:var(--panel)");
      pupil.setAttribute("cx", px.toFixed(2)); pupil.setAttribute("cy", py.toFixed(2)); pupil.setAttribute("r", pr);
      pupil.setAttribute("opacity", lidSy < 0.4 ? 0 : 1);

      // the note
      let key;
      let content;
      const ask = (q) => { if (!chat) onChatStart?.(); chat = { question: q, startReal: performance.now(), askedAt: currentT, reply: data.chat(q) }; };
      const back = () => { chat = null; onChatEnd?.(true); };
      const where = st.machine ? `${machineName(st.machine)} / ${componentName(st.machine, st.component)}` : "";
      if (st.state === "watching") { key = "none"; content = null; }
      else if (chat) {
        const answering = mode === "answering";
        const stepI = Math.min(chat.reply.steps.length - 1, Math.floor((now - chat.startReal) / 1100));
        key = `chat|${chat.question}|${answering ? `run|${stepI}` : "done"}`;
        const head = [data.clockTime(chat.askedAt), "answer", where];
        content = answering
          ? { head, state: "answering", step: `"${chat.question}" · ${chat.reply.steps[Math.max(0, stepI)] || "Thinking"}...` }
          : reportContent(chat.reply.report, { head, state: face, ask, step: `"${chat.question}"`, back });
      } else if (st.state === "looking") {
        key = `run|${st.analysis.startS}|${st.stepIndex}`;
        content = { head: [data.clockTime(st.analysis.startS), "looking into", where], state: "looking", step: `${st.analysis.steps[st.stepIndex]}...` };
      } else {
        key = `done|${st.analysis.startS}|${face}`;
        content = reportContent(st.analysis.report, { head: [data.clockTime(st.analysis.startS + st.analysis.durationS), where], state: face, ask });
      }
      const z = zone();
      if (content && z === "quiet") content = null;
      speaking = !!content;
      if (!content) clearSay();
      else if (!say || say.key !== key) mountSay(key, content);

      if (say) {
        if (say.text) {
          const n = reducedMotion ? say.full.length : Math.floor(((now - say.startReal) / 1000) * CHARS_PER_S);
          const done = n >= say.full.length;
          if (say.text.dataset.n !== String(Math.min(n, say.full.length))) {
            say.text.dataset.n = String(Math.min(n, say.full.length));
            say.text.textContent = say.full.slice(0, n);
            if (!done) html("span", { class: "caret", text: "▍" }, say.text);
          }
          if (done) for (const part of [say.meta, say.chips, say.form, say.back]) if (part) part.hidden = false;
        }
        const W = overlay.clientWidth;
        const H = overlay.clientHeight;
        if (z === "left" && W < 900) {
          say.root.style.maxWidth = `${W - 32}px`;
          say.root.style.width = `${W - 32}px`;
          const b = say.root.getBoundingClientRect();
          say.root.style.left = "16px";
          say.root.style.top = `${Math.max(110, H - b.height - 70)}px`;
          return;
        }
        say.root.style.width = "";
        if (z === "left") {
          say.root.style.maxWidth = `${Math.min(380, W * 0.27)}px`;
          const top = (document.getElementById("status-line")?.getBoundingClientRect().bottom || 90) + 14;
          say.root.style.left = "16px";
          say.root.style.top = `${Math.round(top)}px`;
          return;
        }
        say.root.style.maxWidth = "";
        const sp = worldToScreen(box.x, box.y);
        const b = say.root.getBoundingClientRect();
        const right = sp.x + 48 + b.width < W - 16;
        const x = Math.max(16, Math.min(W - b.width - 16, right ? sp.x + 48 : sp.x - 48 - b.width));
        const y = Math.max(100, Math.min(H - b.height - 70, sp.y - 30));
        say.root.style.left = `${x}px`;
        say.root.style.top = `${y}px`;
      }
    },
  };
}
