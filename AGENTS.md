# AGENTS.md — IRIS Cybernetic AI Launcher

## Build & Run
```bash
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Build for production
npm run deploy:android  # Build + sync + compile APK
```

## ADB Path
```
$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe
```

## Project Info
- **Version**: 4.6.0
- **App ID**: com.stitch.iris.launcher
- **Platform**: Android (Capacitor 8)
- **Stack**: React 18, Zustand 5, Tailwind 3, Vite 5

## Code Style
- Functional components with hooks
- Zustand stores for shared state
- `useCallback`/`useMemo` for expensive computations
- TailwindCSS utility classes
- Components under 300 lines
- No comments unless asked
- No emojis unless asked

---

## PROJECT STRUCTURE (120 JS/JSX files, ~13,200 lines)

```
src/
├── main.jsx                    (80 lines)  Entry point
├── App.jsx                     (204 lines) Root router, all props from stores
├── ErrorBoundary.jsx           (46 lines)  Error boundary
├── index.css                   (493 lines) Tailwind + custom CSS
├── stores/                                 Zustand state (7 files, 342 lines)
│   ├── appStore.js             (59 lines)  App state: activePage, vault, chronoLock
│   ├── appsStore.js            (68 lines)  Installed apps, custom folders
│   ├── themeStore.js           (63 lines)  22 visual settings with persistence
│   ├── aiStore.js              (26 lines)  API keys, LLM backend, voice settings
│   ├── assistantStore.js       (110 lines) Chat sessions, live voice, text prompt
│   ├── powerStore.js           (10 lines)  Power save mode (delegates to PowerSaveManager)
│   └── index.js                (6 lines)   Barrel re-export
├── hooks/                                   Custom hooks (10 files, 1,401 lines)
│   ├── useVoiceEngine.js       (342 lines) Speech recognition + TTS pipeline
│   ├── useAIBackend.js         (300 lines) AI inference (5 backends) + RAG + search
│   ├── useOfflineTTS.js        (220 lines) Piper TTS Web Worker + audio pipeline
│   ├── useOfflineDispatch.js   (204 lines) Offline voice command dispatch (8 actions)
│   ├── useAppEffects.js        (108 lines) App lifecycle, fullscreen, vault auto-lock
│   ├── useStockData.js         (94 lines)  Binance + Yahoo Finance live data
│   ├── useAppContextMenu.js    (48 lines)  Long-press context menu
│   ├── useAppGestures.js       (42 lines)  Swipe/long-press gesture detection
│   ├── useThemeVars.js         (25 lines)  CSS custom property injection
│   └── usePageRouter.js        (18 lines)  Navigation helpers
├── utils/                                  Utilities (8 files, 1,023 lines)
│   ├── OfflineCommandEngine.js (349 lines) RiveScript + 31 regex command matchers
│   ├── offlineSideEffects.js   (223 lines) 18 side effect handlers (timer, notes, weather)
│   ├── PowerSaveManager.js     (211 lines) Singleton, 3 tiers, 21 features per tier
│   ├── secureStorage.js        (99 lines)  AES-GCM encryption via Web Crypto API
│   ├── IrisIconPack.jsx        (72 lines)  13 custom sci-fi SVG icons
│   ├── weather.js              (65 lines)  Open-Meteo API, WMO code mapping
│   ├── storage.js              (12 lines)  Shared getLS/getLSNum/getLSBool helpers
│   ├── appClickRouter.js       (8 lines)   Route app clicks (path vs native)
│   └── constants.js            (2 lines)   BUILTIN_APPS=[], APP_VERSION='4.6.0'
├── components/                             Reusable UI (38 files, 4,439 lines)
│   ├── LauncherPlugin.js       (671 lines) Native bridge wrapper (40+ functions)
│   ├── OfflineAssistantOverlay (391 lines) Full offline voice assistant overlay
│   ├── SetupWizard.jsx         (312 lines) First-run 4-step wizard
│   ├── ChronoPinLock.jsx       (311 lines) Vault lock (time-based PIN + biometric)
│   ├── FileExplorer.jsx        (302 lines) Virtual filesystem with drag-drop
│   ├── StockChart.jsx          (294 lines) Dual-ticker SVG chart
│   ├── InteractiveWallpaper.jsx(222 lines) Canvas wallpaper (Matrix/CyberGrid/Neon)
│   ├── FolderModal.jsx         (194 lines) Folder view/edit modal
│   ├── IrisVisualizer.jsx      (183 lines) 3D particle sphere orb
│   ├── RagEngine.js            (151 lines) TF-IDF local file search
│   ├── ArcSearch.jsx           (136 lines) Global search (apps, files, web, LLM)
│   ├── GlobeVisualizer.jsx     (125 lines) 3D wireframe globe with aurora
│   ├── TaskAlarmOverlay.jsx    (123 lines) Task reminder with alert tone
│   ├── ThreatLogs.jsx          (122 lines) Security threat photo gallery
│   ├── CyberSynth.js           (120 lines) Web Audio ambient synth engine
│   ├── TopAppBar.jsx           (103 lines) Status bar (clock, battery, network)
│   ├── AnimatedCardBuilder.jsx (100 lines) GSAP/Tailwind code preview renderer
│   ├── HomeGrid.jsx            (92 lines)  3D-tilted home screen app grid
│   ├── ToolResultDisplay.jsx   (91 lines)  Tool result renderer (IP, pw, hash, crypto)
│   ├── ZeroScreen.jsx          (86 lines)  Daily briefing (weather, AI, quotes)
│   ├── AppContextMenu.jsx      (82 lines)  Long-press context menu
│   ├── BottomNavBar.jsx        (64 lines)  5-tab bottom navigation
│   ├── VaultExplorer.jsx       (62 lines)  Vault tabs (Files, Apps, Threats)
│   ├── LiveConfigModal.jsx     (48 lines)  AI engine config for live voice
│   ├── PinKeypad.jsx           (44 lines)  Numeric PIN input
│   ├── ChronoClockDial.jsx     (39 lines)  Animated clock dial
│   ├── HudFallbackIcon.jsx     (15 lines)  Cyan-filtered icon fallback
│   ├── HudIcon.jsx             (13 lines)  IRIS icon pack renderer
│   ├── HomeClockBanner.jsx     (13 lines)  Weather+battery pill
│   ├── AssistantStatusPanel.jsx(25 lines)  Offline assistant status text + audio canvas
│   ├── LetterFilterBar.jsx     (30 lines)  A-Z filter bar for drawer ring
│   ├── ThreatPhotoCapture.jsx  (10 lines)  Threat photo capture status badge
│   ├── PermissionsStep.jsx     (65 lines)  Setup wizard permissions step
│   ├── FileCreator.jsx         (45 lines)  File explorer new file form
│   └── LiveVoiceFAB.jsx        (8 lines)   Floating voice button
│   └── drawer/                              Drawer layouts (5 files, 514 lines)
│       ├── DrawerRing.jsx      (339 lines) 3D sphere with drag rotation + A-Z filter
│       ├── DrawerList.jsx      (57 lines)  Vertical list layout
│       ├── DrawerCategories.jsx(54 lines)  Category/folder cards
│       ├── DrawerGrid.jsx      (34 lines)  Grid layout
│       └── DrawerIcon.jsx      (30 lines)  Single app icon renderer
├── pages/                                  Page components (11 files, 1,933 lines)
│   ├── Drawer.jsx              (288 lines) App drawer, 4 layouts, search, folders
│   ├── Home.jsx                (255 lines) Home screen with orb, weather, battery
│   ├── Widgets.jsx             (232 lines) Widget dashboard (8 widget types)
│   ├── Assistant.jsx           (223 lines) AI chat interface
│   ├── Terminal.jsx            (219 lines) Full terminal with commands + particles
│   ├── IrisNews.jsx            (197 lines) Hacker News + BBC RSS feed
│   ├── IrisTools.jsx           (182 lines) 12 cybersecurity tools
│   ├── PrivateVault.jsx        (171 lines) Encrypted photo gallery
│   ├── Settings.jsx            (90 lines)  Settings page (48 props from App)
│   └── VpnBrowser.jsx         (48 lines)  Native WebView browser overlay
│   ├── settings/                           Settings sections (16 files, 698 lines)
│   │   ├── WallpaperThemeSection.jsx (104 lines) Theme + wallpaper + live wallpaper
│   │   ├── AppIconsSection.jsx       (94 lines) Per-app icon customization
│   │   ├── ApiKeysSection.jsx        (71 lines) API key management
│   │   ├── SettingControls.jsx       (64 lines) Toggle, Slider, OptionGrid
│   │   ├── AboutSection.jsx          (50 lines) App info
│   │   ├── VaultLockSection.jsx      (46 lines) Vault lock + auto-lock
│   │   ├── PowerSaveSection.jsx      (45 lines) Power save mode selector
│   │   ├── TransitionsSection.jsx    (45 lines) Transitions + icon theme
│   │   ├── FactoryResetSection.jsx   (36 lines) Factory reset
│   │   ├── LayoutConfigSection.jsx   (36 lines) DPI, grid, icon/text scale
│   │   ├── LLMBackendSection.jsx     (34 lines) Backend + Gemini model selector
│   │   ├── LauncherEngineSection.jsx (30 lines) Set as default launcher
│   │   ├── SettingsSection.jsx       (27 lines) Accordion wrapper
│   │   ├── VoiceSettingsSection.jsx  (26 lines) Voice pitch + rate
│   │   ├── NeuralSkillsSection.jsx   (14 lines) TTS toggle + drawer search
│   │   └── TweaksSection.jsx         (13 lines) Glass opacity, labels, 24h, fullscreen
│   ├── assistant/                          Assistant sub-components (5 files, 370 lines)
│   │   ├── OllamaManager.jsx    (146 lines) Ollama model manager
│   │   ├── EngineModelBar.jsx   (80 lines) Backend/model selector bar
│   │   ├── DiagnosticsTerminal.jsx (78 lines) System diagnostics
│   │   ├── SessionSidebar.jsx   (38 lines) Session list sidebar
│   │   └── ChatMessage.jsx      (28 lines) Chat message component
│   └── widgets/                            Widget components (10 files, 439 lines)
│       ├── WidgetConfig.jsx     (90 lines) Widget workshop manager
│       ├── PerformanceWidget.jsx(82 lines) Battery, memory, CPU temp
│       ├── SignalWidget.jsx     (82 lines) Battery/signal/RAM bars
│       ├── WeatherWidget.jsx    (70 lines) Weather station display
│       ├── TasksWidget.jsx      (55 lines) Day task manager
│       ├── CustomWidget.jsx     (27 lines) User-created widget
│       ├── PingWidget.jsx       (22 lines) Network latency tester
│       ├── StockWidget.jsx      (10 lines) Stock chart wrapper
│       └── RemoveButton.jsx     (7 lines)  Close button
├── terminal/                               Terminal (3 files, 604 lines)
│   ├── commands.js              (544 lines) 40 registered commands
│   ├── llmQuery.js              (58 lines)  LLM query for terminal
│   └── index.js                 (2 lines)  Barrel re-export
├── tools/                                  IRIS Tools data (1 file, 118 lines)
│   └── irisToolsData.js         (118 lines) 12 tool definitions
├── data/                                   Data files (2 files, 140 lines)
│   ├── stockData.js             (83 lines)  9 mock stock/crypto entries
│   └── oemData.js               (57 lines)  11 OEM battery optimization instructions
├── workers/                                Web Workers (1 file, 57 lines)
│   └── piperWorker.js           (57 lines) Piper TTS Web Worker
└── rivescript/                             RiveScript files (3 binary files)
    ├── brain.rive, personality/eliza.rive, personality/begin.rive
```

---

## ZUSTAND STORES (6 stores, 342 lines)

### appStore.js — App State
| Field | Type | Default | Persisted |
|-------|------|---------|-----------|
| `activePage` | string | `'home'` | No |
| `isAppActive` | boolean | `true` | No |
| `setupComplete` | boolean | `false` | `iris_setup_complete` |
| `showChronoLock` | boolean | `false` | No |
| `chronoTarget` | any | `null` | No |
| `isVaultUnlocked` | boolean | `false` | No |
| `showVaultExplorer` | boolean | `false` | No |
| `vaultTab` | string | `'FILES'` | No |
| `lockedApps` | string[] | `[]` | `iris_locked_apps` |
| `showArcSearch` | boolean | `false` | No |
| `showVpnBrowser` | boolean | `false` | No |
| `vpnBrowserUrl` | string | `''` | No |

Key actions: `setActivePage`, `setSetupComplete` (writes localStorage), `toggleAppLock` (writes localStorage), `setShowChronoLock`, `setIsVaultUnlocked`, `setShowArcSearch`, `setShowVpnBrowser`.

### appsStore.js — Installed Apps
| Field | Type | Default | Persisted |
|-------|------|---------|-----------|
| `installedApps` | Object[] | `loadApps()` | `installed_apps` |

Key actions: `setInstalledApps`, `mergeNativeApps` (dedupes by packageId, filters IRIS packages), `loadNativeApps` (calls native `getInstalledApps()`), `resetToDefaults`.

Side effect at import: filters `IRIS_PACKAGE_IDS` from `installed_apps` and `iris_custom_folders` in localStorage.

### themeStore.js — 22 Visual Settings
All fields persist to localStorage. Key fields:
- `themeColor` (default `'cyan'`), `glassOpacity` (75), `wallpaper` (`'VOID'`)
- `dpiScale` (100), `gridColumns` (5), `gridRows` (5)
- `homeIconSize` (100), `homeTextSize` (100), `drawerIconSize` (100), `drawerTextSize` (100)
- `layoutStyle` (`'CENTERED'`), `drawerLayout` (`'GRID'`)
- `showAppLabels` (true), `showDrawerSearch` (true), `showHomeOrb` (true)
- `use24HourClock` (true), `fullscreenActive` (false)
- `pageTransitionEffect` (`'SLIDE_UP'`), `pageTransitionSpeed` (300), `pageTransitionEasing` (`'SMOOTH'`)
- `globalIconTheme` (`'DEFAULT'`), `activeLiveWallpaper` (`'NONE'`)

### aiStore.js — AI Backend + API Keys
| Field | Type | Persisted |
|-------|------|-----------|
| `llmBackend` | string (`'GEMINI'`) | `system_llm_backend` |
| `geminiKey` | string | SecureStorage `gemini_api_key` |
| `groqKey` | string | SecureStorage `groq_api_key` |
| `geminiModel` | string | `gemini_model` |
| `voiceEnabled` | boolean | `iris_voice_enabled` |
| `voicePitch` | number (1.0) | `iris_voice_pitch` |
| `voiceRate` | number (0.96) | `iris_voice_rate` |

`loadKeys()` reads from SecureStorage. `migrateAll()` auto-encrypts plaintext keys.

### assistantStore.js — Chat Sessions
14 fields: `chatLog`, `textPrompt`, `isListening`, `isSpeaking`, `isLiveVoice`, `isPrivateSession`, `isLiveScreenOpen`, `activeUserTranscript`, `activeAiResponse`, `showLiveConfigModal`, `liveSetupEngine`, `liveSetupKey`, `sessions`, `activeSessionId`.

Sessions capped at 10, chat logs at 50 entries. `persistSessions()` writes to `iris_assistant_sessions`. `togglePrivate()` clears/restores chatLog.

### powerStore.js — Power Save Mode
1 field: `powerSaveMode` (delegates to `PowerSaveManager`). Sets `window.__powerSaveMode` global.

---

## HOOKS (10 files, 1,401 lines)

### useVoiceEngine.js (342 lines) — Speech Recognition + TTS
**Bridge hook**: connects useAIBackend via `setSubmitPrompt(submitPrompt, isGeneratingRef, abortControllerRef)`.

**Module-level singleton**: `recognition` (SpeechRecognition instance, created at import).

**TTS pipeline** (speakText): Cartesia TTS (native or web) → native Android TTS → browser SpeechSynthesis.

**Key refs**: `submitPromptRef`, `backendIsGeneratingRef`, `backendAbortRef`, `lastTtsTextRef`.

**useCallbacks**: `startVoiceInput`, `stopVoiceInput`, `speakText`, `stopSpeaking`, `handleOpenLiveMode`, `handleExitLiveModeOnly`, `handleStopLiveModeCompletely`, `isLiveConfigured`, `handleEngageLiveClick`, `handleSaveLiveConfig`, `setSubmitPrompt`, `submitPrompt`.

### useAIBackend.js (300 lines) — AI Inference
**Constructor**: `speakTextFn` (from useVoiceEngine).

**5 backends**: GEMINI (SSE), GROQ (SSE), NVIDIA (SSE), HUGGINGFACE (SSE), OLLAMA (non-streaming).

**Inner functions**: `fetchWebSearch(query)` (DuckDuckGo + Wikipedia), `streamSSE(res, loadingId)` (SSE parser).

**SEARCH_KEYWORDS**: 35+ keywords triggering web search.

### useOfflineTTS.js (220 lines) — Piper TTS Web Worker
Manages Piper Web Worker lifecycle, audio queue, AudioContext + AnalyserNode, visualizer animation loop, 30s idle cleanup timer.

### useOfflineDispatch.js (204 lines) — Offline Voice Commands
8 actions: `open` (Levenshtein fuzzy match), `close_overlay`, `uninstall`, `app_info`, `call` (contact lookup), `timer`, `alarm`.

### useAppEffects.js (108 lines) — App Lifecycle
7 useEffects: vault package sync, fullscreen+backButton+appStateChange, keepAlive polling, task alarm polling, vault auto-lock, task state events, notification interception.

### useAppGestures.js (42 lines) — Swipe/Long-Press
Swipe right → home, swipe left → iris_news, swipe up → drawer, swipe down → notification panel, long-press → ArcSearch.

### useAppContextMenu.js (48 lines) — Context Menu
`handleContextMenu`, `handleLockApp`, `handleTriggerUninstall`, `handleOpenAppInfo`. Used by Home.jsx and Drawer.jsx.

### useThemeVars.js (25 lines) — CSS Variables
Sets `--primary-rgb`, `--primary-color`, `--primary-color-secondary`, `--glass-opacity` on `document.documentElement`.

### usePageRouter.js (18 lines) — Navigation
`handleLaunchApp(app)`, `handleTriggerVault()`, `handleTriggerChronoLock(t)`.

### useStockData.js (94 lines) — Live Market Data
Fetches from Binance API (crypto) and Yahoo Finance via allorigins proxy (stocks).

---

## UTILITIES (10 files, 1,055 lines)

### secureStorage.js (99 lines) — AES-GCM Encryption
- Key stored in IndexedDB (`IrisSecureDB`)
- `setItem(key, value)`: encrypts with AES-GCM-256, stores in localStorage as `iris_enc_{key}`
- `getItem(key)`: reads from localStorage, decrypts
- `migrateAll()`: auto-encrypts plaintext API keys
- Special cases: `nvidia_api_key` and `huggingface_api_key` also set boolean flags `iris_has_nvidia_key`/`iris_has_hf_key`
- **8 consumers**: aiStore, useAIBackend, useVoiceEngine, llmQuery, Assistant, DiagnosticsTerminal, ApiKeysSection, LiveConfigModal

### PowerSaveManager.js (234 lines) — Power Save Singleton
- 4 modes: AUTO, HIGH, MEDIUM, LOW
- 21 features per tier: use3DOrb, useWallpaper, particleCanvas, backdropBlur, pageTransitions, liveWidgetUpdates, backgroundNotifications, animatedIcons, gridAnimations, batteryPollMs, weatherPollMs, widgetMetricsPollMs, clockPollMs, networkPollMs, keepAlivePollMs, taskCheckPollMs, terminalNetPollMs, wallpaperFps, iconDecodeSize, deferredPiperInit, maxRenderItems
- `detectDeviceTier()`: reads `navigator.deviceMemory` and `navigator.hardwareConcurrency`
- `getPollingInterval(key)`: returns ms value for current tier
- `shouldDisable(feature)`: checks if boolean feature is false
- **13 consumers** across the codebase
- **Battery optimized (v4.6.1)**: keepAlivePollMs=300s (was 30-60s), taskCheckPollMs=120s (was 30-60s)

### OfflineCommandEngine.js (349 lines) — Voice Command Engine
- 31 regex-based command matchers in `rules` array
- RiveScript integration for fallback responses
- Unit conversion via `convert-units`
- RiveScript macros for flashlight, wifi, bluetooth, volume, battery, app launch, call, timer, alarm, weather, notes

### offlineSideEffects.js (223 lines) — Side Effect Handlers
18 actions: battery_result, contact_result, weather, notifications, notes_result, check_ram, check_temp, optimize_memory, toggle_flashlight, set_brightness, set_volume, open_settings, timer, sleep_mode, driving_mode, save_note, read_notes, clear_notes, delete_last_note, remind, search_web, stealth_capture.

### weather.js (65 lines) — Weather API
Open-Meteo API. WMO code mapping. Reads coordinates from localStorage.

### IrisIconPack.jsx (72 lines) — Custom Icons
13 sci-fi SVG icons for common Android packages (Chrome, Phone, Messages, Camera, Settings, Maps, YouTube, Gmail, Photos, Play Store, Clock, Calendar, Calculator).

### appClickRouter.js (8 lines)
If `app.path` exists → `onNavigate(app.path)`. Otherwise → `launchApp(app.packageId)`.

### constants.js (2 lines)
`BUILTIN_APPS = []` (empty), `APP_VERSION = '4.5.0'`.

### DEAD CODE: logger.js, timing.js, iris.rive

---

## PAGES (11 files, 1,933 lines)

### App.jsx (204 lines) — Root Router
- Reads all 6 stores (massive prop surface)
- Instantiates useVoiceEngine, useAIBackend (with bridge), useAppGestures, useThemeVars, useAppEffects, usePageRouter
- Renders: TopAppBar, BottomNavBar, page switch, InteractiveWallpaper, ChronoPinLock, VaultExplorer, SetupWizard, ArcSearch, ZeroScreen, TaskAlarmOverlay, LiveVoiceFAB, LiveConfigModal, VpnBrowser
- DPI scaling via CSS `zoom: dpiScale/100`
- Page transitions via CSS classes

### Home.jsx (255 lines)
Props (20): onNavigate, onTriggerChronoLock, onTriggerVault, isVaultUnlocked, gridColumns, gridRows, homeIconSize, homeTextSize, layoutStyle, setLayoutStyle, installedApps, setInstalledApps, lockedApps, onToggleAppLock, showAppLabels, globalIconTheme, isAppActive, showHomeOrb, powerSaveMode.

Renders: HomeClockBanner, HomeGrid, AppContextMenu, OfflineAssistantOverlay (React.lazy). Swipe gestures: up→drawer, left→iris_news, right→zero_screen.

### Drawer.jsx (288 lines)
Props (17): All grid/layout settings, installedApps, setInstalledApps, lockedApps, onToggleAppLock, showAppLabels, showDrawerSearch, globalIconTheme, drawerIconSize, drawerTextSize, drawerLayout, setDrawerLayout.

4 layouts: DrawerGrid, DrawerList, DrawerCategories, DrawerRing. FolderModal for folder view/edit. Search, sort, category filters.

### Settings.jsx (90 lines)
Props (48) — largest prop count. Passes all to 14 settings section components. Accordion behavior via `expandedSections` state.

### Assistant.jsx (223 lines)
Reads aiStore and assistantStore directly. 16 useState, 5 useEffect. Renders SessionSidebar, EngineModelBar, OllamaManager, DiagnosticsTerminal, ChatMessage, GlobeVisualizer. Biometric lock, live voice controls.

### IrisTools.jsx (182 lines)
Reads useAppStore (setShowVpnBrowser, setVpnBrowserUrl) and useThemeStore (glassOpacity). 12 tools from irisToolsData.js. Navigation returns from tool execute.

### IrisNews.jsx (197 lines)
Reads usePowerStore. Fetches Hacker News (Firebase API) + BBC RSS (World, Tech). Auto-refresh interval.

### Terminal.jsx (219 lines)
Full terminal with 40 commands, boot sequence animation, particle canvas, glow effect, tab completion, command history (localStorage: `iris_terminal_history`), quick command buttons.

### Widgets.jsx (232 lines)
8 widget types: Performance, Weather, Stock, Media, Tasks, Ping, Signal, Custom. WidgetConfig for add/remove. CyberSynth audio engine. localStorage persistence for widget IDs, tasks, weather city, media mode.

### PrivateVault.jsx (171 lines)
Encrypted photo gallery from `silent_captures/` directory. Filesystem API for load/delete/download. Batch loading (20 at a time).

### VpnBrowser.jsx (48 lines)
Native WebView overlay. Opens via IrisVpnBrowserPlugin → BrowserActivity.java.

---

## COMPONENTS (38 files, 4,439 lines)

### LauncherPlugin.js (671 lines) — Native Bridge (32 importers)
**Most imported module in the codebase.**

Exports 40+ async functions wrapping Capacitor native bridge:
- App management: `getInstalledApps`, `launchApp`, `uninstallApp`, `openAppSettings`, `requestDefaultLauncher`
- UI: `setFullscreen`, `expandNotificationPanel`
- Hardware: `toggleFlashlight`, `makeCall`, `setAlarm`, `setTimer`
- TTS: `speakTextNative`, `speakCartesiaNative`, `stopSpeakingNative`, `setVoiceSettingsNative`
- Audio: `playAudioFile`, `playAudioBase64`, `stopAudio`, `dispatchMediaKey`
- Notifications: `requestNotificationAccess`, `getActiveNotifications`, `dismissNotification`, `addNotificationListener`
- Security: `authenticateBiometric`, `setVaultPackages`
- System: `getSystemStats`, `getDeviceOemInfo`, `optimizeMemory`, `getSystemInfo`, `listProcesses`
- Network: `portScan`, `dnsLookup`, `whoisLookup`, `traceroute`, `sqlmapCheck`
- Browser: `startVpnBrowser`, `stopVpnBrowser`
- Permissions: `checkAndRequestPermission`, `requestStorageAccess`, `requestIgnoreBatteryOptimizations`
- Screen: `startScreenShare`, `stopScreenShare`, `captureSilentPhotos`
- Shell: `execCommand` (whitelisted, 40+ allowed commands)
- OEM: `openOemBatterySettings` (Samsung, Xiaomi, Huawei, Oppo, Vivo, OnePlus)
- Media: `speakTextNative` (Android TTS), `playAudioFile`, `dispatchMediaKey`

### ChronoPinLock.jsx (311 lines) — Vault Lock Screen
Time-based PIN (HHMM format) + biometric. Threat photo capture on failed auth. Animated clock dial, diagnostic log console.

### OfflineAssistantOverlay.jsx (391 lines) — Offline Assistant
Full offline voice assistant with IrisVisualizer orb, audio frequency canvas, speech recognition retry loop (up to 10 retries), multi-turn command context handling.

### InteractiveWallpaper.jsx (222 lines) — Canvas Wallpaper
3 modes: MATRIX (green rain), CYBER_GRID (perspective grid), NEON_PARTICLES (bouncing particles with mouse gravity). 24fps throttle off-home.

### DrawerRing.jsx (339 lines) — 3D Sphere Layout
Fibonacci sphere distribution, drag rotation, pinch zoom, A-Z filter bar, icon image caching, requestAnimationFrame render loop.

### Other notable components:
- **TopAppBar.jsx** (103 lines): Clock, battery, network status. Polling via PowerSaveManager.
- **FolderModal.jsx** (194 lines): Folder view/edit with app checklist.
- **HomeGrid.jsx** (92 lines): 3D-tilted app grid with perspective transforms.
- **ArcSearch.jsx** (136 lines): Global search with apps, files, web, LLM options.
- **GlobeVisualizer.jsx** (125 lines): 3D wireframe globe with aurora bands.
- **RagEngine.js** (151 lines): TF-IDF local file search engine.
- **CyberSynth.js** (120 lines): Web Audio ambient synth (sub-bass + LFO + arpeggiator).
- **FileExplorer.jsx** (302 lines): Virtual filesystem with drag-drop upload.
- **StockChart.jsx** (294 lines): Dual-ticker SVG chart with hover crosshair.

---

## SETTINGS SECTIONS (16 files, 698 lines)

| Section | Controls | Key Settings |
|---------|----------|--------------|
| WallpaperThemeSection | Theme color (6), wallpaper (5), custom upload, live wallpaper (4) | themeColor, wallpaper, custom_wallpaper, activeLiveWallpaper |
| ApiKeysSection | 4 API key inputs, test buttons, save/wipe | geminiKey, groqKey, nvidiaKey, cartesiaKey |
| LayoutConfigSection | DPI, grid cols/rows, icon/text scale, layout style, drawer layout | dpiScale, gridColumns, gridRows, homeIconSize, drawerIconSize, drawerTextSize, homeTextSize, drawerLayout |
| AppIconsSection | Per-app icon, icon pack ZIP upload | installedApps icons |
| TransitionsSection | Icon theme (5), transition effect (6), easing (3), speed slider | globalIconTheme, pageTransitionEffect, pageTransitionSpeed |
| LLMBackendSection | Backend selector (4), Gemini model variant | llmBackend, geminiModel |
| VoiceSettingsSection | Pitch, rate sliders, test button | voicePitch, voiceRate |
| NeuralSkillsSection | TTS toggle, drawer search toggle | assistant_tts_enabled (raw LS), showDrawerSearch |
| TweaksSection | Glass opacity, labels, 24h clock, fullscreen, home orb | glassOpacity, showAppLabels, use24HourClock, fullscreenActive, showHomeOrb |
| LauncherEngineSection | Set as default launcher | requestDefaultLauncher() |
| PowerSaveSection | Mode selector (4), feature display | powerSaveMode |
| FactoryResetSection | Factory reset with confirmation | resetToDefaults() |
| VaultLockSection | Lock vault, auto-lock timeout (4 options) | vault_auto_lock (raw LS) |
| AboutSection | App info, device info | APP_VERSION, device OEM |

---

## NATIVE JAVA FILES (9 files, 3,558 lines)

### LauncherPlugin.java (2,570 lines) — Main Native Plugin
- 64 @PluginMethod methods
- TTS engine with UtteranceProgressListener
- SpeechRecognizer with partial results
- MediaPlayer for audio playback
- Port scanner (TCP connect, 50 threads, CountDownLatch)
- Whois via RDAP API
- SQL injection tester (10 payloads, 18 error patterns)
- Shell execution (whitelisted, 40+ commands, 10s timeout)
- Icon extraction (64x64 PNG base64) with file cache
- BiometricPrompt integration
- Camera2 API for silent photo capture
- Screen capture via MediaProjection + ImageReader
- OEM battery settings (6 manufacturers)
- Notification management via IrisNotificationListenerService

### MainActivity.java (158 lines)
Registers plugins, starts keepalive, requests battery optimization, sets 120Hz refresh rate, immersive fullscreen, display cutout mode.

### BrowserActivity.java (240 lines)
Native WebView with dark theme, programmatic layout, "INCOGNITO" label, progress bar, back/refresh buttons. Launched by IrisVpnBrowserPlugin.

### IrisKeepAliveService.java (133 lines)
Foreground service with PARTIAL_WAKE_LOCK (5min timeout, reacquires on restart), IMPORTANCE_MIN notification, auto-restart on task removed.

### IrisNotificationListenerService.java (107 lines)
Intercepts notifications, filters vault packages, broadcasts updates to LauncherPlugin.

### IrisScreenCaptureService.java (209 lines)
MediaProjection + ImageReader capture at 1fps, JPEG quality 40, base64 frame forwarding.

### SilentCameraHelper.java (200 lines)
Camera2 API for front+back silent capture, 8s timeout, CountDownLatch.

### IrisVpnBrowserPlugin.java (42 lines)
Launches BrowserActivity with URL. No actual VPN.

### BootReceiver.java (31 lines)
Starts IrisKeepAliveService on boot.

---

## TERMINAL (40 commands, 589 lines)

| Category | Commands |
|----------|----------|
| System | `help`, `clear`, `diagnostic`, `whoami`, `date`, `uptime`, `id` |
| Files | `ls`, `cat`, `mkdir`, `write`, `rm`, `cp`, `mv`, `touch` |
| Process | `ps`, `top`, `kill` |
| Disk | `df`, `du` |
| Memory | `free` |
| Network | `ifconfig`/`ip`, `ping`, `nmap`, `dns`, `whois`, `traceroute`, `sqlmap` |
| System Info | `uname`, `chmod` |
| AI | `search` (Wikipedia), `weather` (Open-Meteo), `build` (GSAP card), `consult oracle` (RAG) |
| UI | `vault` (chrono lock), `mobile` (sync portal), `hack` (mock), `ingest codebase` (mock) |
| Scripting | `sh <path>` (run shell script from virtual FS) |
| History | `history` (handled inline) |

All commands route through `LauncherPlugin.execCommand()` (whitelisted) or Capacitor Filesystem.

---

## IRIS TOOLS (12 tools, 118 lines)

| Tool | Type | Implementation |
|------|------|----------------|
| pw_gen | Local | `crypto.getRandomValues()` + Fisher-Yates shuffle |
| hash_gen | Local | `crypto.subtle.digest()` SHA-256/SHA-1 |
| crypto | Local | `btoa`/`atob` + `encodeURIComponent` |
| ip_info | API | `ipinfo.io` + `ip-api.com` fallback |
| censys | Browser | Opens `search.censys.io` in native WebView |
| shodan | Browser | Opens `shodan.io` |
| virustotal | Browser | Opens `virustotal.com` |
| exploitdb | Browser | Opens `exploit-db.com` |
| cve | Browser | Opens `cve.circl.lu` |
| chrono_key | Navigation | Returns `{navigate: 'chrono_lock'}` |
| iris_vault | Navigation | Returns `{navigate: 'vault'}` |
| private_vault | Navigation | Returns `{navigate: 'chrono_lock', target: 'private'}` |

---

## CONFIG FILES

### package.json
16 dependencies: Capacitor 8 (android, app, browser, camera, core, device, filesystem, geolocation, local-notifications, preferences), capacitor-native-biometric, piper-tts-web, convert-units, jszip, onnxruntime-web, react 18, react-dom, rivescript, zustand 5.

### vite.config.js
React plugin, polyfills for `process.env`/`process.platform`/`global`, ES module workers.

### tailwind.config.js
Dark mode class, 53 MD3 colors, custom fonts (JetBrains Mono, Inter), custom spacing.

### capacitor.config.json
App ID `com.stitch.iris.launcher`, HTTPS scheme, CapacitorHttp enabled, dark keyboard.

### index.html
Loads Inter, JetBrains Mono, Material Symbols Outlined. Process polyfill. Entry: `/src/main.jsx`.

---

## DATA FLOW MAP

```
App.jsx (reads all 6 stores)
├── useVoiceEngine ←→ useAIBackend (bidirectional bridge)
│   ├── useVoiceEngine: SpeechRecognition → submitPrompt → useAIBackend
│   └── useAIBackend: response → speakText → useVoiceEngine
├── useAppEffects (lifecycle, timers, native events)
├── useAppGestures (swipe/long-press)
├── useThemeVars (CSS vars)
├── usePageRouter (navigation)
│
├── Home.jsx (20 props from App)
│   ├── HomeGrid → HudIcon → IRIS_ICON_PACK
│   ├── HomeClockBanner
│   ├── OfflineAssistantOverlay (React.lazy)
│   │   ├── useOfflineTTS (Piper Worker)
│   │   └── useOfflineDispatch (voice commands)
│   └── AppContextMenu → useAppContextMenu
│
├── Drawer.jsx (17 props from App)
│   ├── DrawerGrid/List/Ring/Categories
│   ├── FolderModal
│   └── AppContextMenu → useAppContextMenu
│
├── Settings.jsx (48 props from App)
│   └── 14 SettingsSection components
│
├── Assistant.jsx (reads aiStore + assistantStore directly)
│   ├── SessionSidebar, EngineModelBar
│   ├── ChatMessage, GlobeVisualizer
│   └── OllamaManager, DiagnosticsTerminal
│
├── IrisTools.jsx (reads useAppStore + useThemeStore)
│   └── ToolResultDisplay
│
├── Terminal.jsx (reads usePowerStore)
│   ├── commands.js → LauncherPlugin (native)
│   ├── MobileSync
│   └── AnimatedCardBuilder
│
├── Widgets.jsx
│   ├── 8 widget components
│   └── CyberSynth (Web Audio)
│
└── ChronoPinLock → ChronoClockDial + PinKeypad
```

---

## NATIVE BRIDGE MAP

```
JS (LauncherPlugin.js) → Capacitor Bridge → Java (LauncherPlugin.java)
├── App management → PackageManager
├── TTS → android.speech.tts.TextToSpeech
├── Speech → android.speech.SpeechRecognizer
├── Camera → Camera2 API (SilentCameraHelper)
├── Screen → MediaProjection + ImageReader (IrisScreenCaptureService)
├── Notifications → IrisNotificationListenerService
├── Biometric → BiometricPrompt
├── Flashlight → CameraManager
├── Contacts → ContactsContract
├── Shell → Runtime.exec (whitelisted)
├── Network → Socket + InetAddress
├── WebView → BrowserActivity (IrisVpnBrowserPlugin)
└── KeepAlive → IrisKeepAliveService + BootReceiver
```

---

## ALL localStorage KEYS (33 unique)

**appStore (2):** `iris_setup_complete`, `iris_locked_apps`
**appsStore (2):** `installed_apps`, `iris_custom_folders`
**themeStore (22):** `theme_color`, `glass_opacity`, `wallpaper`, `custom_wallpaper`, `dpi_scale`, `grid_columns`, `grid_rows`, `home_icon_size`, `home_text_size`, `drawer_icon_size`, `drawer_text_size`, `layout_style`, `show_app_labels`, `show_drawer_search`, `show_home_orb`, `iris_use_24h_clock`, `global_icon_theme`, `active_live_wallpaper`, `fullscreen_active`, `drawer_layout`, `page_transition_effect`, `iris_page_transition_speed`, `page_transition_easing`
**aiStore (5):** `system_llm_backend`, `gemini_model`, `iris_voice_enabled`, `iris_voice_pitch`, `iris_voice_rate`
**assistantStore (1):** `iris_assistant_sessions`
**Other raw LS:** `iris_terminal_history`, `iris_weather_city`, `iris_weather_lat`, `iris_weather_lon`, `iris_day_tasks`, `iris_active_widgets`, `iris_custom_widgets`, `iris_media_player_mode`, `iris_selected_system_player`, `vault_auto_lock`, `assistant_tts_enabled`, `cartesia_voice_id`, `iris_oem_battery_prompted`, `iris_camera_consent`, `iris_cached_weather_string`, `iris_system_prompt`, `iris_virtual_fs`, `iris_has_nvidia_key`, `iris_has_hf_key`

**SecureStorage keys (5):** `gemini_api_key`, `groq_api_key`, `nvidia_api_key`, `huggingface_api_key`, `cartesia_api_key`

---

## KNOWN ISSUES

- **Settings prop drilling**: Settings.jsx receives 48 props from App.jsx — architectural, acceptable for now
- **StockChart (294 lines)**: Just under 300-line limit, acceptable

---

## FIXES APPLIED (v4.6.0 audit pass)

| # | Issue | Fix |
|---|-------|-----|
| 1 | Version mismatch `4.5.0` in constants.js | Updated to `4.6.0` |
| 2 | Dead code: `logger.js`, `timing.js`, `iris.rive`, `CameraConsent.jsx` | Deleted all 4 files |
| 3 | Dead import: `Preferences` in OfflineCommandEngine.js | Removed unused import |
| 4 | Cross-store conflict: `system_llm_backend` written by both aiStore and assistantStore | `assistantStore.setLiveSetupEngine` no longer writes to localStorage (aiStore is single source of truth) |
| 5 | RiveScript one-shot bug: `rs = null` after first `processCommand()` | Removed rs=null so engine persists across calls |
| 6 | `window.open` in offlineSideEffects `search_web` | Replaced with `LauncherPlugin.execCommand('am start -a android.intent.action.VIEW -d ...')` |
| 7 | Duplicated helpers: `getLS`/`getLSNum`/`getLSBool` in 3 stores | Extracted to `src/utils/storage.js`, all stores import from shared util |
| 8 | Levenshtein recomputed on every call in useOfflineDispatch | Moved to module-level with LRU cache (200 entries, auto-clear) |
| 9 | Components over 300 lines | Extracted: `AssistantStatusPanel`, `LetterFilterBar`, `ThreatPhotoCapture`, `PermissionsStep`, `FileCreator` |
| 10 | FileExplorer dead state variables | Removed unused `newFileName`/`newFileContent` state and `handleCreateFile` function |
| 11 | KeepAlive WakeLock held 30min draining battery | Reduced to 5min, reacquires on restart |
| 12 | KeepAlive polling every 30-60s wasting power | Increased to 300s (5min), skips when document hidden |
| 13 | Task check polling runs when backgrounded | Only runs when document is visible |
