// Plugin Type Definitions
export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  icon?: string; // emoji or icon class
  
  // Plugin type
  type?: 'builtin' | 'external';
  
  // Dependencies
  dependencies?: string[];
  
  // Lifecycle hooks
  onLoad?: () => void | Promise<void>;
  onUnload?: () => void | Promise<void>;
  onEnable?: () => void | Promise<void>;
  onDisable?: () => void | Promise<void>;
  
  // Settings schema
  settings?: PluginSettings;
  
  // Hot reload support
  hotReload?: boolean;
  
  // UI Components (HTML strings or constructors)
  components?: {
    settings?: string | (() => HTMLElement);
    modal?: string | (() => HTMLElement);
  };
}

export interface PluginSettings {
  [key: string]: PluginSettingDefinition;
}

export interface PluginSettingDefinition {
  type: 'boolean' | 'string' | 'number' | 'select' | 'color';
  label: string;
  description?: string;
  default: any;
  options?: Array<{ label: string; value: any }>; // for select type
}

export interface Plugin {
  id: string; // unique identifier
  manifest: PluginManifest;
  module: any;
  enabled: boolean;
  path: string;
  error?: string;
}

export interface PluginState {
  [pluginId: string]: {
    enabled: boolean;
    settings: Record<string, any>;
  };
}
