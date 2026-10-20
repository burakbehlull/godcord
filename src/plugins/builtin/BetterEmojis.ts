// @ts-nocheck
import { PluginManifest } from '../core/types';

export const manifest: PluginManifest = {
  name: 'Better Emojis',
  version: '1.0.0',
  description: 'Emoji boyutunu artır ve animasyonları iyileştir',
  author: 'GodCord',
  icon: '😀',
  type: 'builtin',
  settings: {
    emojiSize: {
      type: 'select',
      label: 'Emoji Boyutu',
      description: 'Chat\'teki emoji boyutunu ayarla',
      default: 'large',
      options: [
        { label: 'Normal', value: 'normal' },
        { label: 'Büyük', value: 'large' },
        { label: 'Extra Büyük', value: 'xlarge' },
      ],
    },
    animateOnHover: {
      type: 'boolean',
      label: 'Hover\'da Animasyon',
      description: 'Emoji\'nin üzerine gelindiğinde büyüt',
      default: true,
    },
  },
};

let styleElement: HTMLStyleElement | null = null;

export function onEnable() {
  console.log('[BetterEmojis] Plugin etkinleştirildi');
  injectStyles();
}

export function onDisable() {
  console.log('[BetterEmojis] Plugin devre dışı bırakıldı');
  removeStyles();
}

function injectStyles() {
  if (styleElement) return;
  
  styleElement = document.createElement('style');
  styleElement.id = 'godcord-better-emojis';
  styleElement.textContent = `
    /* Better Emojis Plugin */
    .emoji {
      transition: transform 0.2s ease;
    }
    .emoji:hover {
      transform: scale(1.3);
    }
    img[class*="emoji"] {
      min-width: 32px !important;
      min-height: 32px !important;
    }
  `;
  
  document.head.appendChild(styleElement);
  console.log('[BetterEmojis] Stiller enjekte edildi');
}

function removeStyles() {
  if (styleElement) {
    styleElement.remove();
    styleElement = null;
    console.log('[BetterEmojis] Stiller kaldırıldı');
  }
}

export default {
  manifest,
  onEnable,
  onDisable,
};
