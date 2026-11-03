// "How this works" overlay panel.
// Displays the mapping of UI behaviours and data points to real backend sources
// for the current screen and context.

import { TECH_NOTES, getAllTechNotes, computeSummaryCounts } from "../data/tech-notes.js";
import { html } from "./svg.js";

const SCREEN_TITLES = {
  plant: "Plant View",
  machine: "Machine View",
  sensor: "Sensor Trace View",
  logical: "Logical Hierarchy View",
  ai: "AI Agent & Logbook",
  status: "Header & Status Line",
  events: "Event Log Panel",
  player: "Story Player & Controls",
};

export function createTechOverlay({ root, button, getNavigation, data }) {
  let isOpen = false;
  let activeTab = "auto"; // "auto" tracks navigation, or explicit screen key, or "all"
  let previousActiveElement = null;
  let highlightedElements = [];

  // Build overlay DOM
  root.innerHTML = "";
  root.className = "tech-overlay";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "How this works: backend data mapping");
  root.hidden = true;

  const backdrop = html("div", { class: "tech-backdrop" }, root);
  const panel = html("aside", { class: "tech-panel", role: "document" }, root);

  // Prevent wheel and pointer events inside panel from panning or zooming the SVG stage
  const stopStageInteraction = (e) => e.stopPropagation();
  panel.addEventListener("wheel", stopStageInteraction, { passive: false });
  panel.addEventListener("pointerdown", stopStageInteraction);
  backdrop.addEventListener("wheel", stopStageInteraction, { passive: false });
  backdrop.addEventListener("pointerdown", stopStageInteraction);

  // Panel Header
  const header = html("div", { class: "tech-header" }, panel);
  const titleRow = html("div", { class: "tech-title-row" }, header);
  const titleWrap = html("div", { class: "tech-title-wrap" }, titleRow);
  html("span", { class: "tech-icon-badge", text: "⚡" }, titleWrap);
  html("h2", { class: "tech-title", text: "How this works" }, titleWrap);
  const contextBadge = html("span", { class: "tech-context-badge" }, titleWrap);

  const closeBtn = html("button", {
    class: "tech-close-btn",
    type: "button",
    "aria-label": "Close How this works overlay",
    text: "×",
  }, titleRow);

  // Summary counter bar
  const summaryBar = html("div", { class: "tech-summary-banner", "aria-live": "polite" }, header);

  // Tabs for switching screens/views inside the overlay
  const tabNav = html("nav", { class: "tech-tabs", "aria-label": "Filter by screen" }, header);

  const TAB_DEFS = [
    { id: "auto", label: "Current view" },
    { id: "plant", label: "Plant" },
    { id: "machine", label: "Machine" },
    { id: "sensor", label: "Sensor" },
    { id: "logical", label: "Logical" },
    { id: "ai", label: "AI Copilot" },
    { id: "status", label: "Status line" },
    { id: "events", label: "Event log" },
    { id: "all", label: `All (${getAllTechNotes().length})` },
  ];

  const tabButtons = new Map();
  for (const tab of TAB_DEFS) {
    const btn = html("button", {
      class: `tech-tab ${tab.id === activeTab ? "is-active" : ""}`,
      type: "button",
      text: tab.label,
    }, tabNav);
    btn.addEventListener("click", () => {
      activeTab = tab.id;
      renderContent();
    });
    tabButtons.set(tab.id, btn);
  }

  // Scrollable list body
  const listBody = html("div", { class: "tech-content" }, panel);

  // Gap detail modal / flyout inside panel
  const gapModal = html("div", { class: "tech-gap-modal", hidden: true }, panel);

  function clearHighlights() {
    for (const el of highlightedElements) {
      el.classList.remove("tech-highlight");
    }
    highlightedElements = [];
  }

  function applyHighlight(selector) {
    clearHighlights();
    if (!selector) return;
    try {
      const els = document.querySelectorAll(selector);
      for (const el of els) {
        el.classList.add("tech-highlight");
        highlightedElements.push(el);
      }
    } catch {
      // ignore invalid selector
    }
  }

  function determineCurrentScreen() {
    const nav = getNavigation ? getNavigation() : { level: "plant", view: "physical" };
    if (nav.view === "logical") return "logical";
    if (nav.level === "sensor") return "sensor";
    if (nav.level === "machine") return "machine";
    return "plant";
  }

  function getContextLabel() {
    const nav = getNavigation ? getNavigation() : { level: "plant", view: "physical" };
    if (nav.view === "logical") return "Screen: Logical hierarchy";
    if (nav.level === "sensor") {
      const m = data.machines.find((x) => x.code === nav.machine);
      const s = m?.sensors.find((x) => x.slot === nav.sensor);
      return `Screen: Sensor (${s?.name || nav.sensor})`;
    }
    if (nav.level === "machine") {
      const m = data.machines.find((x) => x.code === nav.machine);
      return `Screen: Machine (${m?.name || nav.machine})`;
    }
    return "Screen: Plant floor";
  }

  function renderContent() {
    const currentScreen = determineCurrentScreen();
    contextBadge.textContent = getContextLabel();

    // Update active tab buttons
    for (const [id, btn] of tabButtons.entries()) {
      const isActive = id === activeTab;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-selected", String(isActive));
    }

    // Determine which notes to show
    let notesToShow = [];
    if (activeTab === "all") {
      notesToShow = getAllTechNotes();
    } else if (activeTab === "auto") {
      // Show notes for current screen, plus relevant status/ai features
      notesToShow = TECH_NOTES[currentScreen] || [];
    } else {
      notesToShow = TECH_NOTES[activeTab] || [];
    }

    // Render summary bar
    const counts = computeSummaryCounts(notesToShow);
    summaryBar.innerHTML = "";
    html("span", {
      class: "tech-summary-total",
      text: `${counts.EXISTS} of ${counts.total} served today`,
    }, summaryBar);
    html("span", { class: "tech-sep", text: "·" }, summaryBar);
    html("span", {
      class: "tech-summary-partial",
      text: `${counts.PARTIAL} partial`,
    }, summaryBar);
    html("span", { class: "tech-sep", text: "·" }, summaryBar);
    html("span", {
      class: "tech-summary-missing",
      text: `${counts.MISSING} missing`,
    }, summaryBar);
    if (counts.PRESENTATION > 0) {
      html("span", { class: "tech-sep", text: "·" }, summaryBar);
      html("span", {
        class: "tech-summary-pres",
        text: `${counts.PRESENTATION} presentation`,
      }, summaryBar);
    }

    // Render list
    listBody.innerHTML = "";
    if (notesToShow.length === 0) {
      html("div", { class: "tech-empty", text: "No features documented for this view." }, listBody);
      return;
    }

    for (const item of notesToShow) {
      const card = html("article", { class: `tech-feature-card tech-feature-card--${item.status.toLowerCase()}` }, listBody);

      // Card Header
      const cardHead = html("div", { class: "tech-card-top" }, card);
      const titleEl = html("h3", { class: "tech-feature-name", text: item.name }, cardHead);

      const badgesWrap = html("div", { class: "tech-card-badges" }, cardHead);
      const statusChip = html("span", {
        class: `tech-status-chip tech-status-${item.status.toLowerCase()}`,
        text: item.status,
      }, badgesWrap);

      if (item.gap) {
        const gapLink = html("button", {
          class: "tech-gap-chip",
          type: "button",
          title: `System Gap ${item.gap}: click for details`,
          text: item.gap,
        }, badgesWrap);
        gapLink.addEventListener("click", () => showGapDetails(item.gap, item.name));
      }

      // Source reference
      const sourceRow = html("div", { class: "tech-card-source" }, card);
      html("span", { class: "tech-source-label", text: "Source today: " }, sourceRow);
      html("code", { class: "tech-source-code", text: item.source }, sourceRow);

      // 2-3 bullets
      const ul = html("ul", { class: "tech-card-bullets" }, card);
      for (const bullet of item.bullets) {
        html("li", { text: bullet }, ul);
      }

      // Hover highlight on drawing element
      card.addEventListener("mouseenter", () => applyHighlight(item.selector));
      card.addEventListener("mouseleave", clearHighlights);
    }
  }

  function showGapDetails(gapId, featureName) {
    gapModal.hidden = false;
    gapModal.innerHTML = "";
    const mHead = html("div", { class: "tech-gap-modal-head" }, gapModal);
    html("b", { text: `Gap ${gapId} details` }, mHead);
    const mClose = html("button", {
      class: "tech-gap-close-btn",
      type: "button",
      text: "Close",
    }, mHead);
    mClose.addEventListener("click", () => { gapModal.hidden = true; });

    const mBody = html("div", { class: "tech-gap-modal-body" }, gapModal);
    html("p", { text: `Related to feature: ${featureName}` }, mBody);
    html("p", {
      text: `Refer to product-revamp/SYSTEM_GAPS.md (${gapId}) for architectural requirements, impact analysis, and resolution options.`,
    }, mBody);
  }

  function trapFocus(e) {
    if (!isOpen) return;
    if (e.key === "Escape") {
      e.stopPropagation();
      e.preventDefault();
      close();
      return;
    }

    if (e.key !== "Tab") return;

    const focusables = panel.querySelectorAll('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        last.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    previousActiveElement = document.activeElement;
    root.hidden = false;
    button?.setAttribute("aria-expanded", "true");
    renderContent();
    window.addEventListener("keydown", trapFocus, true); // Capture phase to intercept Escape before app.js
    closeBtn.focus();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    clearHighlights();
    root.hidden = true;
    gapModal.hidden = true;
    button?.setAttribute("aria-expanded", "false");
    window.removeEventListener("keydown", trapFocus, true);
    if (previousActiveElement && typeof previousActiveElement.focus === "function") {
      previousActiveElement.focus();
    }
  }

  // Event Listeners
  closeBtn.addEventListener("click", close);
  backdrop.addEventListener("click", close);
  button?.addEventListener("click", () => {
    if (isOpen) close();
    else open();
  });

  return {
    open,
    close,
    isOpen: () => isOpen,
    updateContext: () => {
      if (isOpen && activeTab === "auto") {
        renderContent();
      }
    },
  };
}

