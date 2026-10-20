# 🎮 GodCord - Türkçe Döküman

**Modern Discord Client Mod** - Güçlü plugin sistemi

Discord için modüler ve genişletilebilir client mod. Yerleşik ve harici plugin desteği, kullanıcı dostu panel arayüzü.

[🇬🇧 English Documentation](./README.md)

---

## 📋 İçindekiler

- [Özellikler](#-özellikler)
- [Kurulum](#-kurulum)
- [Kullanım](#-kullanım)
- [Plugin Geliştirme](#-plugin-geliştirme)
- [Mimari](#️-mimari)
- [Komutlar](#-komutlar)
- [Sorun Giderme](#-sorun-giderme)

---

## ✨ Özellikler

### 🧩 Plugin Sistemi
- **Yerleşik Pluginler**: `src/plugins/builtin/` klasöründe
- **Harici Pluginler**: `%APPDATA%/godcord/plugins/` klasöründe (yakında)
- **Lifecycle Hooks**: onLoad, onUnload, onStart, onStop
- **Ayar Sistemi**: Otomatik UI oluşturma ile
- **Olay Sistemi**: Plugin'ler arası iletişim

### 🎨 Kullanıcı Arayüzü
- **Dashboard Sekmesi**: Plugin istatistikleri, sistem bilgisi
- **Plugins Sekmesi**: Plugin yönetimi, aktif/pasif yapma, ayarlar
- **Themes Sekmesi**: Tema desteği (yakında)
- **Settings Sekmesi**: Genel ayarlar (yakında)
- **Klavye Kısayolu**: `Ctrl+Shift+G` ile aç/kapat
- **Title Bar Butonu**: Discord'un üst çubuğunda entegre buton

### 🔧 Teknik Özellikler
- **TypeScript**: Tip güvenli kod
- **esbuild**: Hızlı derleme (<20ms)
- **LocalStorage**: Ayarları kaydetme
- **Event-Driven**: Olay tabanlı mimari
- **Modüler**: Temiz kod ayrımı

---

## 📦 Kurulum

### Gereksinimler
- Node.js (v16 veya üzeri)
- npm veya yarn
- Discord Desktop (Windows)

### Adımlar

```bash
# 1. Repoyu klonla veya indir
git clone https://github.com/yourusername/godcord.git
cd godcord

# 2. Bağımlılıkları yükle
npm install

# 3. Projeyi derle
npm run build

# 4. Discord'a enjekte et
npm run inject

# 5. Discord'u kapat ve tekrar aç
```

### Kurulum Sonrası Kontrol

Discord açıldığında:
1. F12 tuşuna basın (DevTools)
2. Console sekmesine gidin
3. `[GodCord]` loglarını arayın
4. Üst çubukta **GodCord** butonunu görmelisiniz

---

## 🎯 Kullanım

### Panel Açma/Kapatma

**Yöntem 1: Klavye Kısayolu**
```
Ctrl + Shift + G
```

**Yöntem 2: Title Bar Butonu**
- Discord'un üst çubuğunda **GodCord** yazısına tıklayın

**Yöntem 3: Console**
```javascript
GodCord.togglePanel()  // Aç/kapat
GodCord.openPanel()    // Aç
GodCord.closePanel()   // Kapat
```

### Sekmeler

#### 📊 Dashboard
- Plugin sayısı (toplam, aktif)
- Sistem bilgileri
- Kısayol bilgisi

#### 🧩 Plugins
- Yüklü pluginleri görüntüleme
- Pluginleri aktif/pasif yapma (toggle)
- Plugin ayarlarını düzenleme
- Harici pluginleri silme
- Yeni plugin ekleme (yakında)

#### 🎨 Themes
- Tema yükleme (yakında)
- Tema düzenleme (yakında)

#### ⚙️ Settings
- Genel ayarlar (yakında)

### Console Komutları

```javascript
// Panel kontrolleri
GodCord.togglePanel()  // Panel aç/kapat
GodCord.openPanel()    // Panel aç
GodCord.closePanel()   // Panel kapat

// Bilgi
GodCord.version        // Versiyon numarası

// Yeniden yükle
GodCord.reload()       // Discord'u yeniden yükle
```

---

## 🔌 Plugin Geliştirme

### Yerleşik Plugin Oluşturma

#### 1. Plugin Dosyası Oluştur

`src/plugins/builtin/MyPlugin.ts`:

```typescript
import { PluginManifest } from '../core/types';

// Plugin bilgileri
export const manifest: PluginManifest = {
  name: 'Benim Pluginim',
  version: '1.0.0',
  description: 'Harika bir plugin!',
  author: 'Senin Adın',
  icon: '🚀',
  type: 'builtin',
  
  // İsteğe bağlı: Ayarlar tanımla
  settings: {
    enabled: {
      type: 'boolean',
      label: 'Özelliği Aktif Et',
      description: 'Özelliği aç/kapat',
      default: true
    },
    username: {
      type: 'string',
      label: 'Kullanıcı Adı',
      default: 'Misafir'
    },
    color: {
      type: 'color',
      label: 'Renk Teması',
      default: '#5865f2'
    }
  }
};

// Plugin yüklendiğinde çalışır (her zaman)
export function onLoad() {
  console.log('Plugin yüklendi!');
}

// Plugin aktif edildiğinde çalışır
export function onStart() {
  console.log('Plugin başlatıldı!');
  
  // Örnek: Discord'a mesaj gönder
  alert('Merhaba Discord! 👋');
  
  // Örnek: Ayarlara eriş
  const settings = window.GodCord.PluginManager.getPluginSettings('my-plugin');
  console.log('Ayarlar:', settings);
}

// Plugin pasif edildiğinde çalışır
export function onStop() {
  console.log('Plugin durduruldu!');
  
  // Temizlik işlemleri
}

// Plugin kaldırıldığında çalışır
export function onUnload() {
  console.log('Plugin kaldırıldı!');
}

export default { manifest, onLoad, onStart, onStop, onUnload };
```

#### 2. Plugin'i Kaydet

`src/plugins/builtin/index.ts`:

```typescript
import { pluginManager } from '../core/PluginManager';
import BetterEmojis from './BetterEmojis';
import MyPlugin from './MyPlugin';  // Yeni plugin

export function registerBuiltinPlugins() {
  const builtins = [
    { id: 'better-emojis', module: BetterEmojis },
    { id: 'my-plugin', module: MyPlugin },  // Ekle
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
```

#### 3. Derle ve Test Et

```bash
# Derle
npm run build

# Discord'a enjekte et
npm run inject

# Discord'u yeniden başlat
```

### Plugin Manifest Detayları

```typescript
interface PluginManifest {
  // Zorunlu alanlar
  name: string;              // Plugin adı
  version: string;           // Versiyon (1.0.0)
  description: string;       // Kısa açıklama
  author: string;            // Yazar adı
  type: 'builtin' | 'external';
  
  // İsteğe bağlı
  icon?: string;             // Emoji (🚀) veya ikon
  settings?: Record<string, SettingDefinition>;
  components?: {
    settings?: () => HTMLElement;  // Özel ayar UI'ı
  };
  dependencies?: string[];   // Bağımlılıklar
  permissions?: string[];    // İzinler (gelecek)
}
```

### Ayar Tipleri

```typescript
// Boolean (aç/kapat)
{
  type: 'boolean',
  label: 'Özelliği Aktif Et',
  description: 'Açıklama',
  default: true
}

// String (metin)
{
  type: 'string',
  label: 'Kullanıcı Adı',
  default: 'Misafir'
}

// Number (sayı)
{
  type: 'number',
  label: 'Maksimum Öğe',
  default: 10
}

// Color (renk seçici)
{
  type: 'color',
  label: 'Tema Rengi',
  default: '#5865f2'
}

// Select (seçim kutusu)
{
  type: 'select',
  label: 'Seçenek',
  options: [
    { value: 'opt1', label: 'Seçenek 1' },
    { value: 'opt2', label: 'Seçenek 2' }
  ],
  default: 'opt1'
}
```

### Lifecycle (Yaşam Döngüsü)

```typescript
// 1. Plugin kaydedilir
onLoad() {
  // Kurulum işlemleri
  // Her zaman çalışır (plugin devre dışı bile olsa)
}

// 2. Plugin aktif edilir
onStart() {
  // Plugin çalışmaya başlar
  // Sadece plugin aktifken çalışır
}

// 3. Plugin pasif edilir
onStop() {
  // Temizlik işlemleri
  // Event listener'ları kaldır
  // Interval/timeout'ları temizle
}

// 4. Plugin kaldırılır
onUnload() {
  // Son temizlik
  // Bellekten kaldırma işlemleri
}
```

### Ayarlara Erişim

```typescript
// Plugin içinde
export function onStart() {
  const pluginId = 'my-plugin';  // Kendi plugin ID'n
  const settings = window.GodCord.PluginManager.getPluginSettings(pluginId);
  
  console.log('Enabled:', settings.enabled);
  console.log('Username:', settings.username);
  console.log('Color:', settings.color);
}

// Ayar değiştirme
window.GodCord.PluginManager.setPluginSetting(pluginId, 'username', 'Yeni İsim');
```

### Event Sistemi

```typescript
import { pluginManager } from '../core/PluginManager';

// Event dinle
export function onLoad() {
  pluginManager.on('plugin-enabled', (id) => {
    console.log(`Plugin aktif edildi: ${id}`);
  });
  
  pluginManager.on('plugin-disabled', (id) => {
    console.log(`Plugin pasif edildi: ${id}`);
  });
}

// Event fırlat
pluginManager.emit('custom-event', { data: 'değer' });
```

---

## 🏗️ Mimari

### Genel Bakış

```
Discord.exe (Electron App)
    │
    ├── Main Process (Node.js)
    │   └── dist/main.js
    │       └── BrowserWindow yaması
    │
    ├── Preload Script
    │   └── dist/preload.js
    │       ├── contextBridge
    │       └── renderer.js'i enjekte eder
    │
    └── Renderer Process (Chromium)
        └── dist/renderer.js
            ├── PluginManager
            ├── Panel UI
            └── Plugins
                ├── builtin/
                └── external/
```

### Dosya Yapısı

```
godcord/
├── src/
│   ├── main/
│   │   └── index.ts              # BrowserWindow patch
│   ├── preload/
│   │   └── index.ts              # Renderer injection
│   ├── renderer/
│   │   └── index.ts              # UI + Logic
│   └── plugins/
│       ├── core/
│       │   ├── types.ts          # Tip tanımları
│       │   └── PluginManager.ts  # Plugin yönetimi
│       └── builtin/
│           ├── index.ts          # Plugin kaydı
│           └── BetterEmojis.ts   # Örnek plugin
├── scripts/
│   ├── build.mjs                 # esbuild config
│   └── inject.mjs                # Enjeksiyon scripti
├── dist/                         # Derlenmiş dosyalar
│   ├── main.js       (9.7kb)
│   ├── preload.js    (4.9kb)
│   └── renderer.js   (47kb)
└── package.json
```

### Çalışma Prensibi

1. **Discord Başlatılır**
   - Electron app çalışır
   - Main process yüklenir

2. **Main Process Patching**
   - `BrowserWindow` yamalanır
   - `preloadPath` değiştirilir
   - Discord'un kendi main'i çalıştırılır

3. **Preload Injection**
   - Discord'un preload'ı çalıştırılır
   - `renderer.js` script tag ile eklenir
   - contextBridge kurulur

4. **Renderer Execution**
   - Panel UI oluşturulur
   - Pluginler kaydedilir
   - Event listener'lar kurulur

---

## 🔧 Komutlar

### Geliştirme

```bash
# Projeyi derle
npm run build

# Watch mode (otomatik derleme)
npm run dev

# Discord'a enjekte et
npm run inject

# Enjeksiyonu geri al
npm run uninject

# Hızlı sync (derle + dosyaları kopyala)
npm run sync
```

### Manuel Kontrol

```bash
# Discord klasörünü bul
cd C:\Users\%USERNAME%\AppData\Local\Discord\app-1.0.xxxx\resources

# app.asar yedeği kontrol et
dir _app.asar

# app/ klasörü kontrol et
dir app
```

---

## 🐛 Sorun Giderme

### Panel Görünmüyor

**Çözüm 1: Discord'u Yeniden Başlat**
```
1. Discord'u tamamen kapat (sağ alttaki tepsi ikonundan)
2. Task Manager'da Discord.exe kontrolü yap
3. Discord'u tekrar aç
4. Ctrl+Shift+G ile paneli aç
```

**Çözüm 2: Console Kontrol**
```
1. Discord'da F12 bas (DevTools)
2. Console sekmesine git
3. [GodCord] loglarını ara
4. Hata varsa buradan gör
```

**Çözüm 3: Manuel Toggle**
```javascript
// Console'a yaz
GodCord.togglePanel()
```

### Injection Başarısız

**Sorun**: Discord'a enjekte edilemiyor

**Çözümler**:

```bash
# 1. Discord'u tamamen kapat
taskkill /F /IM Discord.exe

# 2. Yönetici olarak çalıştır
# PowerShell'i yönetici olarak aç ve:
cd C:\path\to\godcord
npm run inject

# 3. Discord yolunu manuel belirt
$env:GODCORD_DISCORD_PATH="C:\Users\YourName\AppData\Local\Discord\app-1.0.xxxx"
npm run inject

# 4. Enjeksiyonu geri al ve tekrar dene
npm run uninject
npm run inject
```

### Discord Açılmıyor

**Sorun**: Discord açılmıyor veya crash oluyor

**Çözüm**:
```bash
# Enjeksiyonu geri al
npm run uninject

# Discord'u normal aç
# Eğer açılıyorsa, problem enjeksiyondaydı
```

### Build Hataları

**Sorun**: `npm run build` hata veriyor

```bash
# node_modules'u sil ve tekrar yükle
rmdir /s /q node_modules
npm install

# Cache'i temizle
npm cache clean --force

# Tekrar dene
npm run build
```

### Plugin Çalışmıyor

**Kontrol Listesi**:

1. ✅ Plugin kaydı yapıldı mı? (`builtin/index.ts`)
2. ✅ Build yapıldı mı? (`npm run build`)
3. ✅ Inject yapıldı mı? (`npm run inject`)
4. ✅ Discord yeniden başlatıldı mı?
5. ✅ Console'da hata var mı? (F12)
6. ✅ Plugin aktif mi? (Plugins sekmesi)

### Performance Sorunları

**Discord yavaş çalışıyor**

```javascript
// Console'dan plugin sayısını kontrol et
GodCord.PluginManager.getAllPlugins().length

// Aktif pluginleri kontrol et
GodCord.PluginManager.getAllPlugins().filter(p => p.enabled)

// Problematik plugini bul ve pasif et
```

---

## 🎓 Gelişmiş Konular

### Plugin Bağımlılıkları

```typescript
export const manifest: PluginManifest = {
  name: 'Gelişmiş Plugin',
  version: '1.0.0',
  dependencies: ['better-emojis', 'other-plugin'],
  // ...
};

export function onLoad() {
  // Bağımlılıkları kontrol et
  const deps = manifest.dependencies || [];
  for (const depId of deps) {
    const dep = pluginManager.getPlugin(depId);
    if (!dep || !dep.enabled) {
      console.error(`Bağımlılık eksik veya pasif: ${depId}`);
      return;
    }
  }
}
```

### Özel Ayar UI'ı

```typescript
export const manifest: PluginManifest = {
  name: 'Özel UI Plugin',
  version: '1.0.0',
  components: {
    settings: () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div style="padding: 20px;">
          <h3>Özel Ayarlar</h3>
          <button id="custom-btn">Tıkla</button>
        </div>
      `;
      
      container.querySelector('#custom-btn').addEventListener('click', () => {
        alert('Butona tıklandı!');
      });
      
      return container;
    }
  }
};
```

### LocalStorage Kullanımı

```typescript
// Veri kaydetme
export function onStart() {
  const data = { user: 'test', count: 10 };
  localStorage.setItem('my-plugin-data', JSON.stringify(data));
}

// Veri okuma
export function onLoad() {
  const raw = localStorage.getItem('my-plugin-data');
  if (raw) {
    const data = JSON.parse(raw);
    console.log('Yüklenen veri:', data);
  }
}

// Veri silme
export function onUnload() {
  localStorage.removeItem('my-plugin-data');
}
```

---

## 📊 İstatistikler

- **Toplam Dosya**: ~15 core dosya
- **Bundle Boyutu**: 47KB (renderer)
- **Build Süresi**: <20ms
- **Bağımlılık**: Sadece esbuild
- **Plugin Sayısı**: 1 yerleşik (genişletilebilir)

---

## ⚠️ Önemli Uyarılar

1. **Discord ToS**: Bu mod Discord'un kullanım şartlarını ihlal edebilir
2. **Ban Riski**: Hesabınız banlanabilir
3. **Güvenlik**: Sadece güvendiğiniz pluginleri kullanın
4. **Güncelleme**: Discord güncellemesi enjeksiyonu bozabilir
5. **Yedekleme**: Önemli verilerinizi yedekleyin

---

## 🤝 Katkıda Bulunma

- 🐛 Bug bildirimi
- 💡 Özellik önerisi
- 🔧 Pull request
- 📝 Dokümantasyon iyileştirme
- 🧩 Plugin paylaşımı

---

## 📄 Lisans

Eğitim amaçlıdır. Discord markası Discord Inc. şirketine aittir.

---

## 📚 Ek Kaynaklar

- [Electron Dokümantasyon](https://www.electronjs.org/docs)
- [Discord API](https://discord.com/developers/docs)
- [esbuild](https://esbuild.github.io/)
- [TypeScript](https://www.typescriptlang.org/)

---

**❤️ ile yapıldı - Discordion ve Vencord'dan esinlenildi**
