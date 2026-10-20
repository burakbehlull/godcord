# 🎮 Godcord

**Modern Discord Client Mod** with a powerful plugin system

A modular and extensible Discord client mod with built-in and external plugin support, hot reload, and a user-friendly panel interface.

[🇹🇷 Türkçe Döküman](./lang/tr.md)

---

## ✨ Features

- 🧩 **Plugin System** - Built-in + External plugin support
- 🎯 **Modular Architecture** - Clean separation between core and plugins
- ⚙️ **Tabbed Panel** - Dashboard, Plugins, Themes, Settings
- ⌨️ **Keyboard Shortcuts** - `Ctrl+Shift+G` to toggle panel
- 🎨 **Modern UI** - Discord-themed interface
- 🎮 **Title Bar Integration** - Seamless button in Discord's title bar
- 📦 **Easy Plugin Development** - Simple manifest-based system
- 💾 **Persistent Settings** - LocalStorage-based configuration
- 🔄 **Plugin Lifecycle** - onLoad, onUnload, onStart, onStop hooks
- 🎛️ **Settings Management** - Per-plugin settings with UI generation

## 📦 Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Inject into Discord
npm run inject

# Restart Discord
```

## 🎯 Usage

### Opening the Panel
1. Launch Discord
2. Press **Ctrl+Shift+G** or
3. Click the **Godcord** button in the title bar

### Plugin Management

#### Plugins Tab
- ✅ Enable/disable plugins with toggle switches
- ⚙️ Configure plugin settings
- 🗑️ Delete external plugins
- + Add new plugins (coming soon)

#### Creating Your First Plugin

```typescript
// src/plugins/builtin/MyPlugin.ts

import { PluginManifest } from '../core/types';

export const manifest: PluginManifest = {
  name: 'My First Plugin',
  version: '1.0.0',
  description: 'My awesome plugin!',
  author: 'Your Name',
  icon: '🎉',
  type: 'builtin',
  
  // Optional: Define settings
  settings: {
    enabled: {
      type: 'boolean',
      label: 'Enable Feature',
      description: 'Turn the feature on/off',
      default: true
    },
    color: {
      type: 'color',
      label: 'Color Theme',
      default: '#5865f2'
    }
  }
};

export function onLoad() {
  console.log('Plugin loaded!');
}

export function onStart() {
  console.log('Plugin started!');
  alert('Hello Discord! 👋');
}

export function onStop() {
  console.log('Plugin stopped!');
}

export function onUnload() {
  console.log('Plugin unloaded!');
}

export default { manifest, onLoad, onStart, onStop, onUnload };
```

Then register it in `src/plugins/builtin/index.ts`:

```typescript
import MyPlugin from './MyPlugin';

export function registerBuiltinPlugins() {
  const builtins = [
    { id: 'my-plugin', module: MyPlugin },
    { id: 'better-emojis', module: BetterEmojis },
  ];
  // ...
}
```

### Console Usage

```javascript
// Panel controls
GodCord.togglePanel()
GodCord.openPanel()
GodCord.closePanel()

// Version info
GodCord.version // "0.1.0"

// Reload Discord
GodCord.reload()
```

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│   Electron (Discord's binary)       │
└─────────────────────────────────────┘
           │
┌──────────▼──────────────────────────┐
│  MAIN PROCESS (dist/main.js)        │
│  - BrowserWindow patching            │
│  - Loads Discord                     │
└──────────┬──────────────────────────┘
           │
┌──────────▼──────────────────────────┐
│  PRELOAD (dist/preload.js)          │
│  - contextBridge                     │
│  - Renderer injection                │
│  - Discord preload chain             │
└──────────┬──────────────────────────┘
           │
┌──────────▼──────────────────────────┐
│  RENDERER (dist/renderer.js)        │
│  - Plugin Manager                    │
│  - Tabbed Panel UI                   │
│  - Title bar button                  │
│  - Settings persistence              │
└─────────────────────────────────────┘
           │
     ┌─────┴─────┐
     │           │
┌────▼────┐ ┌───▼────────┐
│ Builtin │ │  External  │
│ Plugins │ │  Plugins   │
│         │ │ (AppData)  │
└─────────┘ └────────────┘
```

## 📁 Directory Structure

```
godcord/
├── src/
│   ├── main/                  # Electron main process
│   │   └── index.ts           # BrowserWindow patch
│   ├── preload/               # Preload script
│   │   └── index.ts           # contextBridge + injection
│   ├── renderer/              # Renderer (runs in Discord)
│   │   └── index.ts           # Tabbed panel + logic
│   └── plugins/
│       ├── core/
│       │   ├── types.ts       # Plugin type definitions
│       │   └── PluginManager.ts  # Plugin management system
│       └── builtin/
│           ├── index.ts       # Builtin plugin registration
│           └── BetterEmojis.ts  # Example plugin
├── scripts/
│   ├── build.mjs              # esbuild configuration
│   ├── inject.mjs             # Discord injection script
│   ├── inject-final.mjs       # Alternative injection
│   └── inject-asar-patch.mjs  # ASAR patching method
├── dist/                      # Compiled output
├── DOKUMAN.md                 # Turkish documentation
├── INSTALL_GUIDE.md           # Installation guide
├── QUICKSTART.md              # Quick start guide
├── package.json
└── README.md
```

## 🔧 Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run inject` | Build + inject into Discord |
| `npm run uninject` | Remove injection |
| `npm run sync` | Quick rebuild and sync |
| `npm run dev` | Watch mode (development) |

## 🎨 Customization

### Creating a Built-in Plugin

1. Create a new file in `src/plugins/builtin/`
2. Write your plugin code (TypeScript)
3. Register it in `src/plugins/builtin/index.ts`
4. Run `npm run build`
5. Run `npm run inject`

### Creating an External Plugin

1. Open `%APPDATA%/godcord/plugins/`
2. Create a new folder (e.g., `my-plugin`)
3. Add `index.ts` or `index.js` file
4. Implement plugin interface
5. Plugin loads automatically when Discord starts

**Detailed guide**: See `DOKUMAN.md` for Turkish documentation

## 🎛️ Current Features

### ✅ Implemented
- **Plugin System Core**
  - Plugin registration and lifecycle
  - Enable/disable functionality
  - Settings management (localStorage)
  - Event system (on/emit)
  
- **User Interface**
  - Dashboard tab (plugin statistics)
  - Plugins tab (management interface)
  - Themes tab (placeholder)
  - Settings tab (placeholder)
  - Keyboard shortcut (Ctrl+Shift+G)
  - Title bar button
  
- **Built-in Plugins**
  - BetterEmojis (example plugin)

### 🚧 Planned
- Hot reload system
- External plugin loader (active loading)
- React/TSX component support
- Theme system
- Permission system
- Network request broker
- Audit logging

## ⚠️ Important Notes

- This is NOT an official Discord application
- May violate Discord's Terms of Service
- Use at your own risk
- Discord updates may break the injection

## 🔄 After Discord Updates

When Discord updates:

```bash
npm run uninject
npm run inject
```

## 🐛 Troubleshooting

**Panel not showing?**
- Fully close Discord and restart
- Check console for errors (F12)
- Try `Ctrl+Shift+G` keyboard shortcut

**Injection failed?**
- Make sure Discord is completely closed (including tray icon)
- Run as administrator (Windows)
- Check Discord installation path

**Discord won't start?**
```bash
npm run uninject
```

## � Plugin System Features

### Plugin Manifest

```typescript
interface PluginManifest {
  name: string;              // Display name
  version: string;           // Semantic version
  description: string;       // Short description
  author: string;            // Author name
  icon?: string;             // Emoji or icon
  type: 'builtin' | 'external';
  
  // Optional features
  settings?: Record<string, SettingDefinition>;
  components?: {
    settings?: () => HTMLElement;
  };
  dependencies?: string[];   // Plugin dependencies
  permissions?: string[];    // Required permissions
}
```

### Lifecycle Hooks

- **onLoad()** - Called when plugin is registered
- **onUnload()** - Called when plugin is unregistered
- **onStart()** - Called when plugin is enabled
- **onStop()** - Called when plugin is disabled

### Settings System

Automatic UI generation for plugin settings:

```typescript
settings: {
  myBoolean: {
    type: 'boolean',
    label: 'Enable Feature',
    description: 'Description here',
    default: true
  },
  myString: {
    type: 'string',
    label: 'Username',
    default: 'Guest'
  },
  myNumber: {
    type: 'number',
    label: 'Max Items',
    default: 10
  },
  myColor: {
    type: 'color',
    label: 'Theme Color',
    default: '#5865f2'
  },
  mySelect: {
    type: 'select',
    label: 'Choose Option',
    options: [
      { value: 'opt1', label: 'Option 1' },
      { value: 'opt2', label: 'Option 2' }
    ],
    default: 'opt1'
  }
}
```

## 📚 Documentation Files

- **README.md** (this file): General overview (English)
- **DOKUMAN.md**: Detailed documentation (Turkish)
- **INSTALL_GUIDE.md**: Installation instructions
- **QUICKSTART.md**: Quick start guide

## 🎓 Technologies & Concepts

- Electron injection techniques
- BrowserWindow patching
- contextBridge usage
- Preload scripting
- Discord client modding
- esbuild bundling
- Plugin architecture (modular system)
- Event-driven design
- State management (LocalStorage)
- Manifest-based configuration

## 📈 Stats

- **File count**: ~15 core files
- **Bundle size**: ~47KB (renderer)
- **Build time**: <20ms
- **Plugins**: 1 built-in (expandable)
- **Dependencies**: esbuild only

## 🤝 Contributing

This is an educational project. Feel free to:
- Report bugs
- Suggest features
- Create pull requests
- Share your plugins

## 📄 License

made by Burak Behlül.

---

**Made with ❤️ Burak Behlül**
