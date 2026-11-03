// MedIQ Copilot (Grounded AI Assistant)
// Strictly grounded in backend reality (mediq-contract-v2, use-the-chat-api.md, AnswerView.tsx).
// No imaginary camera tours, no roaming laser scanners, no smoke trails, no stage spotlights.
// Provides an on-demand, context-aware Copilot for predictive maintenance, structured RCA reports,
// safety warnings, claim verification, and interactive follow-ups.

import { el, html } from "./svg.js";

const SOURCE_NAMES = {
  get_channel_trend: "Signal trend (TimescaleDB)",
  get_cycle_statistics: "Cycle statistics (features.cycle_feature)",
  compare_windows: "Baseline comparison (intelligence.baseline)",
  get_alarm_states: "Alarm states (asset.device_alarm_version)",
  machine_live_status: "Live status (telemetry.latest_values)",
};

const sourceName = (src) => (src.kind === "document" ? `Service guide, ${src.detail}` : SOURCE_NAMES[src.ref] || src.ref);

// Clean copilot icon (subtle geometric spark/terminal)
export function irisHTML(state = "watching") {
  return `<svg class="iris" data-state="${state}" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5">` +
    `<rect x="2" y="2" width="12" height="12" rx="3" stroke="currentColor"/>` +
    `<circle cx="6" cy="7" r="1" fill="currentColor"/>` +
    `<circle cx="10" cy="7" r="1" fill="currentColor"/>` +
    `<path d="M5 11h6" stroke-linecap="round"/>` +
    `</svg>`;
}

export function createAI(svgLayer, overlay, data, { anchorFor, restAnchor, plantCenter, onChatStart, onChatEnd }) {
  // SVG highlight: simple, clean industrial focus outline (no glowing blur filters or laser lines)
  const g = el("g", { class: "ai-focus-group", "pointer-events": "none" }, svgLayer);
  const focusBox = el("rect", {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    rx: 4,
    fill: "none",
    stroke: "var(--brand)",
    "stroke-width": 1.5,
    "stroke-dasharray": "6 4",
    opacity: 0,
  }, g);

  // Copilot Side Panel Container
  let panelRoot = document.getElementById("ai-copilot-panel");
  if (!panelRoot) {
    panelRoot = html("aside", { id: "ai-copilot-panel", class: "ai-copilot-panel", "aria-label": "MedIQ Copilot" }, overlay);
  }

  let isOpen = true; // open by default on desktop for an AI-native workspace
  let currentNav = { level: "plant", machine: null, sensor: null };
  let currentT = 0;
  let activeThread = []; // messages history
  let pendingRun = null; // { prompt, steps, stepIndex, startReal }
  let userDraft = "";
  let lastPromptAsked = null;

  function renderCopilot() {
    panelRoot.innerHTML = "";
    panelRoot.classList.toggle("is-collapsed", !isOpen);

    // Header
    const header = html("div", { class: "ai-copilot-header" }, panelRoot);
    const titleBox = html("div", { class: "ai-copilot-title-box" }, header);
    titleBox.innerHTML = `${irisHTML("watching")} <span class="ai-copilot-title">MedIQ Copilot</span>`;
    
    const statusPill = html("span", { class: "ai-status-pill", text: "Read-only tools" }, titleBox);

    const toggleBtn = html("button", {
      type: "button",
      class: "ai-copilot-toggle",
      "aria-label": isOpen ? "Collapse copilot" : "Expand copilot",
      text: isOpen ? "›" : "‹",
    }, header);
    toggleBtn.addEventListener("click", () => {
      isOpen = !isOpen;
      renderCopilot();
    });

    if (!isOpen) return;

    // Body scroll area
    const body = html("div", { class: "ai-copilot-body" }, panelRoot);

    // Active Context Card
    renderContextCard(body);

    // Conversation / Answers View
    const conversation = html("div", { class: "ai-conversation" }, body);
    if (activeThread.length === 0 && !pendingRun) {
      renderWelcomeState(conversation);
    } else {
      for (const msg of activeThread) {
        renderMessage(conversation, msg);
      }
      if (pendingRun) {
        renderPendingRun(conversation, pendingRun);
      }
    }

    // Interactive Composer / Input bar
    renderComposer(panelRoot);
  }

  function renderContextCard(container) {
    const card = html("div", { class: "ai-context-card" }, container);
    const m = currentNav.machine ? data.machines.find((x) => x.code === currentNav.machine) : null;
    const an = currentNav.machine ? data.anomalies(currentNav.machine, currentT).items : [];
    const activeEp = an.find((e) => e.state === "open");

    const header = html("div", { class: "ai-context-header" }, card);
    html("span", { class: "ai-context-label", text: "Focused Context" }, header);
    html("span", { class: "ai-context-target", text: m ? m.name : "Fleet Overview" }, header);

    if (activeEp) {
      const alert = html("div", { class: "ai-context-alert" }, card);
      html("span", { class: `mk ${activeEp.severity === "critical" ? "critical" : "warning"}`, "aria-hidden": "true" }, alert);
      html("span", { text: `Active Anomaly: ${activeEp.component} (${activeEp.kind})` }, alert);

      // Contextual quick questions
      const suggestions = html("div", { class: "ai-quick-actions" }, card);
      const q1 = `Explain ${activeEp.component} anomaly`;
      const q2 = `Is the pump affected?`;
      const q3 = `What should I check first?`;

      for (const q of [q1, q2, q3]) {
        const btn = html("button", { type: "button", class: "ai-quick-btn", text: q }, suggestions);
        btn.addEventListener("click", () => ask(q));
      }
    } else {
      const info = html("div", { class: "ai-context-info", text: "Deterministic detectors normal. Copilot standing by for telemetry analysis." }, card);
    }
  }

  function renderWelcomeState(container) {
    const welcome = html("div", { class: "ai-welcome" }, container);
    html("p", { class: "ai-welcome-title", text: "How can MedIQ assist your inspection?" }, welcome);
    html("p", { class: "ai-welcome-sub", text: "The local AI copilot uses read-only MCP tools to inspect cycle features, trends, and alarm contracts. It detects and explains without modifying equipment." }, welcome);

    const promptsBox = html("div", { class: "ai-welcome-prompts" }, welcome);
    const samplePrompts = [
      "Is the pump affected?",
      "How fast is it getting worse?",
      "What should I check first?",
    ];
    for (const p of samplePrompts) {
      const chip = html("button", { type: "button", class: "ai-chip", text: p }, promptsBox);
      chip.addEventListener("click", () => ask(p));
    }
  }

  function renderMessage(container, msg) {
    const row = html("div", { class: `ai-msg ai-msg-${msg.role}` }, container);

    if (msg.role === "user") {
      const bubble = html("div", { class: "ai-user-bubble", text: msg.content }, row);
      return;
    }

    // Assistant Message formatted per AnswerView.tsx
    const bubble = html("div", { class: "ai-assistant-bubble" }, row);
    const answer = msg.answer;

    // 1. Safety Flags Banner (Prominent)
    if (answer && answer.safety_flags && answer.safety_flags.length > 0) {
      const banner = html("div", { class: "ai-safety-banner", role: "alert" }, bubble);
      html("strong", { text: "⚠️ Safety Requirement:" }, banner);
      const ul = html("ul", {}, banner);
      for (const flag of answer.safety_flags) {
        html("li", { text: flag }, ul);
      }
    }

    // 2. Markdown Content
    const textEl = html("div", { class: "ai-content-text" }, bubble);
    textEl.innerHTML = formatMarkdown(msg.content);

    // 3. Metadata (Confidence & Machine Code Pill)
    if (answer && (answer.confidence || answer.machine_id)) {
      const meta = html("div", { class: "ai-meta-pills" }, bubble);
      if (answer.confidence) {
        html("span", { class: `ai-pill tone-${answer.confidence}`, text: `Confidence: ${answer.confidence}` }, meta);
      }
      if (answer.machine_id) {
        html("span", { class: "ai-pill tone-machine", text: `Machine: ${currentNav.machine || answer.machine_id}` }, meta);
      }
    }

    // 4. Missing Data Gaps
    if (answer && answer.data_gaps && answer.data_gaps.length > 0) {
      const gapsBox = html("div", { class: "ai-data-gaps" }, bubble);
      html("strong", { text: "Data Gaps:" }, gapsBox);
      const ul = html("ul", {}, gapsBox);
      for (const gap of answer.data_gaps) {
        html("li", { text: gap }, ul);
      }
    }

    // 5. Claims and Sources Accordion
    if (answer && answer.claims && answer.claims.length > 0) {
      const details = html("details", { class: "ai-claims-details" }, bubble);
      const summary = html("summary", { text: `Claims and verified sources (${answer.claims.length})` }, details);
      const ul = html("ul", { class: "ai-claims-list" }, details);
      for (const claim of answer.claims) {
        const li = html("li", {}, ul);
        html("span", { class: "ai-claim-stmt", text: claim.statement }, li);
        if (claim.sources && claim.sources.length > 0) {
          const srcUl = html("ul", { class: "ai-sources-list" }, li);
          for (const s of claim.sources) {
            const detailText = s.detail ? ` (${s.detail})` : "";
            html("li", { text: `${s.kind === "tool" ? "Tool" : "Doc"}: ${sourceName(s)}${detailText}` }, srcUl);
          }
        }
      }
    }

    // 6. Follow-up Questions (Clickable chips)
    if (answer && answer.follow_up_questions && answer.follow_up_questions.length > 0) {
      const followBox = html("div", { class: "ai-followups" }, bubble);
      html("span", { class: "ai-followup-title", text: "Suggested follow-ups:" }, followBox);
      const chips = html("div", { class: "ai-chips-row" }, followBox);
      for (const q of answer.follow_up_questions) {
        const btn = html("button", { type: "button", class: "ai-chip", text: q }, chips);
        btn.addEventListener("click", () => ask(q));
      }
    }
  }

  function renderPendingRun(container, run) {
    const row = html("div", { class: "ai-msg ai-msg-assistant" }, container);
    const bubble = html("div", { class: "ai-assistant-bubble is-pending" }, row);

    const spinner = html("div", { class: "ai-pending-header" }, bubble);
    spinner.innerHTML = `<span class="ai-spinner"></span> <span>MedIQ is investigating...</span>`;

    if (run.steps && run.steps.length > 0) {
      const stepText = run.steps[Math.min(run.stepIndex, run.steps.length - 1)];
      html("div", { class: "ai-pending-step", text: `🔧 ${stepText}` }, bubble);
    }
  }

  function renderComposer(container) {
    let form = container.querySelector(".ai-composer");
    if (!form) {
      form = html("form", { class: "ai-composer" }, container);
    } else {
      form.innerHTML = "";
    }

    const input = html("input", {
      type: "text",
      class: "ai-composer-input",
      placeholder: currentNav.machine ? `Ask about ${currentNav.machine}...` : "Ask MedIQ about machines or alarms...",
      value: userDraft,
      "aria-label": "Copilot question input",
    }, form);

    input.addEventListener("input", (e) => {
      userDraft = e.target.value;
    });

    const submit = html("button", {
      type: "submit",
      class: "ai-composer-submit",
      text: "Send",
      disabled: pendingRun !== null,
    }, form);

    form.onsubmit = (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (q) {
        userDraft = "";
        ask(q);
      }
    };
  }

  function ask(question) {
    if (!question || pendingRun) return;
    lastPromptAsked = question;

    // Add user message
    activeThread.push({ role: "user", content: question });

    // Lookup answer or resolve fallback
    let response = data.chat(question);
    if (response === data.FALLBACK || !response) {
      // Check if question matches an anomaly explanation
      if (question.toLowerCase().includes("anomaly") || question.toLowerCase().includes("cooler")) {
        const an = data.aiState(currentT);
        if (an && an.analysis) {
          response = {
            steps: an.analysis.steps,
            report: an.analysis.report,
          };
        }
      }
    }

    const steps = response.steps || ["Querying TimescaleDB telemetry", "Evaluating detector states"];
    pendingRun = {
      prompt: question,
      response,
      steps,
      stepIndex: 0,
      startReal: performance.now(),
    };

    onChatStart?.();
    renderCopilot();
  }

  function formatMarkdown(text) {
    if (!text) return "";
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br/>");
  }

  function updateFocusBox(nav) {
    if (!nav.machine) {
      focusBox.setAttribute("opacity", 0);
      return;
    }
    const target = anchorFor(nav, nav.machine, null);
    if (!target) {
      focusBox.setAttribute("opacity", 0);
      return;
    }
    const w = target.w || target.r * 2 || 200;
    const h = target.h || target.r * 1.5 || 150;
    focusBox.setAttribute("x", (target.x - w / 2).toFixed(1));
    focusBox.setAttribute("y", (target.y - h / 2).toFixed(1));
    focusBox.setAttribute("width", w.toFixed(1));
    focusBox.setAttribute("height", h.toFixed(1));
    focusBox.setAttribute("opacity", 0.65);
  }

  // Initial render
  renderCopilot();

  return {
    isSpeaking: () => pendingRun !== null || activeThread.length > 0,
    isOpen: () => isOpen,
    toggle: () => {
      isOpen = !isOpen;
      renderCopilot();
    },
    open: () => {
      isOpen = true;
      renderCopilot();
    },
    close: () => {
      isOpen = false;
      renderCopilot();
    },
    ask,
    update(t, nav, { reducedMotion }) {
      currentT = t;
      const navChanged = currentNav.machine !== nav.machine || currentNav.level !== nav.level;
      currentNav = { ...nav };

      updateFocusBox(nav);

      // Progress pending run steps
      if (pendingRun) {
        const now = performance.now();
        const elapsed = now - pendingRun.startReal;
        const totalDuration = (pendingRun.steps.length + 1) * 800;

        pendingRun.stepIndex = Math.floor((elapsed / totalDuration) * pendingRun.steps.length);

        if (elapsed >= totalDuration) {
          // Completed! Add assistant message
          const rep = pendingRun.response.report;
          activeThread.push({
            role: "assistant",
            content: rep.answer,
            answer: rep,
          });
          pendingRun = null;
          onChatEnd?.(true);
          renderCopilot();
        } else {
          // Update pending step in UI
          const stepEl = panelRoot.querySelector(".ai-pending-step");
          if (stepEl && pendingRun.steps[pendingRun.stepIndex]) {
            stepEl.textContent = `🔧 ${pendingRun.steps[pendingRun.stepIndex]}`;
          }
        }
      } else if (navChanged) {
        // Refresh context card
        const cardContainer = panelRoot.querySelector(".ai-context-card");
        if (cardContainer && cardContainer.parentElement) {
          const parent = cardContainer.parentElement;
          cardContainer.remove();
          renderContextCard(parent);
        }
      }
    },
  };
}
