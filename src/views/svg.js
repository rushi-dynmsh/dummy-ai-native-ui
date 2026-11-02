// Small helpers shared by the views.

const NS = "http://www.w3.org/2000/svg";

export function el(tag, attrs = {}, parent = null) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
}

export function text(parent, x, y, str, cls, attrs = {}) {
  const t = el("text", { x, y, class: cls, ...attrs }, parent);
  t.textContent = str;
  return t;
}

export function html(tag, attrs = {}, parent = null) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "text") node.textContent = v;
    else if (v !== undefined && v !== null) node.setAttribute(k, v);
  }
  if (parent) parent.appendChild(node);
  return node;
}

export const STATUS_COLOR = {
  urgent: "var(--critical)",
  critical: "var(--critical)",
  high: "var(--high)",
  medium: "var(--medium)",
  low: "var(--low)",
  warning: "var(--high)",
  info: "var(--low)",
};

const PRIORITY_RANK = { urgent: 4, high: 3, medium: 2, low: 1 };

// The state rule of approach 1 (A05): the worst open item decides.
export function machineState(rollup) {
  if (!rollup) return { word: "No data", level: "nodata", color: null };
  const p = rollup.highest_priority;
  const s = rollup.highest_severity;
  if (p === "urgent") return { word: "Act now", level: "urgent", color: STATUS_COLOR.urgent, alarm: true };
  if (p === "high" || s === "critical")
    return { word: "Needs attention", level: p === "high" ? "high" : "critical", color: p === "high" ? STATUS_COLOR.high : STATUS_COLOR.critical, alarm: !!p, ring: !p || PRIORITY_RANK[p] < 3 };
  if (p || s) return { word: "Watch", level: p || "warning", color: STATUS_COLOR[p || "warning"], alarm: !!p, ring: !p };
  return { word: "Healthy", level: "ok", color: null };
}

export function formatValue(v, unit) {
  if (v === null || v === undefined) return "–";
  const abs = Math.abs(v);
  const digits = abs >= 1000 ? 0 : abs >= 100 ? 1 : abs >= 10 ? 1 : 2;
  return v.toLocaleString("en-GB", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function storyClock(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function setText(node, value) {
  if (node.textContent !== value) node.textContent = value;
}

export const lerp = (a, b, k) => a + (b - a) * k;
export const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
