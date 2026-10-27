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

- **Version**: 5.4.0
- **App ID**: `com.stitch.iris.launcher`
- **Platform**: Android (Capacitor 8)
- **Target SDK**: 36 (Android 14+)

## ⚡ v5.4.0 Dynamic Notification Notch, Quick Search & Transparent Drawer Edition

IRIS v5.4.0 introduces live notification expansion, app-color glows, permanent notification archiving, deep search quick chips, and a fully transparent app drawer:
- **Dynamic Notification Island & Signature Glow**:
  - The top notch dynamically expands into an interactive notification pill upon receiving notifications, displaying app badges, sender headers, and message previews.
  - Features real-time app-signature illumination across both the notch and the bottom dock (WhatsApp green, Messenger blue, Telegram cyan, Gmail red).
- **Permanent Notification Archive ("Even if Deleted")**:
  - Automatically intercepts and preserves notification history locally, accessible via Zero Screen and the 3-tab notch carousel with instant search, category filtering, and direct app launching.
- **Three-Tab Expanded Notch Carousel**:
  - Seamless bidirectional swipe navigation between `SYS TELEMETRY`, `ZERO SCREEN`, and `NOTIF LOG`.
- **ArcSearch Quick Action Chips & Collapsible Favorites**:
  - Instant one-tap chips (`ALL`, `CALC`, `UNITS`, `CONTACTS`, `FILES`, `WEB`, `DEEP SEARCH`) below the search bar.
  - Collapsible favorite apps pull-down accordion with smooth spring animations.
- **Fully Transparent App Drawer**:
  - Removed dark gradient backdrops for complete wallpaper visibility; integrated smooth cross-fading of home screen icons during drawer gestures.

## ⚡ v5.3.0 Cybernetic HUD & Dynamic Island Edition

IRIS v5.3.0 introduces an expandable cybernetic Dynamic Island notch, real-time HUD utilities, and refined gesture orchestration:
- **Dynamic Island Top Notch Island**: Tap or swipe to expand the notch status bar into an interactive cybernetic HUD with seamless horizontal swiping between `SYS TELEMETRY` and `ZERO SCREEN` briefings.
- **Quick HUD Action Bar**: Integrated one-tap quick toggles directly inside the expanded island:
  - **`TORCH`**: Instant hardware flashlight toggle with amber cyber glow.
  - **`PURGE RAM`**: One-tap native memory optimizer invoking `LauncherPlugin.optimizeMemory()` with an animated cleaning indicator, haptic feedback, and an `OPTIMIZED` badge.
  - **`MUTE`**: Instant audio volume and mute toggle.
- **Refined System Telemetry**: Formatted memory counters in gigabytes (`GB`) alongside live CPU thermals, battery telemetry, and network status.
- **Home Dock Safety Threshold**: Upgraded press-and-hold duration on the bottom navigation dock to 1 full second (1000ms) with double haptic feedback, preventing accidental voice assistant triggers while keeping dock swiping and page switching fluid.
- **Conflict-Free Gesture Routing**: Inbuilt gestures streamlined through user settings to eliminate conflicts between drawer pull-downs and Android system notification shades.

## ⚡ v5.2.0 Hardened Security & Cybernetic Edition

IRIS v5.2.0 delivers comprehensive cryptographic, privacy, and architectural enhancements:
- **On-Device Notification PII Redaction**: Automatic real-time regex sanitization in `IrisNotificationListenerService.java` redacting OTPs, 2FA codes, account tokens, credit cards, emails, phone numbers, crypto addresses, and UPI IDs before dispatch.
- **Hardware-Backed AES-256 GCM Storage**: AndroidKeyStore integration with PBKDF2 (SHA-256, 310,000 iterations) fallback derivation and non-extractable keys.
- **Biometric & Chrono Lockout Shield**: Dynamic time-synced PIN verification paired with a 5-attempt threshold and native 30-second brute-force cooldown.
- **Native Vault Token Binding**: High-entropy `UUID.randomUUID()` tokens with immediate auto-revocation upon screen-off or app suspension.
- **Prompt Injection Delimiter Isolation**: External RAG documents and live web search data encapsulated in `<untrusted_context>` tags with strict system override prevention.
- **Content Security Policy (CSP)**: Strict WebView CSP restricting network transport to verified HTTPS and local loopback RPCs.
- **"IRIS Optics" Vision Assistant (`VisionAssistant.jsx`)**: Real-time camera feed and screenshot analyzer powered by multimodal AI.
- **Kokoro-82M Neural Voice Synthesis**: 100% offline neural text-to-speech synthesis with multi-timbre voice selection.
- **13 Built-in Cybersecurity Tools & 10 Widgets**: Network latency probes, IP geolocation, password generator, crypto hash calculator, DNS/WHOIS queries, battery telemetry, and real-time stocks/crypto charts.
- **3D Mesh Sphere Drawer (DrawerMesh)**: GPU-accelerated Fibonacci sphere layout with dynamic search, alphabetical letter jumps, and custom app folders.

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
