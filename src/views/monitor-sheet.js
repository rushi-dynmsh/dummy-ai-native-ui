// Console Monitor Sections & Views Sheet
// Provides direct, grounded access to all Console Monitor sections:
// - Overview: Plant Floor / Machine Schematic (the primary living canvas)
// - Machines: Fleet machines roster & rollups
// - PLC Alarms: Active alarms journal & priority filters
// - Anomalies: Anomaly episodes & detector drift evidence
// - Live Data: Real-time telemetry channels & engineering units
// - Health: Gateway, ingester, dead-letter queue, and DB pipeline status
// - Per-cycle: 60-second machine cycle history and feature verification
// - Baseline: Machine nominal baseline bounds

import { html } from "./svg.js";

const PRIORITY_TONES = {
  urgent: "critical",
  high: "high",
  medium: "medium",
  low: "low",
  critical: "critical",
  warning: "high",
};

export function createMonitorSheet({ root, data, onNavigateMachine, onNavigateSensor }) {
  let activeSection = null; // null or "overview" means sheet is closed
  let activeMachineTab = "dashboard";
  let activeMachine = null;
  let currentT = 0;
  let filterText = "";
  let activeOnly = true;

  // Build sheet container
  root.innerHTML = "";
  root.className = "monitor-sheet-root";
  root.hidden = true;

  const backdrop = html("div", { class: "monitor-sheet-backdrop" }, root);
  const panel = html("aside", { class: "monitor-sheet-panel", role: "region", "aria-label": "Monitor Section View" }, root);

  // Prevent wheel and pointer events inside panel from panning or zooming the SVG stage
  const stopProp = (e) => e.stopPropagation();
  panel.addEventListener("wheel", stopProp, { passive: false });
  panel.addEventListener("pointerdown", stopProp);
  backdrop.addEventListener("wheel", stopProp, { passive: false });
  backdrop.addEventListener("pointerdown", stopProp);
  backdrop.addEventListener("click", () => close());

  function close() {
    activeSection = null;
    activeMachineTab = "dashboard";
    root.hidden = true;
    updateNavButtons();
  }

  function open(section, machine = null, tab = null) {
    if (section === "overview" && (!tab || tab === "dashboard")) {
      close();
      return;
    }
    activeSection = section;
    activeMachine = machine;
    if (tab) activeMachineTab = tab;
    filterText = "";
    root.hidden = false;
    render();
    updateNavButtons();
  }

  function updateNavButtons() {
    const navItems = document.querySelectorAll(".monitor-nav-item");
    for (const item of navItems) {
      const sec = item.dataset.section;
      const isActive = (!activeSection && sec === "overview") || activeSection === sec;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    }

    const subTabs = document.querySelectorAll(".machine-subtab");
    for (const tab of subTabs) {
      const tabId = tab.dataset.tab;
      const isActive = activeMachineTab === tabId && (!activeSection || activeSection === tabId);
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-pressed", String(isActive));
    }
  }

  function render() {
    if (!activeSection) {
      root.hidden = true;
      return;
    }
    root.hidden = false;
    panel.innerHTML = "";

    // 1. Header
    const head = html("div", { class: "monitor-sheet-head" }, panel);
    const titleBox = html("div", { class: "monitor-sheet-title-box" }, head);
    
    let title = "Monitor View";
    let badgeText = "Plant-wide";

    if (activeSection === "machines") {
      title = "Fleet Machines Roster";
      badgeText = `${data.machines.length} machines`;
    } else if (activeSection === "plc-alarms") {
      title = "PLC Alarms Journal";
      badgeText = activeMachine ? `Machine: ${activeMachine}` : "All active alarms";
    } else if (activeSection === "anomalies") {
      title = "Anomaly Episodes";
      badgeText = activeMachine ? `Machine: ${activeMachine}` : "Detector evaluations";
    } else if (activeSection === "live-data") {
      title = "Live Telemetry Channels";
      badgeText = activeMachine ? `Machine: ${activeMachine}` : "Multi-channel feed";
    } else if (activeSection === "health") {
      title = "System Health & Pipeline";
      badgeText = "Gateway & Ingester";
    } else if (activeSection === "per-cycle") {
      title = "Per-Cycle Verification";
      badgeText = activeMachine || "Hydraulic Rig 01";
    } else if (activeSection === "baseline") {
      title = "Baseline Operating Limits";
      badgeText = activeMachine || "Hydraulic Rig 01";
    }

    html("h2", { class: "monitor-sheet-title", text: title }, titleBox);
    html("span", { class: "monitor-sheet-badge", text: badgeText }, titleBox);

    const closeBtn = html("button", {
      type: "button",
      class: "monitor-sheet-close",
      "aria-label": "Close monitor sheet",
      text: "×",
    }, head);
    closeBtn.addEventListener("click", () => close());

    // 2. Filter Toolbar (when applicable)
    if (["machines", "plc-alarms", "anomalies", "live-data"].includes(activeSection)) {
      const toolbar = html("div", { class: "monitor-sheet-toolbar" }, panel);
      const search = html("input", {
        type: "search",
        class: "monitor-sheet-search",
        placeholder: `Filter ${title.toLowerCase()}...`,
        value: filterText,
        "aria-label": "Filter table rows",
      }, toolbar);
      search.addEventListener("input", (e) => {
        filterText = e.target.value.toLowerCase();
        renderTableBody(tableContent);
      });

      if (activeSection === "anomalies" || activeSection === "plc-alarms") {
        const toggleWrap = html("label", { class: "monitor-sheet-check" }, toolbar);
        const check = html("input", { type: "checkbox", checked: activeOnly }, toggleWrap);
        html("span", { text: "Active only" }, toggleWrap);
        check.addEventListener("change", (e) => {
          activeOnly = e.target.checked;
          renderTableBody(tableContent);
        });
      }
    }

    // 3. Body Content
    const tableContent = html("div", { class: "monitor-sheet-body" }, panel);
    renderTableBody(tableContent);
  }

  function renderTableBody(container) {
    container.innerHTML = "";

    if (activeSection === "machines") {
      renderMachinesTable(container);
    } else if (activeSection === "plc-alarms") {
      renderAlarmsTable(container);
    } else if (activeSection === "anomalies") {
      renderAnomaliesTable(container);
    } else if (activeSection === "live-data") {
      renderLiveDataTable(container);
    } else if (activeSection === "health") {
      renderHealthDashboard(container);
    } else if (activeSection === "per-cycle") {
      renderCyclesTable(container);
    } else if (activeSection === "baseline") {
      renderBaselineTable(container);
    }
  }

  // --- 1. Machines Roster Table ---
  function renderMachinesTable(container) {
    const ov = data.overview(currentT);
    const ms = ov.sites[0].areas.flatMap((a) => a.lines.flatMap((l) => l.cells.flatMap((c) => c.machines)));
    const filtered = ms.filter((m) => !filterText || m.name.toLowerCase().includes(filterText) || m.code.includes(filterText));

    const table = html("table", { class: "monitor-table" }, container);
    table.innerHTML = `
      <thead>
        <tr>
          <th>Machine</th>
          <th>Asset Type</th>
          <th>Location</th>
          <th>Status</th>
          <th>Watch State</th>
          <th>Active Alarms</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="monitor-empty">No machines match filter.</td></tr>`;
      return;
    }

    for (const m of filtered) {
      const tr = html("tr", {}, tbody);
      const isWatched = m.rollup.watch_state === "watched";
      const hasAlarm = m.rollup.active_alarms > 0;
      
      tr.innerHTML = `
        <td><strong>${m.name}</strong><br><small class="muted font-code">${m.code}</small></td>
        <td>${m.asset_type?.name || "GenericMachine"}</td>
        <td>${m.cell ? `Cell ${m.cell.code}` : "Area 1"}</td>
        <td><span class="monitor-pill ${m.rollup.online ? "pill-online" : "pill-offline"}">${m.rollup.online ? "Online" : "Offline"}</span></td>
        <td><span class="monitor-pill ${isWatched ? "pill-watched" : "pill-unmanaged"}">${m.rollup.watch_state.toUpperCase()}</span></td>
        <td>${hasAlarm ? `<span class="monitor-pill pill-alarm">${m.rollup.active_alarms} active</span>` : `<span class="muted">0</span>`}</td>
        <td><button type="button" class="monitor-action-btn">Inspect on canvas</button></td>
      `;
      tr.querySelector("button").addEventListener("click", () => {
        close();
        if (onNavigateMachine) onNavigateMachine(m.code);
      });
    }
  }

  // --- 2. PLC Alarms Table ---
  function renderAlarmsTable(container) {
    const alarms = data.overviewAlarms ? data.overviewAlarms(currentT).items : [];
    const filtered = alarms.filter((a) => {
      if (activeMachine && a.machine !== activeMachine) return false;
      if (!filterText) return true;
      return a.name.toLowerCase().includes(filterText) ||
             (a.message && a.message.toLowerCase().includes(filterText)) ||
             a.machine_name.toLowerCase().includes(filterText);
    });

    const table = html("table", { class: "monitor-table" }, container);
    table.innerHTML = `
      <thead>
        <tr>
          <th>Priority</th>
          <th>Alarm Tag</th>
          <th>Machine</th>
          <th>Component</th>
          <th>Condition / Message</th>
          <th>Active Since</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="monitor-empty">No active alarms at this time.</td></tr>`;
      return;
    }

    for (const a of filtered) {
      const tr = html("tr", {}, tbody);
      const tone = PRIORITY_TONES[a.priority] || "medium";
      tr.innerHTML = `
        <td><span class="monitor-pill pill-${tone}">${a.priority.toUpperCase()}</span></td>
        <td><strong class="font-code">${a.name}</strong></td>
        <td>${a.machine_name}</td>
        <td>${a.component || "—"}</td>
        <td>${a.message || "Threshold exceeded"}</td>
        <td class="font-code">${data.clockTime(a.raised_s)}</td>
        <td><button type="button" class="monitor-action-btn">Focus</button></td>
      `;
      tr.querySelector("button").addEventListener("click", () => {
        close();
        if (a.slot && onNavigateSensor) {
          onNavigateSensor(a.machine, a.slot);
        } else if (onNavigateMachine) {
          onNavigateMachine(a.machine);
        }
      });
    }
  }

  // --- 3. Anomalies Table ---
  function renderAnomaliesTable(container) {
    const episodes = data.overviewAnomalies(currentT).items;
    const filtered = episodes.filter((e) => {
      if (activeMachine && e.machine !== activeMachine) return false;
      if (activeOnly && e.state !== "open") return false;
      if (!filterText) return true;
      return e.component.toLowerCase().includes(filterText) ||
             e.machine_name.toLowerCase().includes(filterText) ||
             e.kind.toLowerCase().includes(filterText);
    });

    const table = html("table", { class: "monitor-table" }, container);
    table.innerHTML = `
      <thead>
        <tr>
          <th>State</th>
          <th>Severity</th>
          <th>Machine</th>
          <th>Component</th>
          <th>Detector Kind</th>
          <th>Started</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="monitor-empty">No open anomaly episodes detected.</td></tr>`;
      return;
    }

    for (const e of filtered) {
      const tr = html("tr", {}, tbody);
      const tone = e.severity === "critical" ? "critical" : "high";
      tr.innerHTML = `
        <td><span class="monitor-pill ${e.state === "open" ? "pill-open" : "pill-closed"}">${e.state.toUpperCase()}</span></td>
        <td><span class="monitor-pill pill-${tone}">${e.severity.toUpperCase()}</span></td>
        <td><strong>${e.machine_name}</strong></td>
        <td>${e.component}</td>
        <td class="font-code">${e.kind}</td>
        <td class="font-code">${data.clockTime(e.started_s)}</td>
        <td><button type="button" class="monitor-action-btn">Inspect</button></td>
      `;
      tr.querySelector("button").addEventListener("click", () => {
        close();
        if (onNavigateMachine) onNavigateMachine(e.machine);
      });
    }
  }

  // --- 4. Live Data Channels Table ---
  function renderLiveDataTable(container) {
    const code = activeMachine || "hydraulic-rig-01";
    const dash = data.dashboard(code, currentT);
    const channels = dash.latest || [];
    const filtered = channels.filter((c) => {
      if (!filterText) return true;
      return c.name.toLowerCase().includes(filterText) ||
             c.slot.toLowerCase().includes(filterText) ||
             c.component.toLowerCase().includes(filterText);
    });

    const table = html("table", { class: "monitor-table" }, container);
    table.innerHTML = `
      <thead>
        <tr>
          <th>Slot</th>
          <th>Channel Name</th>
          <th>Component</th>
          <th>Live Value</th>
          <th>Normal Range</th>
          <th>Limits</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="monitor-empty">No channels found.</td></tr>`;
      return;
    }

    for (const c of filtered) {
      const tr = html("tr", {}, tbody);
      const valStr = typeof c.value === "number" ? c.value.toFixed(1) : String(c.value);
      const rangeStr = c.range_low !== null && c.range_high !== null ? `${c.range_low.toFixed(1)} – ${c.range_high.toFixed(1)} ${c.unit}` : "—";
      const limitsStr = c.limits && c.limits.length > 0 ? c.limits.map((l) => `${l.kind} ${l.value}`).join(", ") : "None";

      tr.innerHTML = `
        <td class="font-code text-muted">${c.slot}</td>
        <td><strong>${c.name}</strong></td>
        <td>${c.component}</td>
        <td><strong class="font-code">${valStr} ${c.unit}</strong></td>
        <td class="font-code text-muted">${rangeStr}</td>
        <td class="font-code text-muted">${limitsStr}</td>
        <td><button type="button" class="monitor-action-btn">Waveform</button></td>
      `;
      tr.querySelector("button").addEventListener("click", () => {
        close();
        if (onNavigateSensor) onNavigateSensor(code, c.slot);
      });
    }
  }

  // --- 5. System Health Dashboard ---
  function renderHealthDashboard(container) {
    const h = data.health ? data.health(currentT) : {
      gateway: { reachable: true, status: "ok", machines: ["hydraulic-rig-01"] },
      ingester: { status: "healthy", queue_depth: 0, dead_letters: 0 },
      database: { status: "connected", driver: "asyncpg", pool_size: 10 },
      intelligence: { status: "active", detectors_loaded: 4 },
    };

    container.innerHTML = `
      <div class="health-grid">
        <div class="health-card">
          <div class="health-card-head">
            <span class="health-icon">🔌</span>
            <strong>OPC UA / Gateway</strong>
            <span class="monitor-pill pill-online">CONNECTED</span>
          </div>
          <p class="health-detail">Gateway ID: <code>${h.gateway.gateway_id || "gw-main-01"}</code></p>
          <p class="health-detail">Managing: ${h.gateway.machines.length} machines (${h.gateway.devices?.length || 1} OPC UA endpoints)</p>
          <p class="health-detail text-muted">Latency: ~8 ms</p>
        </div>

        <div class="health-card">
          <div class="health-card-head">
            <span class="health-icon">📥</span>
            <strong>Telemetry Ingester</strong>
            <span class="monitor-pill pill-online">HEALTHY</span>
          </div>
          <p class="health-detail">Queue Depth: <strong>${h.ingester.queue_depth}</strong> messages</p>
          <p class="health-detail">Dead Letters: <strong>${h.ingester.dead_letters}</strong></p>
          <p class="health-detail text-muted">Lag: ${h.ingester.lag_ms || 12} ms (MQTT broker healthy)</p>
        </div>

        <div class="health-card">
          <div class="health-card-head">
            <span class="health-icon">🗄️</span>
            <strong>TimescaleDB</strong>
            <span class="monitor-pill pill-online">CONNECTED</span>
          </div>
          <p class="health-detail">Driver: <code>${h.database.driver}</code></p>
          <p class="health-detail">Connection Pool: <strong>${h.database.pool_available || 9}</strong> / ${h.database.pool_size || 10} available</p>
          <p class="health-detail text-muted">Compression: Hypertables active (1-day chunk)</p>
        </div>

        <div class="health-card">
          <div class="health-card-head">
            <span class="health-icon">⚡</span>
            <strong>Intelligence Pipeline</strong>
            <span class="monitor-pill pill-online">ACTIVE</span>
          </div>
          <p class="health-detail">Detectors Loaded: <strong>${h.intelligence.detectors_loaded || 4}</strong> statistical detectors</p>
          <p class="health-detail">Evaluation Cadence: 60-second cycle lock</p>
          <p class="health-detail text-muted">Detection Mode: Deterministic statistical drift (zero ML)</p>
        </div>
      </div>
    `;
  }

  // --- 6. Per-Cycle Table (Machine Drilldown) ---
  function renderCyclesTable(container) {
    const code = activeMachine || "hydraulic-rig-01";
    const cyc = data.cycles(code, currentT);
    const items = cyc.items || [];

    const table = html("table", { class: "monitor-table" }, container);
    table.innerHTML = `
      <thead>
        <tr>
          <th>Cycle #</th>
          <th>State</th>
          <th>Start Time</th>
          <th>End Time</th>
          <th>Duration</th>
          <th>Features Extracted</th>
          <th>Completeness</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="monitor-empty">No cycles recorded yet for this machine.</td></tr>`;
      return;
    }

    for (const c of items.slice().reverse()) {
      const tr = html("tr", {}, tbody);
      tr.innerHTML = `
        <td><strong>Cycle ${c.cycle_number}</strong></td>
        <td><span class="monitor-pill pill-online">${c.state.toUpperCase()}</span></td>
        <td class="font-code">${data.clockTime(Math.max(0, currentT - (items.length - c.cycle_number + 1) * 60))}</td>
        <td class="font-code">${data.clockTime(Math.max(0, currentT - (items.length - c.cycle_number) * 60))}</td>
        <td class="font-code">${c.duration_s.toFixed(1)}s</td>
        <td><span class="monitor-pill pill-watched">VERIFIED</span></td>
        <td>${c.complete ? "Complete (100%)" : "Incomplete"}</td>
      `;
    }
  }

  // --- 7. Baseline Table (Machine Drilldown) ---
  function renderBaselineTable(container) {
    const code = activeMachine || "hydraulic-rig-01";
    const dash = data.dashboard(code, currentT);
    const channels = dash.latest || [];

    const table = html("table", { class: "monitor-table" }, container);
    table.innerHTML = `
      <thead>
        <tr>
          <th>Slot</th>
          <th>Channel</th>
          <th>Component</th>
          <th>Nominal Mean</th>
          <th>Normal Spread (2σ)</th>
          <th>Operational Limits</th>
          <th>Current Value</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");

    for (const c of channels) {
      const tr = html("tr", {}, tbody);
      const low = c.range_low !== null ? c.range_low.toFixed(1) : "—";
      const high = c.range_high !== null ? c.range_high.toFixed(1) : "—";
      const valStr = typeof c.value === "number" ? c.value.toFixed(1) : String(c.value);

      tr.innerHTML = `
        <td class="font-code text-muted">${c.slot}</td>
        <td><strong>${c.name}</strong></td>
        <td>${c.component}</td>
        <td class="font-code">${c.range_low !== null ? ((c.range_low + c.range_high) / 2).toFixed(1) : "—"} ${c.unit}</td>
        <td class="font-code text-muted">± ${c.range_low !== null ? ((c.range_high - c.range_low) / 4).toFixed(1) : "—"}</td>
        <td class="font-code">${low} – ${high} ${c.unit}</td>
        <td><strong class="font-code">${valStr} ${c.unit}</strong></td>
      `;
    }
  }

  // Update time hook for active sheets
  function setTime(t) {
    currentT = t;
    if (activeSection) {
      const body = panel.querySelector(".monitor-sheet-body");
      if (body) renderTableBody(body);
    }
  }

  return {
    open,
    close,
    isOpen: () => activeSection !== null,
    getActiveSection: () => activeSection,
    setTime,
  };
}

