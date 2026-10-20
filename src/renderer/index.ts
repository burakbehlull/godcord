// @ts-nocheck
import { pluginManager } from '../plugins/core/PluginManager';
import { registerBuiltinPlugins } from '../plugins/builtin/index';

(function () {
console.log("[GodCord] ========================================");
console.log("[GodCord] Renderer bundle STARTED - execution confirmed");
console.log("[GodCord] document.readyState =", document.readyState);
console.log("[GodCord] ========================================");

const BTN_ID = "godcord-titlebar-btn";
const STYLE_ID = "godcord-titlebar-css";
const PANEL_ID = "godcord-panel";
const OVERLAY_ID = "godcord-overlay";
const DEBUG_BADGE_ID = "godcord-debug-badge";

let panelOpen = false;
let mountAttempts = 0;
const MAX_MOUNT_ATTEMPTS = 40;
let mountTimer = null;
let currentTab = 'dashboard'; // dashboard, plugins, themes, settings

function ensureCss() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${BTN_ID} {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 32px;
      min-width: 0;
      margin-left: 10px;
      padding: 0 7px;
      flex-shrink: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      color: var(--header-secondary, var(--interactive-normal, #b5bac1));
      font-family: var(--font-primary, "gg sans", "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif);
      font-size: 15px;
      font-weight: 600;
      line-height: 20px;
      letter-spacing: -0.015em;
      cursor: pointer;
      user-select: none;
      -webkit-app-region: no-drag;
      transition: color 120ms ease, opacity 120ms ease, transform 100ms ease;
    }
    #${BTN_ID} .godcord-titlebar-text {
      position: relative;
      display: inline-flex;
      align-items: center;
      min-width: 0;
      white-space: nowrap;
    }
    #${BTN_ID} .godcord-titlebar-text::after {
      content: "";
      position: absolute;
      left: 50%;
      bottom: -4px;
      width: 14px;
      height: 2px;
      border-radius: 999px;
      background: var(--brand-500, #5865f2);
      opacity: 0;
      transform: translateX(-50%) scaleX(0.45);
      transition: opacity 120ms ease, transform 150ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    #${BTN_ID}:hover {
      color: var(--header-primary, var(--interactive-hover, #f2f3f5));
    }
    #${BTN_ID}:hover .godcord-titlebar-text::after,
    #${BTN_ID}:focus-visible .godcord-titlebar-text::after {
      opacity: 0.85;
      transform: translateX(-50%) scaleX(1);
    }
    #${BTN_ID}:active {
      color: var(--interactive-active, #ffffff);
      transform: translateY(1px);
    }
    #${BTN_ID}:focus {
      outline: none;
    }

    #${PANEL_ID} {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 900px;
      max-width: 95vw;
      height: 700px;
      max-height: 90vh;
      background: #2f3136;
      color: #dcddde;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      border: 1px solid #1e1f22;
      z-index: 999999;
      display: none;
      flex-direction: column;
      overflow: hidden;
      pointer-events: auto;
    }
    #${PANEL_ID}.open { 
      display: flex; 
      pointer-events: auto;
    }
    
    /* Header */
    #${PANEL_ID} .panel-header {
      padding: 16px 20px;
      font-weight: 700;
      font-size: 16px;
      background: #202225;
      border-bottom: 1px solid #1e1f22;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #${PANEL_ID} .close-btn {
      background: transparent;
      color: #b5bac1;
      border: none;
      cursor: pointer;
      font-size: 20px;
      line-height: 1;
      padding: 4px 8px;
      transition: color 0.1s;
      pointer-events: auto;
    }
    #${PANEL_ID} .close-btn:hover { color: #fff; }
    
    /* Tab Navigation */
    #${PANEL_ID} .panel-tabs {
      display: flex;
      background: #202225;
      border-bottom: 2px solid #1e1f22;
      padding: 0 20px;
      gap: 5px;
    }
    #${PANEL_ID} .tab-btn {
      padding: 12px 20px;
      background: transparent;
      border: none;
      color: #b5bac1;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      pointer-events: auto;
    }
    #${PANEL_ID} .tab-btn:hover {
      color: #dcddde;
      background: rgba(79, 84, 92, 0.3);
    }
    #${PANEL_ID} .tab-btn.active {
      color: #fff;
      border-bottom-color: #5865f2;
      background: rgba(88, 101, 242, 0.1);
    }
    
    /* Tab Content */
    #${PANEL_ID} .panel-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      pointer-events: auto;
    }
    #${PANEL_ID} .tab-content {
      display: none;
      pointer-events: auto;
    }
    #${PANEL_ID} .tab-content.active {
      display: block;
      pointer-events: auto;
    }
    
    /* Plugin Cards */
    .plugin-card {
      background: #202225;
      border: 1px solid #1e1f22;
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 12px;
      display: flex;
      align-items: flex-start;
      gap: 15px;
      transition: all 0.15s ease;
    }
    .plugin-card:hover {
      background: #292b2f;
      border-color: #3f4147;
    }
    .plugin-icon {
      font-size: 32px;
      min-width: 40px;
      text-align: center;
    }
    .plugin-info {
      flex: 1;
      min-width: 0;
    }
    .plugin-name {
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      margin: 0 0 4px 0;
    }
    .plugin-desc {
      font-size: 13px;
      color: #b5bac1;
      margin: 0 0 8px 0;
    }
    .plugin-meta {
      display: flex;
      gap: 12px;
      font-size: 12px;
      color: #72767d;
    }
    .plugin-meta span {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .plugin-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .plugin-badge.builtin {
      background: rgba(88, 101, 242, 0.2);
      color: #5865f2;
    }
    .plugin-badge.external {
      background: rgba(67, 181, 129, 0.2);
      color: #43b581;
    }
    .plugin-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .plugin-toggle {
      position: relative;
      width: 44px;
      height: 24px;
      background: #72767d;
      border-radius: 12px;
      cursor: pointer;
      transition: background 0.2s;
      pointer-events: auto;
    }
    .plugin-toggle.enabled {
      background: #3ba55c;
    }
    .plugin-toggle::after {
      content: '';
      position: absolute;
      top: 3px;
      left: 3px;
      width: 18px;
      height: 18px;
      background: #fff;
      border-radius: 50%;
      transition: transform 0.2s;
      pointer-events: none;
    }
    .plugin-toggle.enabled::after {
      transform: translateX(20px);
    }
    .action-btn {
      padding: 6px 12px;
      background: #4f545c;
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: background 0.15s;
      pointer-events: auto;
    }
    .action-btn:hover {
      background: #5d6269;
    }
    .action-btn.danger {
      background: #ed4245;
    }
    .action-btn.danger:hover {
      background: #c03537;
    }
    .action-btn.primary {
      background: #5865f2;
    }
    .action-btn.primary:hover {
      background: #4752c4;
    }
    
    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #72767d;
    }
    .empty-state-icon {
      font-size: 64px;
      margin-bottom: 16px;
      opacity: 0.5;
    }
    .empty-state-text {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .empty-state-hint {
      font-size: 14px;
      color: #4f545c;
    }
    
    /* Drop Zone */
    .drop-zone {
      border: 2px dashed #4f545c;
      border-radius: 8px;
      padding: 40px;
      text-align: center;
      margin-bottom: 20px;
      transition: all 0.2s;
      cursor: pointer;
    }
    .drop-zone:hover,
    .drop-zone.drag-over {
      border-color: #5865f2;
      background: rgba(88, 101, 242, 0.1);
    }
    .drop-zone-icon {
      font-size: 48px;
      margin-bottom: 12px;
    }
    .drop-zone-text {
      font-size: 14px;
      color: #b5bac1;
    }
    
    /* Stats */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: #202225;
      border: 1px solid #1e1f22;
      border-radius: 6px;
      padding: 16px;
    }
    .stat-label {
      font-size: 12px;
      color: #72767d;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #fff;
    }
    
    /* Status indicators */
    .status-ok { color: #3ba55c; font-weight: 700; }
    .status-fail { color: #ed4245; font-weight: 700; }

    #${OVERLAY_ID} {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.85);
      z-index: 999998;
      display: none;
      pointer-events: auto;
    }
    #${OVERLAY_ID}.open { 
      display: block; 
      pointer-events: auto;
    }

    #${DEBUG_BADGE_ID} {
      position: fixed !important;
      right: 12px !important;
      bottom: 12px !important;
      z-index: 999997 !important;
      padding: 6px 12px !important;
      border-radius: 999px !important;
      background: linear-gradient(135deg, #3ba55c, #1e9e57) !important;
      color: #fff !important;
      font-family: var(--font-primary, "gg sans", "Segoe UI", Arial) !important;
      font-size: 12px !important;
      font-weight: 700 !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.5) !important;
      user-select: none !important;
      -webkit-user-select: none !important;
      cursor: pointer !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      animation: godcord-pulse 2s ease-in-out infinite !important;
      opacity: 0.95 !important;
    }
    #${DEBUG_BADGE_ID}:hover {
      opacity: 1 !important;
      transform: scale(1.05) !important;
      transition: transform 120ms ease !important;
    }
    #${DEBUG_BADGE_ID} .dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #fff;
      box-shadow: 0 0 0 0 rgba(255,255,255,0.7);
      animation: godcord-dot 1.5s ease-out infinite;
    }
    @keyframes godcord-pulse {
      0%, 100% { box-shadow: 0 2px 8px rgba(0,0,0,0.5), 0 0 0 0 rgba(59,165,92,0.5); }
      50%      { box-shadow: 0 2px 8px rgba(0,0,0,0.5), 0 0 0 8px rgba(59,165,92,0); }
    }
    @keyframes godcord-dot {
      0%   { box-shadow: 0 0 0 0 rgba(255,255,255,0.7); }
      70%  { box-shadow: 0 0 0 10px rgba(255,255,255,0); }
      100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
    }
  `;
  document.documentElement.appendChild(style);
  console.log("[GodCord] ✅ CSS injected into DOM");
}

function createTitlebarButton() {
  if (document.getElementById(BTN_ID)) {
    console.log("[GodCord] Button already exists, returning existing element");
    return document.getElementById(BTN_ID);
  }
  console.log("[GodCord] Creating new titlebar button...");
  const btn = document.createElement("button");
  btn.id = BTN_ID;
  btn.type = "button";
  btn.setAttribute("aria-label", "Open GodCord Panel");
  btn.innerHTML = `<span class="godcord-titlebar-text">GodCord</span>`;
  
  // Tıklama event'ini direkt burada ekle
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("[GodCord] ========================================");
    console.log("[GodCord] Titlebar button CLICKED!");
    console.log("[GodCord] Current panelOpen state:", panelOpen);
    console.log("[GodCord] ========================================");
    togglePanel();
  }, { capture: true });
  
  // Hover efekti için
  btn.addEventListener("mouseenter", () => {
    console.log("[GodCord] Button hover detected");
  });
  
  console.log("[GodCord] ✅ Button created with click listener attached");
  return btn;
}

function findBackButton() {
  const NAMES = [
    "Go back", "Geri dön", "Geri", "Zurück", "Retour",
    "Atrás", "Indietro", "Voltar", "Назад", "戻る", "返回",
  ];
  for (const name of NAMES) {
    try {
      const found = document.querySelector(`[aria-label="${name.replace(/"/g, '\\"')}"]`);
      if (found) {
        console.log(`[GodCord] 🔎 Found back button via aria-label="${name}"`);
        return found;
      }
    } catch (_) { /* ignore */ }
  }

  let el = document.querySelector("div[class*='toolbar']");
  if (!el) el = document.querySelector("[class*='header'] [class*='toolbar']");
  if (!el) el = document.querySelector("[class*='chatContent'] [class*='toolbar']");
  if (!el) el = document.querySelector("nav[class*='sidebar'] + div [class*='toolbar']");
  if (el) {
    console.log(`[GodCord] 🔎 Found fallback toolbar container via class`);
    return el.children && el.children[el.children.length - 1] || el;
  }
  return null;
}

function mountTitlebarButtonInto(anchor) {
  if (!anchor) return false;
  if (document.getElementById(BTN_ID)) return true;
  const btn = createTitlebarButton();
  try {
    const parent = anchor.parentElement;
    if (!parent) return false;
    const siblings = Array.from(parent.children);
    const idx = siblings.indexOf(anchor);
    if (idx >= 0 && idx + 1 < siblings.length) {
      parent.insertBefore(btn, siblings[idx + 1]);
    } else {
      parent.appendChild(btn);
    }
    console.log("[GodCord] ✅ Titlebar button MOUNTED next to back button");
    return true;
  } catch (err) {
    console.warn("[GodCord] Failed to insert near anchor:", err);
    return false;
  }
}

function mountIntoHeader() {
  if (document.getElementById(BTN_ID)) return true;
  const candidates = [
    "[class*='toolbar-']",
    "[class*='header-'] [class*='toolbar']",
    "[class*='chat-headerBar']",
    "[class*='headerBar']",
    "[class*='chatContent'] [class*='toolbar']",
    "section[class*='title']",
    "h2",
  ];
  for (const sel of candidates) {
    const host = document.querySelector(sel);
    if (host) {
      console.log(`[GodCord] 🔎 Trying fallback mount on selector: ${sel}`);
      const btn = createTitlebarButton();
      try {
        if (host instanceof HTMLElement) {
          host.appendChild(btn);
          console.log(`[GodCord] ✅ Titlebar button MOUNTED via fallback selector: ${sel}`);
          return true;
        }
      } catch (_) { /* ignore and try next */ }
    }
  }
  return false;
}

function ensureDebugBadge() {
  if (document.getElementById(DEBUG_BADGE_ID)) {
    console.log("[GodCord] ℹ️ Debug badge already present");
    return;
  }
  const badge = document.createElement("div");
  badge.id = DEBUG_BADGE_ID;
  badge.title = "GodCord is active! Click to open panel. Ctrl+Shift+G also works.";
  badge.innerHTML = `<span class="dot"></span><span>GodCord v0.1 ✓</span>`;
  badge.addEventListener("click", togglePanel);
  try {
    document.body.appendChild(badge);
    console.log("[GodCord] ✅ DEBUG BADGE mounted to body (bottom-right, GREEN) - GODCORD IS WORKING");
  } catch (err) {
    console.warn("[GodCord] body not ready, retrying badge mount:", err && err.message);
    setTimeout(ensureDebugBadge, 300);
  }
}

function buildPanelHTML() {
  const plugins = pluginManager.getAllPlugins();
  const enabled = plugins.filter(p => p.enabled).length;
  const builtin = plugins.filter(p => p.manifest.type === 'builtin').length;
  const external = plugins.filter(p => p.manifest.type === 'external').length;
  
  return `
    <div class="panel-header">
      <span>🎮 GodCord v0.1</span>
      <button class="close-btn" id="${PANEL_ID}-close" aria-label="Close">×</button>
    </div>
    
    <div class="panel-tabs">
      <button class="tab-btn ${currentTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">
        <span>📊</span> Dashboard
      </button>
      <button class="tab-btn ${currentTab === 'plugins' ? 'active' : ''}" data-tab="plugins">
        <span>🧩</span> Plugins
      </button>
      <button class="tab-btn ${currentTab === 'themes' ? 'active' : ''}" data-tab="themes">
        <span>🎨</span> Themes
      </button>
      <button class="tab-btn ${currentTab === 'settings' ? 'active' : ''}" data-tab="settings">
        <span>⚙️</span> Settings
      </button>
    </div>
    
    <div class="panel-body">
      <!-- Dashboard Tab -->
      <div class="tab-content ${currentTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total Plugins</div>
            <div class="stat-value">${plugins.length}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Enabled</div>
            <div class="stat-value" style="color: #3ba55c;">${enabled}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Builtin</div>
            <div class="stat-value" style="color: #5865f2;">${builtin}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">External</div>
            <div class="stat-value" style="color: #43b581;">${external}</div>
          </div>
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin: 20px 0 10px 0;">
          <h3 style="margin: 0; font-size: 14px; color: #b5bac1; text-transform: uppercase;">
            System Info
          </h3>
        </div>
        <div style="background: #202225; border-radius: 6px; padding: 16px; font-size: 13px;">
          <div style="padding: 8px 0; border-bottom: 1px solid #3f4147;">
            <strong>Status:</strong> <span class="status-ok">✓ Active</span>
          </div>
          <div style="padding: 8px 0; border-bottom: 1px solid #3f4147;">
            <strong>URL:</strong> <code style="color: #72767d;">${location.hostname}</code>
          </div>
          <div style="padding: 8px 0;">
            <strong>Shortcut:</strong> <code>Ctrl+Shift+G</code>
          </div>
        </div>
      </div>
      
      <!-- Plugins Tab -->
      <div class="tab-content ${currentTab === 'plugins' ? 'active' : ''}" data-tab="plugins">
        ${buildPluginsTab()}
      </div>
      
      <!-- Themes Tab -->
      <div class="tab-content ${currentTab === 'themes' ? 'active' : ''}" data-tab="themes">
        <div class="empty-state">
          <div class="empty-state-icon">🎨</div>
          <div class="empty-state-text">Themes Coming Soon</div>
          <div class="empty-state-hint">Theme support will be added in a future update</div>
        </div>
      </div>
      
      <!-- Settings Tab -->
      <div class="tab-content ${currentTab === 'settings' ? 'active' : ''}" data-tab="settings">
        <div style="background: #202225; border-radius: 6px; padding: 20px;">
          <h3 style="margin: 0 0 15px 0;">⚙️ GodCord Settings</h3>
          <p style="color: #b5bac1; font-size: 14px;">
            Settings panel coming soon. You can configure plugins from the Plugins tab.
          </p>
        </div>
      </div>
    </div>
  `;
}

function buildPluginsTab() {
  const plugins = pluginManager.getAllPlugins();
  
  if (plugins.length === 0) {
    return `
      <div class="drop-zone" id="plugin-drop-zone">
        <div class="drop-zone-icon">📦</div>
        <div class="drop-zone-text">
          <strong>Drop plugin files here or click to browse</strong><br>
          <small>Supports .js, .ts, .tsx files or plugin folders</small>
        </div>
      </div>
      <div class="empty-state">
        <div class="empty-state-icon">🧩</div>
        <div class="empty-state-text">No plugins installed</div>
        <div class="empty-state-hint">Add plugins to get started</div>
      </div>
    `;
  }
  
  let html = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
      <h3 style="margin: 0; font-size: 14px; color: #b5bac1; text-transform: uppercase;">
        Installed Plugins (${plugins.length})
      </h3>
      <button class="action-btn primary" id="add-plugin-btn">+ Add Plugin</button>
    </div>
  `;
  
  for (const plugin of plugins) {
    const icon = plugin.manifest.icon || '🧩';
    const typeClass = plugin.manifest.type || 'external';
    const typeName = plugin.manifest.type === 'builtin' ? 'Built-in' : 'External';
    const enabled = plugin.enabled;
    
    html += `
      <div class="plugin-card" data-plugin-id="${plugin.id}">
        <div class="plugin-icon">${icon}</div>
        <div class="plugin-info">
          <div class="plugin-name">${plugin.manifest.name}</div>
          <div class="plugin-desc">${plugin.manifest.description}</div>
          <div class="plugin-meta">
            <span class="plugin-badge ${typeClass}">${typeName}</span>
            <span>v${plugin.manifest.version}</span>
            <span>by ${plugin.manifest.author}</span>
          </div>
        </div>
        <div class="plugin-actions">
          <div class="plugin-toggle ${enabled ? 'enabled' : ''}" 
               data-plugin-id="${plugin.id}" 
               title="${enabled ? 'Disable' : 'Enable'}">
          </div>
          ${plugin.manifest.settings ? `
            <button class="action-btn" data-action="settings" data-plugin-id="${plugin.id}">
              Settings
            </button>
          ` : ''}
          ${plugin.manifest.type === 'external' ? `
            <button class="action-btn danger" data-action="delete" data-plugin-id="${plugin.id}">
              Delete
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  return html;
}

function ensurePanel() {
  console.log("[GodCord] ensurePanel() called");
  let panel = document.getElementById(PANEL_ID);
  let overlay = document.getElementById(OVERLAY_ID);
  
  if (!overlay) {
    console.log("[GodCord] Creating overlay element...");
    overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.addEventListener("click", (e) => {
      e.stopPropagation();
      console.log("[GodCord] Overlay clicked - closing panel");
      setPanelOpen(false);
    });
    document.body.appendChild(overlay);
    console.log("[GodCord] ✅ Overlay created and appended to body");
  }
  
  if (!panel) {
    console.log("[GodCord] Creating panel element...");
    panel = document.createElement("div");
    panel.id = PANEL_ID;
    document.body.appendChild(panel);
    console.log("[GodCord] ✅ Panel created and appended to body");
    // Panel içindeki tıklamaların overlay'e ulaşmasını engelle
    panel.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }
  
  console.log("[GodCord] Building panel HTML...");
  panel.innerHTML = buildPanelHTML();
  console.log("[GodCord] ✅ Panel HTML built");
  
  // Attach event listeners
  console.log("[GodCord] Attaching panel event listeners...");
  attachPanelEventListeners(panel);
  
  return panel;
}

function attachPanelEventListeners(panel) {
  console.log('[GodCord] Attaching panel event listeners...');
  
  // Close button
  const closeBtn = document.getElementById(`${PANEL_ID}-close`);
  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      console.log('[GodCord] Close button clicked');
      setPanelOpen(false);
    });
    console.log('[GodCord] ✓ Close button listener attached');
  }
  
  // Tab buttons
  const tabBtns = panel.querySelectorAll('.tab-btn');
  console.log(`[GodCord] Found ${tabBtns.length} tab buttons`);
  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tab = btn.getAttribute('data-tab');
      console.log(`[GodCord] Tab clicked: ${tab}`);
      switchTab(tab);
    });
  });
  
  // Plugin toggles
  const toggles = panel.querySelectorAll('.plugin-toggle');
  console.log(`[GodCord] Found ${toggles.length} plugin toggles`);
  toggles.forEach(toggle => {
    toggle.addEventListener('click', async (e) => {
      e.stopPropagation();
      const pluginId = toggle.getAttribute('data-plugin-id');
      console.log(`[GodCord] Toggle clicked: ${pluginId}`);
      try {
        await pluginManager.togglePlugin(pluginId);
        refreshPanel();
      } catch (err) {
        console.error('[GodCord] Toggle error:', err);
        alert(`Failed to toggle plugin: ${err.message}`);
      }
    });
  });
  
  // Action buttons
  const actionBtns = panel.querySelectorAll('[data-action]');
  console.log(`[GodCord] Found ${actionBtns.length} action buttons`);
  actionBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.getAttribute('data-action');
      const pluginId = btn.getAttribute('data-plugin-id');
      console.log(`[GodCord] Action button clicked: ${action} for ${pluginId}`);
      handlePluginAction(action, pluginId);
    });
  });
  
  // Add plugin button
  const addBtn = panel.querySelector('#add-plugin-btn');
  if (addBtn) {
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('[GodCord] Add plugin button clicked');
      alert('Plugin yükleme özelliği yakında eklenecek!\n\nŞimdilik pluginler otomatik olarak %APPDATA%/godcord/plugins/ klasöründen yüklenir.');
    });
    console.log('[GodCord] ✓ Add plugin button listener attached');
  }
  
  console.log('[GodCord] ✓ All event listeners attached');
}

function switchTab(tabName) {
  currentTab = tabName;
  refreshPanel();
}

function refreshPanel() {
  const panel = document.getElementById(PANEL_ID);
  if (panel) {
    panel.innerHTML = buildPanelHTML();
    attachPanelEventListeners(panel);
  }
}

async function handlePluginAction(action, pluginId) {
  const plugin = pluginManager.getPlugin(pluginId);
  if (!plugin) return;
  
  switch (action) {
    case 'settings':
      showPluginSettings(plugin);
      break;
    case 'delete':
      if (confirm(`"${plugin.manifest.name}" pluginini silmek istediğinizden emin misiniz?`)) {
        pluginManager.unregisterPlugin(pluginId);
        refreshPanel();
      }
      break;
  }
}

function showPluginSettings(plugin) {
  // Create a modal for plugin settings
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 500px;
    max-width: 90vw;
    background: #2f3136;
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.8);
    z-index: 10000000;
    padding: 20px;
    color: #dcddde;
    pointer-events: auto;
  `;
  
  // Stop propagation on modal
  modal.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  let html = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2 style="margin: 0; font-size: 18px;">⚙️ ${plugin.manifest.name} Settings</h2>
      <button id="close-settings-modal" style="background: transparent; border: none; color: #b5bac1; cursor: pointer; font-size: 24px; pointer-events: auto;">×</button>
    </div>
  `;
  
  if (plugin.manifest.components && plugin.manifest.components.settings) {
    // Use custom settings component
    if (typeof plugin.manifest.components.settings === 'function') {
      const settingsEl = plugin.manifest.components.settings();
      modal.appendChild(settingsEl);
    }
  } else if (plugin.manifest.settings) {
    // Generate settings UI from schema
    html += '<div>';
    for (const [key, setting] of Object.entries(plugin.manifest.settings)) {
      const currentValue = pluginManager.getPluginSettings(plugin.id)[key] ?? setting.default;
      
      html += `
        <div style="margin-bottom: 20px;">
          <label style="display: block; font-weight: 600; margin-bottom: 8px;">
            ${setting.label}
          </label>
          ${setting.description ? `<div style="font-size: 12px; color: #72767d; margin-bottom: 8px;">${setting.description}</div>` : ''}
      `;
      
      if (setting.type === 'boolean') {
        html += `
          <div class="plugin-toggle ${currentValue ? 'enabled' : ''}" 
               data-setting-key="${key}" 
               style="cursor: pointer;">
          </div>
        `;
      } else if (setting.type === 'select') {
        html += `<select data-setting-key="${key}" style="width: 100%; padding: 8px; background: #202225; border: 1px solid #1e1f22; color: #dcddde; border-radius: 4px;">`;
        for (const opt of setting.options) {
          html += `<option value="${opt.value}" ${currentValue === opt.value ? 'selected' : ''}>${opt.label}</option>`;
        }
        html += `</select>`;
      } else if (setting.type === 'number') {
        html += `<input type="number" data-setting-key="${key}" value="${currentValue}" style="width: 100%; padding: 8px; background: #202225; border: 1px solid #1e1f22; color: #dcddde; border-radius: 4px;">`;
      } else if (setting.type === 'color') {
        html += `<input type="color" data-setting-key="${key}" value="${currentValue}" style="width: 100%; height: 40px; background: #202225; border: 1px solid #1e1f22; border-radius: 4px;">`;
      } else {
        html += `<input type="text" data-setting-key="${key}" value="${currentValue}" style="width: 100%; padding: 8px; background: #202225; border: 1px solid #1e1f22; color: #dcddde; border-radius: 4px;">`;
      }
      
      html += '</div>';
    }
    html += '</div>';
  } else {
    html += '<p style="color: #72767d;">Bu plugin için ayar bulunmuyor.</p>';
  }
  
  modal.innerHTML = html;
  document.body.appendChild(modal);
  
  // Close button
  const closeModalBtn = modal.querySelector('#close-settings-modal');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('[GodCord] Closing settings modal');
      modal.remove();
    });
  }
  
  // Setting controls
  modal.querySelectorAll('[data-setting-key]').forEach(el => {
    el.addEventListener('change', (e) => {
      e.stopPropagation();
      const key = el.getAttribute('data-setting-key');
      let value;
      if (el.type === 'checkbox' || el.classList.contains('plugin-toggle')) {
        value = el.classList ? el.classList.contains('enabled') : e.target.checked;
      } else if (el.type === 'number') {
        value = parseFloat(e.target.value);
      } else {
        value = e.target.value;
      }
      console.log(`[GodCord] Setting changed: ${plugin.id}.${key} = ${value}`);
      pluginManager.setPluginSetting(plugin.id, key, value);
    });
    
    // Toggle specific
    if (el.classList.contains('plugin-toggle')) {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        el.classList.toggle('enabled');
        const key = el.getAttribute('data-setting-key');
        const value = el.classList.contains('enabled');
        console.log(`[GodCord] Toggle changed: ${plugin.id}.${key} = ${value}`);
        pluginManager.setPluginSetting(plugin.id, key, value);
      });
    }
  });
}

function setPanelOpen(open) {
  console.log("[GodCord] ========================================");
  console.log("[GodCord] setPanelOpen() called with:", open);
  panelOpen = open;
  console.log("[GodCord] panelOpen state updated to:", panelOpen);
  
  const panel = ensurePanel();
  const overlay = document.getElementById(OVERLAY_ID);
  
  console.log("[GodCord] Panel element:", panel ? "EXISTS" : "NULL");
  console.log("[GodCord] Overlay element:", overlay ? "EXISTS" : "NULL");
  
  if (!panel || !overlay) {
    console.error("[GodCord] ❌ Panel or overlay missing! Cannot toggle.");
    console.log("[GodCord] ========================================");
    return;
  }
  
  if (open) {
    console.log("[GodCord] Adding 'open' class to panel and overlay");
    panel.classList.add("open");
    overlay.classList.add("open");
    console.log("[GodCord] Panel classes:", Array.from(panel.classList).join(', '));
    console.log("[GodCord] Panel display style:", window.getComputedStyle(panel).display);
  } else {
    console.log("[GodCord] Removing 'open' class from panel and overlay");
    panel.classList.remove("open");
    overlay.classList.remove("open");
  }
  console.log("[GodCord] ========================================");
}

function togglePanel() {
  console.log("[GodCord] ========================================");
  console.log("[GodCord] togglePanel() called");
  console.log("[GodCord] Current state: panelOpen =", panelOpen);
  console.log("[GodCord] Will set to:", !panelOpen);
  console.log("[GodCord] ========================================");
  setPanelOpen(!panelOpen);
}

function tryMountTitlebar() {
  if (document.getElementById(BTN_ID)) {
    if (mountTimer) { clearInterval(mountTimer); mountTimer = null; }
    return true;
  }
  mountAttempts++;
  const anchor = findBackButton();
  if (anchor && mountTitlebarButtonInto(anchor)) {
    if (mountTimer) { clearInterval(mountTimer); mountTimer = null; }
    return true;
  }
  if (mountIntoHeader()) {
    if (mountTimer) { clearInterval(mountTimer); mountTimer = null; }
    return true;
  }
  if (mountAttempts % 5 === 0) {
    console.log(
      `[GodCord] ℹ️ Titlebar mount attempt ${mountAttempts}/${MAX_MOUNT_ATTEMPTS}... ` +
      `(debug badge is already working)`,
    );
  }
  if (mountAttempts >= MAX_MOUNT_ATTEMPTS) {
    if (mountTimer) { clearInterval(mountTimer); mountTimer = null; }
    console.warn(
      "[GodCord] ⚠️ Could not mount titlebar button after " + MAX_MOUNT_ATTEMPTS +
      " attempts. Use Ctrl+Shift+G or click the GREEN badge at bottom-right.",
    );
  }
  return false;
}

function installKeyboardShortcut() {
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === "G" || e.key === "g")) {
      e.preventDefault();
      console.log("[GodCord] ⌨️ Ctrl+Shift+G pressed - toggling panel");
      togglePanel();
    }
    if (e.key === "Escape" && panelOpen) {
      setPanelOpen(false);
    }
  });
  console.log("[GodCord] ⌨️ Keyboard shortcut Ctrl+Shift+G installed");
}

function installMutationObserver() {
  try {
    const mo = new MutationObserver(() => {
      if (!mountTimer && !document.getElementById(BTN_ID)) {
        if (!tryMountTitlebar()) {
          mountTimer = setInterval(tryMountTitlebar, 500);
        }
      }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    console.log("[GodCord] 👁️ MutationObserver installed for auto-mount");
  } catch (err) {
    console.warn("[GodCord] MutationObserver setup failed:", err);
  }
}

function boot() {
  console.log("[GodCord] 🚀 Boot sequence starting...");
  
  // Initialize plugin system
  console.log("[GodCord] 📦 Initializing plugin system...");
  registerBuiltinPlugins();
  
  // Auto-enable plugins that were previously enabled
  const plugins = pluginManager.getAllPlugins();
  for (const plugin of plugins) {
    const state = pluginManager.getPluginSettings(plugin.id);
    if (pluginManager.state[plugin.id]?.enabled) {
      pluginManager.enablePlugin(plugin.id).catch(err => {
        console.error(`[GodCord] Failed to auto-enable plugin ${plugin.id}:`, err);
      });
    }
  }
  
  ensureCss();
  // ensureDebugBadge(); // KALDIRILDI - Yeşil rozet artık yok
  installKeyboardShortcut();
  tryMountTitlebar();
  mountTimer = setInterval(tryMountTitlebar, 500);
  installMutationObserver();
  
  // Listen to plugin events for UI updates
  pluginManager.on('plugin-enabled', () => refreshPanel());
  pluginManager.on('plugin-disabled', () => refreshPanel());
  
  setTimeout(() => {
    if (!document.getElementById(BTN_ID)) {
      console.log(
        "[GodCord] ℹ️ Titlebar not mounted yet, but Ctrl+Shift+G is available.",
      );
    }
  }, 10000);
  console.log("[GodCord] ✅ Renderer ready! Press Ctrl+Shift+G to open panel");
}

if (document.readyState === "complete" || document.readyState === "interactive") {
  boot();
} else {
  console.log("[GodCord] ⏳ Waiting for DOMContentLoaded...");
  document.addEventListener("DOMContentLoaded", boot, { once: true });
}

window.GodCord = (window.GodCord || {});
window.GodCord.version = "0.1.0";
window.GodCord.togglePanel = togglePanel;
window.GodCord.openPanel = () => setPanelOpen(true);
window.GodCord.closePanel = () => setPanelOpen(false);
window.GodCord.reload = () => location.reload();
})();
