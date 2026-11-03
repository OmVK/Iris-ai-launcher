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

- **Version**: 5.6.0
- **App ID**: `com.stitch.iris.launcher`
- **Platform**: Android (Capacitor 8)
- **Target SDK**: 36 (Android 14+)

## ⚡ v5.6.0 iPhone-Grade Fluid Spring Physics, Camera-Safe Notch, Bidirectional Swiping & Gesture Optimization

IRIS v5.6.0 introduces fluid iOS-grade Dynamic Island spring physics, an unobstructed punch-hole camera safe notification bay, bidirectional continuous notch swiping, Samsung One UI gesture navigation protections, and lag-free settings rendering:
- **iPhone-Grade Dynamic Island Spring Physics**:
  - Unified iOS momentum curves (`cubic-bezier(0.32, 1.34, 0.42, 1)` expand, `cubic-bezier(0.25, 1, 0.5, 1)` collapse) across the top notch island, bottom dock, and app drawer sheet.
  - Zero-lag GPU compositing (`transform: translate3d(0, 0, 0)` with layout/paint containment) eliminates frame drops on 90Hz/120Hz displays.
- **Camera Punch-Hole Safe Split-Wing Notification Bay**:
  - Re-architected notch notifications with a 30px top sensor bridge flanking the center camera cutout and a 64px message bay positioned cleanly beneath the hole.
  - Text, icons, and sender headers are never obscured by physical camera punch-holes.
- **Bidirectional Notch Swipe & Archive Fix**:
  - Smooth circular wrap-around swiping (Telemetry ↔ Zero Screen ↔ Archive) with removed container-level swipe locks.
  - Permanent archive clear fix prevents old status bar notifications from re-populating cleared history.
- **Samsung One UI Gesture Navigation Safety & Zero-Lag Gestures Settings**:
  - Added bottom 32px gesture exclusion zone and lifted dock to prevent conflict with Android system Recent Apps gesture on devices like the Galaxy S24 Ultra.
  - Added dedicated `Dock Hold Assistant` toggle in Settings -> Gestures.
  - Replaced nested backdrop blur layers with hardware-accelerated translucent styling and CSS layout containment, ensuring 120fps scrolling in the Gestures settings menu.

## ⚡ v5.5.0 Native Message Archive, 60fps Dashboard & Deep Battery Optimization

IRIS v5.5.0 delivers native background message archiving (including deleted WhatsApp/social messages), a 60fps Widget Dashboard with third-party media session integration, deep battery & RAM optimizations, and unified glass/theme controls:
- **Native Background Notification Archive & Deleted-Message Preservation**:
  - `IrisNotificationListenerService` captures `MessagingStyle` (`EXTRA_MESSAGES`, `EXTRA_BIG_TEXT`, `EXTRA_TEXT_LINES`) messages in real time to native persistent storage (`SharedPreferences`), even when the screen is off or another app is open.
  - Intercepts `"This message was deleted"` / unsent events and `REASON_APP_CANCEL` revocations, preserving the original message text with a `DELETED BY SENDER` badge.
  - Added live Notification Access permission check and 1-tap enable banner in the Top Bar Notch Archive and Settings -> Advanced.
- **60fps Widget Dashboard & Third-Party Media Session Bridge**:
  - Replaced heavy per-card `backdrop-filter: blur` layers with GPU-friendly CSS-variable glass surfaces (`.iris-card`) and isolated `SignalWidget` / `BuiltInWidgets` ticks so scrolling stays locked at 60fps.
  - `MediaWidget` connects to Android `MediaSessionManager` to detect active third-party music players (Spotify, YouTube Music, VLC, Poweramp, etc.), display live track/artist metadata, and control playback.
- **Battery, RAM & ArcSearch Optimizations**:
  - Pauses the 60fps 3D `DrawerMesh` loop when the drawer is closed, aligns the Top Bar clock to the 60s minute boundary, skips background weather polling when inactive, and auto-sleeps the Home 3D tilt gyroscope when stationary.
  - Removed unused `HomeOrb` and `CyberSynth` (`SONIC`) engines, freeing WebGL/WebAudio memory.
  - Instant GPU-composited `ArcSearch` transition with pre-warmed search index and right-swipe-to-close across all Drawer layouts.
- **Complete Settings & Optical Glass Audit**:
  - Connected `Card Glass Opacity` and `Dark Glass Theme` across all Settings, Widgets, and IRIS Tools cards; wired all 6 page transition animations, multi-page Home Screen pager (`1–5` pages), Teardrop icon mask, Theme Presets, and Power Save feature toggles.

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
