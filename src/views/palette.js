// Live Palette and Theme Engine
// Allows live experimentation with color combinations, presets, and granular color levels:
// - Primary: Brand accent & AI highlight
// - Secondary: Surfaces & Cards
// - Tertiary: Structural borders & dividers
// - Background: Plant floor canvas backdrop
// - Text: Headings, labels, and readouts
// Saves to localStorage and updates CSS variables dynamically on :root.

export const PRESETS = {
  "slate-teal": {
    name: "MedIQ Phase 8 (Slate Teal)",
    dark: {
      "--bg": "#0B1313",
      "--surface": "#121D1D",
      "--surface-2": "#182727",
      "--border": "#273939",
      "--border-strong": "#4A6362",
      "--fg": "#E6EFEE",
      "--muted": "#A3B6B4",
      "--brand": "#2CC5B0",
      "--brand-hover": "#4AD6C3",
      "--brand-soft": "rgba(44, 197, 176, 0.15)",
      "--ai": "#2CC5B0",
      "--ai-soft": "rgba(44, 197, 176, 0.12)",
      "--panel": "#121D1D",
      "--panel-2": "#182727",
      "--panel-line": "#273939",
      "--ink": "#E6EFEE",
      "--ink-2": "#A3B6B4",
      "--ink-3": "#758A88",
    },
    light: {
      "--bg": "#F5F8F8",
      "--surface": "#FFFFFF",
      "--surface-2": "#EDF2F2",
      "--border": "#D5DEDE",
      "--border-strong": "#A9B8B8",
      "--fg": "#12201F",
      "--muted": "#485B5A",
      "--brand": "#0B6B63",
      "--brand-hover": "#095750",
      "--brand-soft": "rgba(11, 107, 99, 0.12)",
      "--ai": "#0B6B63",
      "--ai-soft": "rgba(11, 107, 99, 0.1)",
      "--panel": "#FFFFFF",
      "--panel-2": "#EDF2F2",
      "--panel-line": "#D5DEDE",
      "--ink": "#12201F",
      "--ink-2": "#485B5A",
      "--ink-3": "#6E8281",
    },
  },
  "industrial-amber": {
    name: "Industrial Amber (Foundry)",
    dark: {
      "--bg": "#14120E",
      "--surface": "#1C1914",
      "--surface-2": "#262118",
      "--border": "#3B3324",
      "--border-strong": "#61533B",
      "--fg": "#F3EFE6",
      "--muted": "#ABA190",
      "--brand": "#F59E0B",
      "--brand-hover": "#FBBF24",
      "--brand-soft": "rgba(245, 158, 11, 0.16)",
      "--ai": "#F59E0B",
      "--ai-soft": "rgba(245, 158, 11, 0.14)",
      "--panel": "#1C1914",
      "--panel-2": "#262118",
      "--panel-line": "#3B3324",
      "--ink": "#F3EFE6",
      "--ink-2": "#ABA190",
      "--ink-3": "#786E5E",
    },
    light: {
      "--bg": "#FAF7F2",
      "--surface": "#FFFFFF",
      "--surface-2": "#F3ECE1",
      "--border": "#E2D7C5",
      "--border-strong": "#BDB09B",
      "--fg": "#241D12",
      "--muted": "#5C5243",
      "--brand": "#B45309",
      "--brand-hover": "#92400E",
      "--brand-soft": "rgba(180, 83, 9, 0.12)",
      "--ai": "#B45309",
      "--ai-soft": "rgba(180, 83, 9, 0.1)",
      "--panel": "#FFFFFF",
      "--panel-2": "#F3ECE1",
      "--panel-line": "#E2D7C5",
      "--ink": "#241D12",
      "--ink-2": "#5C5243",
      "--ink-3": "#7A6E5D",
    },
  },
  "nordic-blue": {
    name: "Nordic Steel (Technical Blue)",
    dark: {
      "--bg": "#0B111A",
      "--surface": "#111A27",
      "--surface-2": "#172436",
      "--border": "#22374F",
      "--border-strong": "#3D5F85",
      "--fg": "#E2E8F0",
      "--muted": "#94A3B8",
      "--brand": "#38BDF8",
      "--brand-hover": "#7DD3FC",
      "--brand-soft": "rgba(56, 189, 248, 0.15)",
      "--ai": "#38BDF8",
      "--ai-soft": "rgba(56, 189, 248, 0.12)",
      "--panel": "#111A27",
      "--panel-2": "#172436",
      "--panel-line": "#22374F",
      "--ink": "#E2E8F0",
      "--ink-2": "#94A3B8",
      "--ink-3": "#64748B",
    },
    light: {
      "--bg": "#F1F5F9",
      "--surface": "#FFFFFF",
      "--surface-2": "#E2E8F0",
      "--border": "#CBD5E1",
      "--border-strong": "#94A3B8",
      "--fg": "#0F172A",
      "--muted": "#475569",
      "--brand": "#0284C7",
      "--brand-hover": "#0369A1",
      "--brand-soft": "rgba(2, 132, 199, 0.12)",
      "--ai": "#0284C7",
      "--ai-soft": "rgba(2, 132, 199, 0.1)",
      "--panel": "#FFFFFF",
      "--panel-2": "#E2E8F0",
      "--panel-line": "#CBD5E1",
      "--ink": "#0F172A",
      "--ink-2": "#475569",
      "--ink-3": "#64748B",
    },
  },
  "emerald-scada": {
    name: "Emerald SCADA (Plant Control)",
    dark: {
      "--bg": "#08130E",
      "--surface": "#0E1E18",
      "--surface-2": "#152B23",
      "--border": "#1F3F34",
      "--border-strong": "#2D5A4B",
      "--fg": "#ECFDF5",
      "--muted": "#9BB8AD",
      "--brand": "#10B981",
      "--brand-hover": "#34D399",
      "--brand-soft": "rgba(16, 185, 129, 0.15)",
      "--ai": "#10B981",
      "--ai-soft": "rgba(16, 185, 129, 0.12)",
      "--panel": "#0E1E18",
      "--panel-2": "#152B23",
      "--panel-line": "#1F3F34",
      "--ink": "#ECFDF5",
      "--ink-2": "#9BB8AD",
      "--ink-3": "#678A7D",
    },
    light: {
      "--bg": "#F0FDF4",
      "--surface": "#FFFFFF",
      "--surface-2": "#DCFCE7",
      "--border": "#BBF7D0",
      "--border-strong": "#86EFAC",
      "--fg": "#064E3B",
      "--muted": "#047857",
      "--brand": "#059669",
      "--brand-hover": "#047857",
      "--brand-soft": "rgba(5, 150, 105, 0.14)",
      "--ai": "#059669",
      "--ai-soft": "rgba(5, 150, 105, 0.12)",
      "--panel": "#FFFFFF",
      "--panel-2": "#DCFCE7",
      "--panel-line": "#BBF7D0",
      "--ink": "#064E3B",
      "--ink-2": "#047857",
      "--ink-3": "#065F46",
    },
  },
  "high-contrast": {
    name: "High-Contrast Monochrome",
    dark: {
      "--bg": "#000000",
      "--surface": "#0F0F10",
      "--surface-2": "#18181A",
      "--border": "#333336",
      "--border-strong": "#71717A",
      "--fg": "#FFFFFF",
      "--muted": "#A1A1AA",
      "--brand": "#FAFAFA",
      "--brand-hover": "#FFFFFF",
      "--brand-soft": "rgba(255, 255, 255, 0.15)",
      "--ai": "#38BDF8",
      "--ai-soft": "rgba(56, 189, 248, 0.15)",
      "--panel": "#0A0A0C",
      "--panel-2": "#18181A",
      "--panel-line": "#333336",
      "--ink": "#FFFFFF",
      "--ink-2": "#A1A1AA",
      "--ink-3": "#71717A",
    },
    light: {
      "--bg": "#FFFFFF",
      "--surface": "#F4F4F5",
      "--surface-2": "#E4E4E7",
      "--border": "#D4D4D8",
      "--border-strong": "#71717A",
      "--fg": "#09090B",
      "--muted": "#27272A",
      "--brand": "#18181B",
      "--brand-hover": "#09090B",
      "--brand-soft": "rgba(0, 0, 0, 0.1)",
      "--ai": "#0284C7",
      "--ai-soft": "rgba(2, 132, 199, 0.12)",
      "--panel": "#FFFFFF",
      "--panel-2": "#F4F4F5",
      "--panel-line": "#D4D4D8",
      "--ink": "#09090B",
      "--ink-2": "#27272A",
      "--ink-3": "#52525B",
    },
  },
};

const STORAGE_KEY = "mediq-active-palette";
const CUSTOM_STORAGE_KEY = "mediq-custom-palette-tokens";

// Color calculation utilities
export function hexToRgba(hex, alpha) {
  let c = (hex || "#000000").replace("#", "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const num = parseInt(c, 16) || 0;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function adjustHexBrightness(hex, percent) {
  let c = (hex || "#000000").replace("#", "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const num = parseInt(c, 16) || 0;
  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;
  r = Math.min(255, Math.max(0, Math.round(r + (255 * percent) / 100)));
  g = Math.min(255, Math.max(0, Math.round(g + (255 * percent) / 100)));
  b = Math.min(255, Math.max(0, Math.round(b + (255 * percent) / 100)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function createPaletteEngine() {
  let activePreset = "slate-teal";
  let customTokens = {};

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (PRESETS[saved] || saved === "custom")) activePreset = saved;
    const savedCustom = localStorage.getItem(CUSTOM_STORAGE_KEY);
    if (savedCustom) customTokens = JSON.parse(savedCustom);
  } catch {
    /* storage unavailable */
  }

  function getSystemOrExplicitTheme() {
    if (typeof document === "undefined" || !document.documentElement) return "dark";
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "light" || attr === "dark") return attr;
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "dark";
  }

  function applyCurrent() {
    if (typeof document === "undefined" || !document.documentElement) return;
    const theme = getSystemOrExplicitTheme();
    const style = document.documentElement.style;

    if (activePreset === "custom" && Object.keys(customTokens).length > 0) {
      for (const [k, v] of Object.entries(customTokens)) {
        style.setProperty(k, v);
      }
      return;
    }

    const preset = PRESETS[activePreset] || PRESETS["slate-teal"];
    const tokens = preset[theme] || preset.dark;

    for (const [k, v] of Object.entries(tokens)) {
      style.setProperty(k, v);
    }
  }

  function commitCustom() {
    activePreset = "custom";
    try {
      localStorage.setItem(STORAGE_KEY, "custom");
      localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(customTokens));
    } catch {
      /* storage unavailable */
    }
    applyCurrent();
  }

  function setPreset(key) {
    if (PRESETS[key]) {
      activePreset = key;
      customTokens = {};
      try {
        localStorage.setItem(STORAGE_KEY, key);
        localStorage.removeItem(CUSTOM_STORAGE_KEY);
      } catch {
        /* storage unavailable */
      }
      applyCurrent();
    }
  }

  // Granular color level setters
  function setPrimaryColor(hex) {
    customTokens["--brand"] = hex;
    customTokens["--ai"] = hex;
    customTokens["--brand-hover"] = adjustHexBrightness(hex, 10);
    customTokens["--brand-soft"] = hexToRgba(hex, 0.15);
    customTokens["--ai-soft"] = hexToRgba(hex, 0.12);
    commitCustom();
  }

  function setSecondaryColor(hex) {
    const isDark = getSystemOrExplicitTheme() === "dark";
    customTokens["--surface"] = hex;
    customTokens["--panel"] = hex;
    customTokens["--surface-2"] = adjustHexBrightness(hex, isDark ? 8 : -4);
    customTokens["--panel-2"] = adjustHexBrightness(hex, isDark ? 8 : -4);
    customTokens["--hall"] = hex;
    commitCustom();
  }

  function setTertiaryColor(hex) {
    customTokens["--border"] = hex;
    customTokens["--panel-line"] = hex;
    customTokens["--hall-line"] = hex;
    customTokens["--border-strong"] = adjustHexBrightness(hex, 12);
    customTokens["--grid"] = hex;
    customTokens["--aisle"] = hex;
    commitCustom();
  }

  function setBackgroundColor(hex) {
    const isDark = getSystemOrExplicitTheme() === "dark";
    customTokens["--bg"] = hex;
    customTokens["--floor"] = adjustHexBrightness(hex, isDark ? 4 : -3);
    commitCustom();
  }

  function setTextColor(hex) {
    const isDark = getSystemOrExplicitTheme() === "dark";
    customTokens["--fg"] = hex;
    customTokens["--ink"] = hex;
    customTokens["--ink-2"] = adjustHexBrightness(hex, isDark ? -20 : 25);
    customTokens["--ink-3"] = adjustHexBrightness(hex, isDark ? -35 : 40);
    customTokens["--muted"] = adjustHexBrightness(hex, isDark ? -22 : 28);
    commitCustom();
  }

  function setCustomColor(token, value) {
    if (token === "--brand") {
      setPrimaryColor(value);
    } else if (token === "--surface" || token === "--panel") {
      setSecondaryColor(value);
    } else if (token === "--border" || token === "--panel-line") {
      setTertiaryColor(value);
    } else if (token === "--bg" || token === "--floor") {
      setBackgroundColor(value);
    } else if (token === "--ink" || token === "--fg") {
      setTextColor(value);
    } else {
      customTokens[token] = value;
      commitCustom();
    }
  }

  function getCurrentColorValues() {
    const theme = getSystemOrExplicitTheme();
    const preset = PRESETS[activePreset] || PRESETS["slate-teal"];
    const defaults = preset[theme] || preset.dark;

    return {
      primary: customTokens["--brand"] || defaults["--brand"] || "#2CC5B0",
      secondary: customTokens["--surface"] || defaults["--surface"] || "#121D1D",
      tertiary: customTokens["--border"] || defaults["--border"] || "#273939",
      background: customTokens["--bg"] || defaults["--bg"] || "#0B1313",
      text: customTokens["--ink"] || defaults["--ink"] || "#E6EFEE",
    };
  }

  function resetDefault() {
    setPreset("slate-teal");
  }

  // Listen to theme or OS changes to keep tokens in sync
  if (typeof window !== "undefined" && window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      applyCurrent();
    });
  }

  if (typeof MutationObserver !== "undefined" && typeof document !== "undefined" && document.documentElement) {
    const observer = new MutationObserver(() => {
      applyCurrent();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  if (typeof document !== "undefined") {
    applyCurrent();
  }

  return {
    getActivePreset: () => activePreset,
    getPresets: () => PRESETS,
    setPreset,
    setPrimaryColor,
    setSecondaryColor,
    setTertiaryColor,
    setBackgroundColor,
    setTextColor,
    setCustomColor,
    getCurrentColorValues,
    resetDefault,
    applyCurrent,
  };
}

export function mountPaletteUI(container, engine) {
  container.innerHTML = `
    <div class="palette-popover" id="palette-popover" hidden>
      <div class="palette-header">
        <div class="palette-title-box">
          <span class="palette-icon">🎨</span>
          <span class="palette-title">Color Palette Studio</span>
        </div>
        <button type="button" class="palette-close" id="palette-close-btn" aria-label="Close palette studio">×</button>
      </div>
      <p class="palette-desc">Experiment live with primary, secondary, tertiary, background, and text colors.</p>
      
      <!-- Multi-swatch palette strip preview -->
      <div class="palette-preview-strip" id="palette-preview-strip" title="Current live palette preview">
        <div class="palette-preview-item" title="Primary (Brand & AI)">
          <span class="palette-preview-swatch" id="prev-primary"></span>
          <span class="palette-preview-tag">PRI</span>
        </div>
        <div class="palette-preview-item" title="Secondary (Surfaces & Cards)">
          <span class="palette-preview-swatch" id="prev-secondary"></span>
          <span class="palette-preview-tag">SEC</span>
        </div>
        <div class="palette-preview-item" title="Tertiary (Borders & Dividers)">
          <span class="palette-preview-swatch" id="prev-tertiary"></span>
          <span class="palette-preview-tag">TER</span>
        </div>
        <div class="palette-preview-item" title="Background (Floor & Canvas)">
          <span class="palette-preview-swatch" id="prev-background"></span>
          <span class="palette-preview-tag">BG</span>
        </div>
        <div class="palette-preview-item" title="Text Ink (Readability)">
          <span class="palette-preview-swatch" id="prev-text"></span>
          <span class="palette-preview-tag">TXT</span>
        </div>
      </div>

      <div class="palette-section">
        <label class="palette-label">Preset Schemes</label>
        <div class="palette-presets" id="palette-preset-list"></div>
      </div>

      <div class="palette-section">
        <label class="palette-label">Granular Color Levels</label>
        <div class="palette-controls">
          <div class="palette-row">
            <div class="palette-row-info">
              <span class="palette-row-name">Primary (Brand Accent)</span>
              <span class="palette-row-desc">Buttons, Copilot highlight, active tabs</span>
            </div>
            <div class="palette-row-input">
              <input type="color" id="palette-picker-primary" value="#2CC5B0" aria-label="Primary color picker" />
              <span class="palette-hex" id="hex-primary">#2CC5B0</span>
            </div>
          </div>

          <div class="palette-row">
            <div class="palette-row-info">
              <span class="palette-row-name">Secondary (Surfaces)</span>
              <span class="palette-row-desc">Cards, sidebars, header panels</span>
            </div>
            <div class="palette-row-input">
              <input type="color" id="palette-picker-secondary" value="#121D1D" aria-label="Secondary color picker" />
              <span class="palette-hex" id="hex-secondary">#121D1D</span>
            </div>
          </div>

          <div class="palette-row">
            <div class="palette-row-info">
              <span class="palette-row-name">Tertiary (Borders & Dividers)</span>
              <span class="palette-row-desc">Structural lines, table rules, grid</span>
            </div>
            <div class="palette-row-input">
              <input type="color" id="palette-picker-tertiary" value="#273939" aria-label="Tertiary color picker" />
              <span class="palette-hex" id="hex-tertiary">#273939</span>
            </div>
          </div>

          <div class="palette-row">
            <div class="palette-row-info">
              <span class="palette-row-name">Background (Floor & Canvas)</span>
              <span class="palette-row-desc">Plant floor canvas backdrop</span>
            </div>
            <div class="palette-row-input">
              <input type="color" id="palette-picker-background" value="#0B1313" aria-label="Background color picker" />
              <span class="palette-hex" id="hex-background">#0B1313</span>
            </div>
          </div>

          <div class="palette-row">
            <div class="palette-row-info">
              <span class="palette-row-name">Text Ink (Readability)</span>
              <span class="palette-row-desc">Headings, telemetry labels, body text</span>
            </div>
            <div class="palette-row-input">
              <input type="color" id="palette-picker-text" value="#E6EFEE" aria-label="Text color picker" />
              <span class="palette-hex" id="hex-text">#E6EFEE</span>
            </div>
          </div>
        </div>
      </div>

      <div class="palette-footer">
        <button type="button" class="palette-reset-btn" id="palette-reset-btn">Reset to MedIQ Phase 8</button>
      </div>
    </div>
  `;

  const popover = container.querySelector("#palette-popover");
  const closeBtn = container.querySelector("#palette-close-btn");
  const presetList = container.querySelector("#palette-preset-list");
  const resetBtn = container.querySelector("#palette-reset-btn");

  const primaryPicker = container.querySelector("#palette-picker-primary");
  const secondaryPicker = container.querySelector("#palette-picker-secondary");
  const tertiaryPicker = container.querySelector("#palette-picker-tertiary");
  const backgroundPicker = container.querySelector("#palette-picker-background");
  const textPicker = container.querySelector("#palette-picker-text");

  const hexPrimary = container.querySelector("#hex-primary");
  const hexSecondary = container.querySelector("#hex-secondary");
  const hexTertiary = container.querySelector("#hex-tertiary");
  const hexBackground = container.querySelector("#hex-background");
  const hexText = container.querySelector("#hex-text");

  const prevPrimary = container.querySelector("#prev-primary");
  const prevSecondary = container.querySelector("#prev-secondary");
  const prevTertiary = container.querySelector("#prev-tertiary");
  const prevBackground = container.querySelector("#prev-background");
  const prevText = container.querySelector("#prev-text");

  function syncPickersAndPreview() {
    const colors = engine.getCurrentColorValues();

    primaryPicker.value = colors.primary;
    secondaryPicker.value = colors.secondary;
    tertiaryPicker.value = colors.tertiary;
    backgroundPicker.value = colors.background;
    textPicker.value = colors.text;

    hexPrimary.textContent = colors.primary.toUpperCase();
    hexSecondary.textContent = colors.secondary.toUpperCase();
    hexTertiary.textContent = colors.tertiary.toUpperCase();
    hexBackground.textContent = colors.background.toUpperCase();
    hexText.textContent = colors.text.toUpperCase();

    prevPrimary.style.background = colors.primary;
    prevSecondary.style.background = colors.secondary;
    prevTertiary.style.background = colors.tertiary;
    prevBackground.style.background = colors.background;
    prevText.style.background = colors.text;

    renderPresets();
  }

  function renderPresets() {
    presetList.innerHTML = "";
    const active = engine.getActivePreset();
    for (const [key, preset] of Object.entries(engine.getPresets())) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `palette-preset-btn ${active === key ? "is-active" : ""}`;
      btn.innerHTML = `
        <span class="palette-swatch" style="background:${preset.dark["--brand"]}"></span>
        <span class="palette-name">${preset.name}</span>
      `;
      btn.addEventListener("click", () => {
        engine.setPreset(key);
        syncPickersAndPreview();
      });
      presetList.appendChild(btn);
    }
  }

  // Interactive color picker inputs
  primaryPicker.addEventListener("input", (e) => {
    engine.setPrimaryColor(e.target.value);
    syncPickersAndPreview();
  });

  secondaryPicker.addEventListener("input", (e) => {
    engine.setSecondaryColor(e.target.value);
    syncPickersAndPreview();
  });

  tertiaryPicker.addEventListener("input", (e) => {
    engine.setTertiaryColor(e.target.value);
    syncPickersAndPreview();
  });

  backgroundPicker.addEventListener("input", (e) => {
    engine.setBackgroundColor(e.target.value);
    syncPickersAndPreview();
  });

  textPicker.addEventListener("input", (e) => {
    engine.setTextColor(e.target.value);
    syncPickersAndPreview();
  });

  resetBtn.addEventListener("click", () => {
    engine.resetDefault();
    syncPickersAndPreview();
  });

  closeBtn.addEventListener("click", () => {
    popover.hidden = true;
  });

  syncPickersAndPreview();

  return {
    toggle: () => {
      popover.hidden = !popover.hidden;
      if (!popover.hidden) syncPickersAndPreview();
    },
    isOpen: () => !popover.hidden,
    close: () => {
      popover.hidden = true;
    },
    sync: syncPickersAndPreview,
  };
}
