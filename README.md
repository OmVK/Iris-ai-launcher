# IRIS Cybernetic AI Launcher 🌐

A futuristic, highly customizable, and cybernetic Android launcher built with React, TailwindCSS, and Capacitor. IRIS brings an immersive sci-fi desktop experience to your mobile device, heavily integrated with local and cloud-based AI.

## 🚀 Features

- **Cybernetic Interface**: Matrix, CyberGrid, and Neon interactive wallpapers with a 3D sphere app drawer (DrawerMesh) and customizable icon themes.
- **AI Integrations**: Native support for 5 LLM backends (Gemini, Groq, NVIDIA, HuggingFace, Ollama) with automatic model fallback and an integrated RAG engine for local file search. Gemini keys are sent via `x-goog-api-key` headers — never in URLs.
- **Offline Voice Assistant**: Fully functional offline voice commands utilizing Piper TTS Web Worker and RiveScript with 31 regex command matchers and multi-turn context handling (notes, reminders, timers, app launch, calls, weather).
- **Private Encrypted Vault**: AES-GCM encrypted storage for photos and sensitive apps, protected by a Chrono PIN Lock and Biometric authentication, with threat photo capture on failed access.
- **Virtual Filesystem**: Explore and manage files with drag-and-drop functionality and an eval-free calculator in search.
- **Power Save Manager**: Smart 4-mode resource optimization (AUTO, HIGH, MEDIUM, LOW) with 21 feature presets per tier based on device capabilities.
- **Global ArcSearch**: Unified search across installed apps, files, web, and LLM.
- **Custom Widget Dashboard**: Includes 10 widget types (Performance, Weather, Stock, Media, Tasks, Ping, Signal, Custom + built-ins) with a CyberSynth ambient audio engine.
- **Security Toolkit**: 12 built-in cybersecurity tools including port scanner, DNS lookup, WHOIS, and traceroute, plus a threat monitoring dashboard.
- **Backup & Restore**: Local on-device app state backup and restore (cloud backup disabled for privacy).
- **Offline-First**: On-device silent speech recognition, battery-optimized polling, and graceful feature degradation on low-end devices.

## 🛠️ Technology Stack

| Technology | Version |
|---|---|
| React | 18 |
| Zustand | 5 |
| TailwindCSS | 3 |
| Vite | 5 |
| Capacitor | 8 (Android) |

## 📱 App Info

- **Version**: 4.9.3
- **App ID**: `com.stitch.iris.launcher`
- **Platform**: Android

## 🛡️ v4.9.3 Security Suite Expansion

IRIS v4.9.3 adds high-utility cybersecurity and network analysis tools to `IrisTools.jsx`:
- **App Permission Auditor (`AppPermissionAuditor.jsx`)**: Scans installed Android apps, grades privacy risk (Critical, High, Medium, Safe), flags dangerous permissions (Camera, Mic, GPS, SMS, Contacts, Storage), and provides 1-click native App Info inspection.
- **Wi-Fi & Rogue AP Inspector (`WifiInspector.jsx`)**: Audits Wi-Fi encryption protocols (WPA3/WPA2 vs WEP/Open), ARP cache MITM spoofing defenses, router ping latency, and scans local router management ports.
- **State Store Consolidation**: Unified `AppLockSection` into `useAppsStore` and removed redundant store code.
- **Native Bridge Optimization**: Pruned 11 unreferenced native helper exports in `LauncherPlugin.js`.
- **Bundle Optimization**: Cleaned up unused static binary assets in `public/piper/` for a leaner build footprint.
- **Zero Circular Dependencies**: Graph verified as 100% DAG reachable from `src/main.jsx`.

## 📦 Build & Run

Ensure you have Node.js (17+) and the Android SDK (platform 36) installed.

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Lint source
npm run lint

# Build + sync + compile debug APK
npm run deploy:android
```

cd android && ./gradlew assembleRelease
```

The release keystore (`android/app/release.keystore`) is gitignored. Build outputs land in `android/app/build/outputs/apk/`.

## 🏗️ Project Structure

```
src/
├── main.jsx                 Entry point
├── App.jsx                  Root router
├── stores/                  Zustand state management (8 stores)
├── hooks/                   Custom React hooks (12 files)
├── utils/                   Utilities & engines (21 files)
├── components/              Reusable UI components (51 files)
│   └── drawer/              Drawer layouts incl. 3D DrawerMesh
├── pages/                   Page components (43 files)
│   ├── settings/            Settings sections (21 files)
│   ├── assistant/           Assistant sub-components
│   └── widgets/             Widget components (10 files)
├── tools/                   IRIS cybersecurity tools data
├── data/                    Stock & OEM data
├── workers/                 Piper TTS Web Worker
└── rivescript/              Offline chatbot brain files
```

## 🔒 Security

IRIS includes advanced security measures:
- **Threat Logs**: Silently capture photos of unauthorized Vault access attempts.
- **AES-GCM-256 Encryption**: Web Crypto API with non-extractable keys for secure API key and vault storage.
- **Biometric Authentication**: Fingerprint/face unlock for the Private Vault.
- **Chrono PIN Lock**: Time-based PIN system for vault access.
- **Hardened Network Config**: Cleartext HTTP disabled globally (loopback-only whitelist), cloud backup disabled.
- **No eval()**: The built-in calculator uses a tokenizer/parser (`safeMath.js`).

## 📄 License

This project is proprietary software.
