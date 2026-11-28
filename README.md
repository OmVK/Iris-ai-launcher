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
- **Custom Widget Dashboard**: Includes 11 widget types (Screen Time, Performance, Weather, Stock, Media, Tasks, Ping, Signal, Custom + built-ins) with live telemetry.
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

- **Version**: 6.6.0
- **App ID**: `com.stitch.iris.launcher`
- **Platform**: Android (Capacitor 8)
- **Target SDK**: 36 (Android 14+)

## ⚡ v6.1.0 IRIS AI Total Upgrade — Rich Markdown & Code UI, Multimodal Vision, Cognitive Personas & Native Voice Bridge

IRIS v6.1.0 delivers a complete 5-pillar overhaul of the **IRIS AI Assistant** (`Assistant.jsx`) plus a critical gesture isolation fix:
- **Frictionless Cyber-Glass UI & Welcome Command Deck**:
  - Instant entry on launch (no forced biometric blur screen on standard sessions) with a 4-card **Interactive Welcome Command Deck** (*Daily Briefing & Notifications*, *Code & System Architect*, *Study Tutor & Flashcards*, *OS Memory & Device Boost*).
  - **Slide-Over Neural Sessions Drawer**: Mobile-friendly slide-over history drawer with **Automatic Session Naming** derived from your first message.
- **Rich Markdown, Code Copy & Actionable Message Cards**:
  - Renders headings, bullet points, numbered steps, bold key terms, inline code badges, and **fenced code blocks** with a language header and 1-tap **`COPY`** button.
  - Every AI response includes an inline action bar: **`COPY`**, **`SPEAK`** (TTS read-aloud that skips raw code blocks), **`NOTE`** (saves to IRIS Notes), **`TASK`** (saves to IRIS Day Tasks), **`✂️ SHORTER`**, and **`➕ DEEPER`**, plus an instant **`⏹️ STOP`** generation button while streaming.
- **Multimodal Vision & 1-Tap Context Chips**:
  - Attach photos or screenshots directly in chat via **`Vision Image`** for **Gemini Multimodal Vision** analysis, or tap **`Unread Notifs`**, **`Device Stats`**, **`Analyze Clipboard`**, and **`Live Autopilot`** chips above the input bar.
- **4 Cognitive Persona Modes**:
  - Switch between **`⚡ Commander`** (executive & OS control), **`💻 Coder`** (production code & complexity), **`🎓 Tutor`** (step-by-step study & flashcards), and **`🌐 Research`** (live DuckDuckGo + Wikipedia synthesis).
- **Native Android Speech Bridge, Live Voice Orb HUD & Arc Search Fix**:
  - Wired native `LauncherPlugin.startOfflineSpeech()` and `onSpeechPartial` into `useVoiceEngine.js` with a dedicated **Animated Live Voice Orb HUD**, and decoupled `showArcSearch` from `autoTriggerLive` so opening Arc Search never triggers IRIS AI in the background.

## ⚡ v6.0.0 IRIS Copilot 3.0 — Interview Wingman, Student Solver, Vision Scan & Clean Rule-of-3 UI

IRIS v6.0.0 introduces **IRIS Copilot 3.0** with live Interview & Student modes, Gemini Vision Screenshot Scanning, and a redesigned clutter-free UI:
- **Clean "Rule of 3" Context-Smart UI**:
  - Displays only the **2 best actions** for your active screen mode plus an expandable **`➕ MORE ▾` 2-Column Grid Drawer** for power tools (`🌐 Translate`, `📌 Extract Data`, `🔎 Fact Check`, `📜 Deep Scan`, `💡 Simplify (ELI5)`, `⭐ STAR Story`, `💻 Code Solve`, `✨ Polish Draft`).
  - **Single-Row Quick Filter Strip**: 1-tap `✨ 3-Mix`, `👍 Yes`, `✋ No`, `⏳ Later`, `👔 Polite`, `😎 Casual`, `⚡ Short`, and `📝 Detailed` filters.
  - **Decluttered Result Cards**: Tap any suggestion text to copy to clipboard; header shows only `⋯`, `INSERT ↵`, and `SEND ➤`, with `✂️ SHORTER`, `➕ LONGER`, `➕ TASK`, and `📝 NOTE` tucked cleanly inside `⋯`.
  - **Unified Smart Bottom Input Bar**: Single `[ Write message or ask AI... ] [🎙️] [📸] [➤]` bar with automatic intent routing (drafts messages or answers questions) plus 1-tap Voice and Vision Screenshot Scan.
- **🎯 Interview Wingman Mode (`INTERVIEW`)**:
  - Auto-activates on Zoom, Google Meet, Microsoft Teams, Webex, LinkedIn, and LeetCode (or tap the mode badge to cycle manually).
  - Includes **`🎤 Answer This`** (3-bullet teleprompter points + natural 30-second spoken script), **`⭐ STAR Story`** (`[S]`, `[T]`, `[A]`, `[R]` generator), **`💻 Code Solve`** (Approach + clean code + Time/Space complexity), and **Live Caption Buffer** (`captionHistoryBuffer`) that captures rolling meeting captions.
- **🎓 Student Study & Exam Solver (`STUDENT`)**:
  - Includes **`🧠 Solve / MCQ`** (direct answer + step-by-step explanation), **`🃏 Flashcards`** (`Q:` / `A:` study cards with 1-tap save to IRIS Notes), and **`💡 Simplify (ELI5)`** (plain-English breakdown + real-world analogy).
- **📸 Gemini Vision Screenshot Scan (`VISION_SCAN`)**:
  - Captures the live screen via Android 11+ `AccessibilityService.takeScreenshot()` and sends it to Gemini Multimodal Vision to solve diagrams, math equations, charts, and non-selectable images.

## ⚡ v5.9.0 IRIS Copilot 2.0 (Spatial Chat AI, Length/Tone Selector, Deep Scan) & Self-Healing Live Models

IRIS v5.9.0 delivers a major evolution of the **Floating Copilot** alongside a **100% Automatic Self-Healing AI Model Engine**:
- **IRIS Copilot 2.0 — Draggable Cybernetic HUD & Spatial Screen Intelligence**:
  - **Spatial Chat Attribution (`[THEM]` vs. `[YOU]`)**: Reads screen bounds to distinguish incoming vs. outgoing chat bubbles and automatically classifies the active screen mode (`CHAT`, `BROWSER`, `EMAIL`, `GENERAL`).
  - **Smart Reply Length, Tone & Intent Strip**: Choose **`SHORT` / `MEDIUM` / `DETAILED`** depth and **`AUTO` / `POLITE` / `CASUAL` / `PRO` / `WITTY` / `👍 YES` / `✋ NO` / `⏳ LATER`** stance chips, with labeled 3-style cards (`⚡ SHORT & CASUAL`, `👔 POLITE & BALANCED`, `📝 DETAILED & COMPLETE`) and 1-tap **`SEND ➤`** (injects text and clicks Send).
  - **Multi-Screen Deep Scan (`📜`) & Live Fact-Check (`🔎`)**: Auto-scrolls and stitches multi-screen threads/articles into a deduplicated buffer, and verifies claims against live Wikipedia search.
  - **Voice Compose (`🎙️`), Clipboard AI (`📋`), Entity Extractor & Task/Note Bridge**: Speak rough thoughts directly into Compose, trigger AI on copied text, copy extracted OTPs/URLs/emails/phones with 1 tap, and save results straight to IRIS Tasks (`➕ TASK`) or Notes (`📝 NOTE`).
- **100% Automatic Live Model Sync & Self-Healing Fallback**:
  - Queries Google Gemini and Groq live `/models` endpoints on startup and key save, automatically purging discontinued models and applying the newest active models system-wide across Chat, Voice, and Floating Copilot with zero manual input.

## ⚡ v5.8.0 Floating Edge Copilot, Compose Mode, Screen AI & Archive Fixes

IRIS v5.8.0 introduces a system-wide **Floating Edge Copilot** that works across any Android app, along with transparent overlay customization, smart message composition, and notification archive improvements:
- **System-Wide Floating Edge Copilot (`◈`)**:
  - Translucent floating edge pill (`TYPE_ACCESSIBILITY_OVERLAY`) that reads active screen context across WhatsApp, Chrome, Brave, Gmail, Notes, and other apps while respecting password privacy fields.
  - **6 Quick Neural Actions**: **`⚡ SMART REPLY`**, **`✍️ COMPOSE`** (with **`AUTO` / `PRO` / `CASUAL` / `SHORT`** tone chips), **`📝 SUMMARIZE`**, **`✨ REWRITE`**, **`🔍 EXPLAIN`**, and **`💬 ASK AI`**.
  - **1-Tap `INSERT ↵` & Dynamic Soft Keyboard**: Injects generated replies or composed drafts directly into the active app's input field (`ACTION_SET_TEXT` / `ACTION_PASTE` + clipboard fallback), with dynamic `FLAG_NOT_FOCUSABLE` switching so the soft keyboard pops up reliably when composing or asking questions.
- **Dedicated `IRIS COPILOT` Settings**:
  - Configure **Pill & Card Opacity** (`15% – 95%`), **Auto-Hide Timeout** (`Never`, `3s`, `5s`, `10s`), **Pill Size** (`Compact`, `Normal`, `Large`), **Edge Dock Side** (`Right`, `Left`, `Free`), **Show on IRIS Home**, **Show Only When Typing**, and **Auto-Open Keyboard on Ask**.
- **Top Notch Notification Archive Fixes**:
  - Fixed individual message `CLEAR` button tap/hit-testing inside the Dynamic Island and prevented reusable Android notification key collisions when deleting individual archived messages.

## ⚡ v5.6.0 Native Icon Engine, 120Hz High-Refresh Pipeline, 5-Pill Notch Control Center & Screen Time Telemetry

IRIS v5.6.0 delivers a major 120Hz performance and feature upgrade across the entire launcher, including a zero-Base64 native icon streaming engine, Keep-Warm tab caching, a 5-pill Notch Control Center, Screen Time telemetry, and ArcSearch deep shortcuts:
- **Zero-Base64 Native Icon URL Streaming (`https://localhost/__iris_icon__/<pkg>`)**:
  - Replaced ~3.5 MB of Base64 icon strings in `localStorage` and Capacitor bridge JSON payloads with a custom native `WebViewClient.shouldInterceptRequest` binary WebP/PNG streaming endpoint backed by an in-memory `LruCache` and disk cache (`app_icons_v2`).
  - Staggered micro-batch icon pre-warming and viewport-bounded eager rendering (`index < 35`) with zero per-icon GPU `drop-shadow` overdraw ensure butter-smooth 120Hz App Drawer pull-ups without exhausting WebView Vulkan texture memory.
- **Native 120Hz Display Mode Lock & Keep-Warm Page Caching**:
  - `MainActivity.enforceHighRefreshRate()` queries `Display.getSupportedModes()` and locks the window to the highest supported refresh rate (120Hz/90Hz) alongside `WebView.RENDERER_PRIORITY_IMPORTANT`.
  - `Home`, `Drawer`, `Widgets`, and `Assistant` stay warm in memory once visited, eliminating unmount/remount lag when switching tabs.
- **5-Pill Notch Control Center, Accessibility God-Mode & Real Kernel RAM Boost**:
  - Upgraded the Dynamic Island `SYS TELEMETRY` action bar into a 5-pill Control Center: **`TORCH`**, **`RINGER`** (cycles `Normal` → `Vibrate` → `Silent`), **`BOOST`** (native `KILL_BACKGROUND_PROCESSES` + WebView cache purge + GC with real kernel `availMem` delta reporting), **`SHOT`** (instant screenshot via `IrisAccessibilityService`), and **`LOCK`** (instant hardware screen lock without wearing the power button).
  - Wired gesture actions (`screen_lock`, `recents`, `screenshot`, `split_screen`) directly to Android `AccessibilityService.performGlobalAction`.
- **Direct Inline Notification Reply (`RemoteInput`) & Live OTP Auto-Copy Pill**:
  - Reply to WhatsApp, Telegram, Instagram, Signal, and SMS messages directly from the Dynamic Island Notification Archive (`CondensedNotifLog.jsx`) using native Android `RemoteInput` + 1-tap quick-reply chips (`👍`, `On my way`, `In a meeting, will text soon`).
  - Automatically detects 4–8 digit verification/OTP codes in incoming notifications and renders a glowing 1-tap **`COPY OTP: 123456`** pill in both the Dynamic Island banner and archive.
- **Native Binary Wallpaper Streaming (`https://localhost/__iris_wallpaper__`) & Frame-Time Adaptive Governor**:
  - System and custom wallpapers are cached natively to disk (`iris_wallpaper.jpg`) and streamed via `WebViewClient.shouldInterceptRequest`, eliminating multi-megabyte Base64 strings from `localStorage`.
  - Auto-FPS Frame Governor in `PowerSaveManager` monitors frame deltas during touch gestures and temporarily throttles heavy canvas effects on budget devices when frame time exceeds 24ms.
- **Hardware Scale-Up App Launch Morph, Zero-Reload Home Intent & Multi-Sample Flick Physics**:
  - Launched apps morph smoothly out of the tapped icon's exact screen coordinates via `ActivityOptions.makeScaleUpAnimation`.
  - Pressing the Android Home button (`onNewIntent`) smoothly collapses open drawers/modals back to `'home'` with zero WebView reload, and drawer pull gestures respect Global Skin `Spring` / `Smooth` / `Crisp` easing and `Transition Speed`.
- **AI OS Agent Tool Execution & Real Android Linux Shell Terminal**:
  - `aiAgentTools.js` equips the IRIS AI Assistant to execute real hardware/OS actions (`toggle_flashlight`, `set_ringer_mode`, `optimize_memory`, `lock_screen`, `take_screenshot`, `get_screen_time`, `get_recent_notifications`, `launch_app`, `run_shell_command`).
  - `DiagnosticsTerminal.jsx` now includes an interactive `sh -c` Android Linux Shell executor with quick-command chips (`CPU TOP`, `BATTERY`, `STORAGE`, `NET IP`, `PING DNS`, `SYS PROP`).
- **Digital Wellbeing & Screen Time Widget (`ScreenTimeWidget.jsx`)**:
  - Added an 11th built-in widget powered by Android `UsageStatsManager` (`PACKAGE_USAGE_STATS`), displaying total daily screen time and top 4 most-used apps with usage bars and 1-tap permission grant.
- **ArcSearch Deep Shortcuts & Silent Notification Archive Mode**:
  - Added instant deep actions in `ArcSearch` (direct WhatsApp chat, Google Maps navigation, YouTube search, Android system sub-settings, and inline math/unit copy pills).
  - Added a **Notch Notification Popups** toggle in Settings -> Dynamic Island (`notifPopupsEnabled`) to silence top-bar popups while continuing to archive all incoming notifications (including deleted messages) in the background, plus fixed individual notification deletion in `NOTIF LOG`.
- **iPhone-Grade Dynamic Island Spring Physics, Camera-Safe Notch & S24 Ultra Protections**:
  - Unified iOS momentum curves (`cubic-bezier(0.32, 1.34, 0.42, 1)`), 30px punch-hole camera bridge, circular bidirectional notch swiping, bottom 64px gesture exclusion zone for Samsung One UI Recent Apps swipes, and Android 13+ Restricted Settings Accessibility guide.

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
