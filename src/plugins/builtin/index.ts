// @ts-nocheck
// Builtin Plugins Registry
import { pluginManager } from '../core/PluginManager';
import BetterEmojis from './BetterEmojis';

export function registerBuiltinPlugins() {
  const builtins = [
    { id: 'better-emojis', module: BetterEmojis },
  ];
  
  for (const { id, module } of builtins) {
    try {
      pluginManager.registerPlugin(
        id,
        module.manifest,
        module,
        `builtin/${id}`
      );
      console.log(`[Builtin] ✅ Registered: ${id}`);
    } catch (err) {
      console.error(`[Builtin] ❌ Failed to register ${id}:`, err);
    }
  }
  
  console.log(`[Builtin] Registered ${builtins.length} builtin plugins`);
}
