// @ts-nocheck
import { Plugin, PluginManifest, PluginState } from './types';

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private state: PluginState = {};
  private watchers: Map<string, any> = new Map();
  
  constructor() {
    this.loadState();
  }
  
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  
  private loadState() {
    try {
      const saved = localStorage.getItem('godcord_plugin_state');
      if (saved) {
        this.state = JSON.parse(saved);
      }
    } catch (err) {
      console.error('[PluginManager] Failed to load state:', err);
    }
  }
  
  private saveState() {
    try {
      localStorage.setItem('godcord_plugin_state', JSON.stringify(this.state));
    } catch (err) {
      console.error('[PluginManager] Failed to save state:', err);
    }
  }
  
  // ============================================
  // PLUGIN REGISTRATION
  // ============================================
  
  registerPlugin(id: string, manifest: PluginManifest, module: any, path: string) {
    if (this.plugins.has(id)) {
      console.warn(`[PluginManager] Plugin already registered: ${id}`);
      return false;
    }
    
    const plugin: Plugin = {
      id,
      manifest,
      module,
      enabled: false,
      path,
    };
    
    this.plugins.set(id, plugin);
    
    // Initialize state if not exists
    if (!this.state[id]) {
      this.state[id] = {
        enabled: false,
        settings: this.getDefaultSettings(manifest),
      };
    }
    
    console.log(`[PluginManager] ✅ Registered plugin: ${id}`);
    return true;
  }
  
  unregisterPlugin(id: string) {
    const plugin = this.plugins.get(id);
    if (!plugin) return false;
    
    if (plugin.enabled) {
      this.disablePlugin(id);
    }
    
    this.plugins.delete(id);
    delete this.state[id];
    this.saveState();
    
    console.log(`[PluginManager] ❌ Unregistered plugin: ${id}`);
    return true;
  }
  
  // ============================================
  // PLUGIN LIFECYCLE
  // ============================================
  
  async enablePlugin(id: string) {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new Error(`Plugin not found: ${id}`);
    }
    
    if (plugin.enabled) {
      console.warn(`[PluginManager] Plugin already enabled: ${id}`);
      return false;
    }
    
    try {
      // Check dependencies
      if (plugin.manifest.dependencies) {
        for (const depId of plugin.manifest.dependencies) {
          const dep = this.plugins.get(depId);
          if (!dep) {
            throw new Error(`Missing dependency: ${depId}`);
          }
          if (!dep.enabled) {
            await this.enablePlugin(depId);
          }
        }
      }
      
      // Call onLoad if not loaded yet
      if (plugin.module.onLoad && !plugin.module._loaded) {
        await plugin.module.onLoad();
        plugin.module._loaded = true;
      }
      
      // Call onEnable
      if (plugin.module.onEnable) {
        await plugin.module.onEnable();
      }
      
      plugin.enabled = true;
      this.state[id].enabled = true;
      this.saveState();
      
      this.dispatchEvent('plugin-enabled', { id, plugin });
      console.log(`[PluginManager] ✅ Enabled plugin: ${id}`);
      
      return true;
    } catch (err) {
      plugin.error = err.message;
      console.error(`[PluginManager] Failed to enable plugin: ${id}`, err);
      throw err;
    }
  }
  
  async disablePlugin(id: string) {
    const plugin = this.plugins.get(id);
    if (!plugin || !plugin.enabled) return false;
    
    try {
      // Call onDisable
      if (plugin.module.onDisable) {
        await plugin.module.onDisable();
      }
      
      plugin.enabled = false;
      this.state[id].enabled = false;
      this.saveState();
      
      this.dispatchEvent('plugin-disabled', { id, plugin });
      console.log(`[PluginManager] ⏸️ Disabled plugin: ${id}`);
      
      return true;
    } catch (err) {
      console.error(`[PluginManager] Failed to disable plugin: ${id}`, err);
      throw err;
    }
  }
  
  async togglePlugin(id: string) {
    const plugin = this.plugins.get(id);
    if (!plugin) return false;
    
    if (plugin.enabled) {
      return await this.disablePlugin(id);
    } else {
      return await this.enablePlugin(id);
    }
  }
  
  // ============================================
  // PLUGIN QUERIES
  // ============================================
  
  getPlugin(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }
  
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }
  
  getEnabledPlugins(): Plugin[] {
    return this.getAllPlugins().filter(p => p.enabled);
  }
  
  getBuiltinPlugins(): Plugin[] {
    return this.getAllPlugins().filter(p => p.manifest.type === 'builtin');
  }
  
  getExternalPlugins(): Plugin[] {
    return this.getAllPlugins().filter(p => p.manifest.type === 'external');
  }
  
  // ============================================
  // SETTINGS
  // ============================================
  
  getDefaultSettings(manifest: PluginManifest): Record<string, any> {
    const defaults: Record<string, any> = {};
    if (manifest.settings) {
      for (const [key, setting] of Object.entries(manifest.settings)) {
        defaults[key] = setting.default;
      }
    }
    return defaults;
  }
  
  getPluginSettings(id: string): Record<string, any> {
    return this.state[id]?.settings || {};
  }
  
  setPluginSetting(id: string, key: string, value: any) {
    if (!this.state[id]) {
      this.state[id] = { enabled: false, settings: {} };
    }
    this.state[id].settings[key] = value;
    this.saveState();
    
    this.dispatchEvent('plugin-setting-changed', { id, key, value });
  }
  
  // ============================================
  // EVENTS
  // ============================================
  
  private dispatchEvent(eventName: string, detail: any) {
    window.dispatchEvent(new CustomEvent(`godcord:${eventName}`, { detail }));
  }
  
  on(eventName: string, handler: (e: CustomEvent) => void) {
    window.addEventListener(`godcord:${eventName}`, handler as EventListener);
  }
  
  off(eventName: string, handler: (e: CustomEvent) => void) {
    window.removeEventListener(`godcord:${eventName}`, handler as EventListener);
  }
  
  // ============================================
  // HOT RELOAD
  // ============================================
  
  enableHotReload(id: string) {
    const plugin = this.plugins.get(id);
    if (!plugin || !plugin.manifest.hotReload) return;
    
    // This would require a file watcher
    // For now, just a placeholder
    console.log(`[PluginManager] 🔥 Hot reload enabled for: ${id}`);
  }
}

// Global singleton
export const pluginManager = new PluginManager();

// Expose to window for debugging
(window as any).GodCord = (window as any).GodCord || {};
(window as any).GodCord.PluginManager = pluginManager;
