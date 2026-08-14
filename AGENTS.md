# AGENTS.md — IRIS Cybernetic AI Launcher

## Build & Run
```bash
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Build for production
npm run lint         # ESLint on src/ (.js,.jsx)
npm run deploy:android  # Build + sync + compile APK
```

## ADB Path
```
$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe
```

## Project Info
- **Version**: 4.9.9
- **App ID**: com.stitch.iris.launcher
- **Platform**: Android (Capacitor 8)
- **Stack**: React 18, Zustand 5, Tailwind 3, Vite 5
- **Native**: 16 Java files under `android/app/src/main/java/com/stitch/iris/launcher/`
- **Future Roadmap**: See [`FUTURE_ROADMAP.md`](file:///c:/Users/Oz/Desktop/Projects/Iris-ai-launcher-main/FUTURE_ROADMAP.md) for approved future upgrades (Kokoro-82M TTS, On-Device SLM, Vision Assistant, IRIS Security Suite, Gyro 3D).

## Code Style
- Functional components with hooks
- Zustand stores for shared state
- `useCallback`/`useMemo` for expensive computations
- TailwindCSS utility classes
- Components under 300 lines (hooks/utils have more slack)
- No comments unless asked
- No emojis unless asked
- ESLint: `eslint:recommended` + `plugin:react/recommended` + `plugin:react-hooks/recommended`; `no-console` allows warn/error, `no-empty` allows empty catches

---

## PROJECT STRUCTURE (142 JS/JSX files, ~19,300 lines)

```
src/
├── main.jsx                    (98 lines)   Entry point
├── App.jsx                     (247 lines)  Root router, all props from stores
├── ErrorBoundary.jsx           (55 lines)   Error boundary
├── index.css                   (662 lines)  Tailwind + custom CSS
├── stores/                                 Zustand state (8 files, 625 lines)
│   ├── themeStore.js           (136 lines)  Visual settings with persistence
│   ├── assistantStore.js       (129 lines)  Chat sessions, live voice, text prompt
│   ├── appsStore.js            (123 lines)  Installed apps, custom folders, hidden apps
│   ├── appListRepository.js    (67 lines)   Derived app list (hidden filtering) from appsStore
│   ├── appStore.js             (55 lines)   App state: activePage, vault, chronoLock
│   ├── badgeStore.js           (55 lines)   Notification badge state
│   ├── aiStore.js              (45 lines)   API keys, LLM backend, voice settings
│   └── powerStore.js           (15 lines)   Power save mode (delegates to PowerSaveManager)
├── hooks/                                 Custom hooks (12 files, 2,680 lines)
│   ├── useDrawerMeshEngine.js  (574 lines)  DrawerMesh 3D sphere engine + render loop
│   ├── useAIBackend.js         (402 lines)  AI inference (5 backends) + RAG + search
│   ├── useOfflineAssistantCommand.js (318)  Offline assistant command state machine
│   ├── useVoiceEngine.js       (314 lines)  Speech recognition + TTS pipeline
│   ├── useOfflineDispatch.js   (254 lines)  Offline voice command dispatch (8 actions)
│   ├── useOfflineTTS.js        (242 lines)  Piper TTS Web Worker + audio pipeline
│   ├── useAppGestures.js       (202 lines)  Swipe/long-press gesture detection
│   ├── useStockData.js         (133 lines)  Binance + Yahoo Finance live data
│   ├── useAppEffects.js        (126 lines)  App lifecycle, fullscreen, vault auto-lock
│   ├── useAppContextMenu.js    (61 lines)   Long-press context menu
│   ├── useThemeVars.js         (29 lines)   CSS custom property injection
│   └── usePageRouter.js        (25 lines)   Navigation helpers
├── utils/                                 Utilities (21 files, 3,316 lines)
│   ├── OfflineCommandEngine.js (456 lines)  RiveScript + 31 regex command matchers
│   ├── SearchViewModel.js      (403 lines)  App/file search view model
│   ├── offlineSideEffects.js   (350 lines)  18 side effect handlers (timer, notes, weather)
│   ├── PermissionManager.js    (298 lines)  Runtime permission rationales/list/degradation
│   ├── PowerSaveManager.js     (230 lines)  Singleton, 4 tiers, 21 features per tier
│   ├── WallpaperManager.js     (183 lines)  Wallpaper + live wallpaper management
│   ├── BackupManager.js        (182 lines)  Local backup/restore (localStorage + Preferences)
│   ├── MaterialYou.js          (159 lines)  Material You color extraction
│   ├── secureStorage.js        (156 lines)  AES-GCM encryption via Web Crypto API
│   ├── ThemePresets.js         (156 lines)  Preset theme palettes
│   ├── DataStore.js            (156 lines)  Key/value data access layer
│   ├── AIProviderManager.js    (129 lines)  LLM provider registry (Gemini/Groq/NVIDIA/HF/Ollama)
│   ├── safeMath.js             (126 lines)  eval-free math expression parser (calculator)
│   ├── weather.js              (77 lines)   Open-Meteo API, WMO code mapping
│   ├── IrisIconPack.jsx        (75 lines)   13 custom sci-fi SVG icons
│   ├── aiQueryBridge.js        (70 lines)   Shared LLM query helper (SSE, Gemini header auth)
│   ├── IconShapeMask.js        (48 lines)   Adaptive icon shape masking
│   ├── HapticFeedback.js       (37 lines)   Vibration/haptic helpers
│   ├── storage.js              (14 lines)   Shared getLS/getLSNum/getLSBool helpers
│   ├── appClickRouter.js       (8 lines)    Route app clicks (path vs native)
│   └── constants.js            (3 lines)    BUILTIN_APPS=[], APP_VERSION='4.8.7'
├── components/                             Reusable UI (51 files, 7,361 lines)
│   ├── LauncherPlugin.js       (791 lines)  Native bridge wrapper (40+ functions)
│   ├── ChronoPinLock.jsx       (366 lines)  Vault lock (time-based PIN + biometric)
│   ├── TopAppBar.jsx           (350 lines)  Status bar (clock, battery, network)
│   ├── ArcSearch.jsx           (336 lines)  Global search (apps, files, web, LLM)
│   ├── StockChart.jsx          (319 lines)  Dual-ticker SVG chart
│   ├── SetupWizard.jsx         (300 lines)  First-run 4-step wizard
│   ├── OfflineAssistantOverlay.jsx (287)    Offline voice assistant overlay
│   ├── ZeroScreen.jsx          (277 lines)  Daily briefing (weather, AI, quotes)
│   ├── InteractiveWallpaper.jsx(276 lines)  Canvas wallpaper (Matrix/CyberGrid/Neon)
│   ├── FileExplorer.jsx        (276 lines)  Virtual filesystem with drag-drop
│   ├── BottomNavBar.jsx        (273 lines)  5-tab bottom navigation
│   ├── HomeScreenWidgetHost.jsx(238 lines)  Home screen widget host
│   ├── CommandReference.jsx    (209 lines)  Command reference sheet
│   ├── FolderModal.jsx         (200 lines)  Folder view/edit modal
│   ├── RecentsOverlay.jsx      (183 lines)  Recents/task switcher overlay
│   ├── ThreatDashboard.jsx     (180 lines)  Threat monitoring dashboard
│   ├── RagEngine.js            (171 lines)  TF-IDF local file search
│   ├── FeatureTour.jsx         (169 lines)  First-run feature tour
│   ├── HomeScreenFolder.jsx    (158 lines)  Home screen folder widget
│   ├── BuiltInWidgets.jsx      (158 lines)  Built-in widget gallery
│   ├── CyberSynth.js           (152 lines)  Web Audio ambient synth engine
│   ├── TaskAlarmOverlay.jsx    (136 lines)  Task reminder with alert tone
│   ├── ThreatLogs.jsx          (129 lines)  Security threat photo gallery
│   ├── GracefulDegradation.jsx (128 lines)  Feature availability fallbacks
│   ├── ToolResultDisplay.jsx   (100 lines)  Tool result renderer (IP, pw, hash, crypto)
│   ├── HomeGrid.jsx            (96 lines)   3D-tilted home screen app grid
│   ├── AppContextMenu.jsx      (90 lines)   Long-press context menu
│   ├── HomePager.jsx           (89 lines)   Home screen page pager
│   ├── PinnedContacts.jsx      (64 lines)   Pinned contacts drawer
│   ├── VaultExplorer.jsx       (63 lines)   Vault tabs (Files, Apps, Threats)
│   ├── LiveConfigModal.jsx     (52 lines)   AI engine config for live voice
│   ├── AssistantStatusPanel.jsx(50 lines)   Offline assistant status text + audio canvas
│   ├── GenAIPlugin.js          (49 lines)   On-device speech recognizer bridge
│   ├── PermissionsStep.jsx     (45 lines)   Setup wizard permissions step
│   ├── ChronoClockDial.jsx     (44 lines)   Animated clock dial
│   ├── ProviderBadge.jsx       (43 lines)   LLM provider badge
│   ├── FileCreator.jsx         (43 lines)   File explorer new file form
│   ├── PinKeypad.jsx           (40 lines)   Numeric PIN input
│   ├── KeystorePlugin.js       (39 lines)   Keystore bridge wrapper
│   ├── HudFallbackIcon.jsx     (17 lines)   Cyan-filtered icon fallback
│   ├── HudIcon.jsx             (13 lines)   IRIS icon pack renderer
│   ├── ThreatPhotoCapture.jsx  (10 lines)   Threat photo capture status badge
│   ├── LiveVoiceFAB.jsx        (8 lines)    Floating voice button
│   └── drawer/                              Drawer layouts (8 files)
│       ├── DrawerCategories.jsx(91 lines)   Category/folder cards
│       ├── DrawerList.jsx      (63 lines)   Vertical list layout
│       ├── drawerMeshUtils.js  (39 lines)   Cluster building + color helpers
│       ├── DrawerGrid.jsx      (38 lines)   Grid layout
│       ├── DrawerIcon.jsx      (37 lines)   Single app icon renderer
│       ├── DrawerMesh.jsx      (31 lines)   3D sphere layout (engine in hook)
│       ├── LetterFilterBar.jsx (28 lines)   A-Z filter bar
│       └── drawerMeshData.js   (17 lines)   HUD_SVG_PATHS + HUD_COLOR
├── pages/                                 Page components (43 files, 4,620 lines)
│   ├── Drawer.jsx              (381 lines)  App drawer, 4 layouts, search, folders
│   ├── Assistant.jsx           (336 lines)  AI chat interface
│   ├── Widgets.jsx             (318 lines)  Widget dashboard (10 widget types)
│   ├── Home.jsx                (281 lines)  Home screen with orb, weather, battery
│   ├── IrisTools.jsx           (231 lines)  12 cybersecurity tools
│   ├── PrivateVault.jsx        (217 lines)  Encrypted photo gallery
│   ├── Settings.jsx            (101 lines)  Settings page (48 props from App)
│   └── VpnBrowser.jsx          (53 lines)   Native WebView browser overlay
│   ├── settings/                           Settings sections (21 files)
│   │   ├── WallpaperThemeSection.jsx (218) Theme + wallpaper + live wallpaper
│   │   ├── GestureSettingsSection.jsx (190) Gesture configuration
│   │   ├── BackupRestoreSection.jsx (138)  Local backup/restore
│   │   ├── AdvancedSection.jsx  (110 lines) Advanced options
│   │   ├── AppIconsSection.jsx  (106 lines) Per-app icon customization
│   │   ├── LayoutConfigSection.jsx (89)    DPI, grid, icon/text scale
│   │   ├── AppLockSection.jsx   (87 lines)  App locking
│   │   ├── AboutSection.jsx     (86 lines)  App info
│   │   ├── ApiKeysSection.jsx   (84 lines)  API key management (header auth)
│   │   ├── SettingControls.jsx  (75 lines)  Toggle, Slider, OptionGrid
│   │   ├── LLMBackendSection.jsx(65 lines)  Backend + Gemini model selector
│   │   ├── VaultLockSection.jsx (51 lines)  Vault lock + auto-lock
│   │   ├── PowerSaveSection.jsx (50 lines)  Power save mode selector
│   │   ├── TransitionsSection.jsx (48)     Transitions + icon theme
│   │   ├── VoiceSettingsSection.jsx (39)   Voice pitch + rate
│   │   ├── FactoryResetSection.jsx (39)    Factory reset
│   │   ├── LauncherEngineSection.jsx (32)  Set as default launcher
│   │   ├── SettingsSection.jsx  (27 lines)  Accordion wrapper
│   │   ├── TweaksSection.jsx    (24 lines)  Glass opacity, labels, 24h, fullscreen
│   │   └── NeuralSkillsSection.jsx (16)    TTS toggle + drawer search
│   ├── assistant/                          Assistant sub-components (5 files)
│   │   ├── OllamaManager.jsx    (159 lines) Ollama model manager
│   │   ├── DiagnosticsTerminal.jsx (140)   System diagnostics
│   │   ├── EngineModelBar.jsx   (84 lines)  Backend/model selector bar
│   │   ├── ChatMessage.jsx      (52 lines)  Chat message component
│   │   └── SessionSidebar.jsx   (44 lines)  Session list sidebar
│   └── widgets/                            Widget components (10 files)
│       ├── MediaWidget.jsx      (154 lines) Media player widget
│       ├── WidgetConfig.jsx     (121 lines) Widget workshop manager
│       ├── SignalWidget.jsx     (88 lines)  Battery/signal/RAM bars
│       ├── PerformanceWidget.jsx(85 lines)  Battery, memory, CPU temp
│       ├── WeatherWidget.jsx    (74 lines)  Weather station display
│       ├── TasksWidget.jsx      (58 lines)  Day task manager
│       ├── CustomWidget.jsx     (28 lines)  User-created widget
│       ├── PingWidget.jsx       (23 lines)  Network latency tester
│       ├── StockWidget.jsx      (11 lines)  Stock chart wrapper
│       └── RemoveButton.jsx     (7 lines)   Close button
├── tools/                                  IRIS Tools data (1 file, 137 lines)
│   └── irisToolsData.js         (137 lines) 12 tool definitions
├── data/                                   Data files (2 files, 140 lines)
│   ├── stockData.js             (83 lines)  9 mock stock/crypto entries
│   └── oemData.js               (57 lines)  11 OEM battery optimization instructions
├── workers/                                Web Workers (1 file, 66 lines)
│   └── piperWorker.js           (66 lines)  Piper TTS Web Worker
└── rivescript/                             RiveScript files (3 files)
    ├── brain.rive, personality/begin.rive, personality/eliza.rive
```

---

## ZUSTAND STORES (8 stores, 625 lines)

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

### appsStore.js — Installed Apps + Hidden Apps
| Field | Type | Default | Persisted |
|-------|------|---------|-----------|
| `installedApps` | Object[] | `loadApps()` | `installed_apps` |
| `hiddenApps` | string[] | `loadHidden()` | `iris_hidden_apps` |

Key actions: `setInstalledApps`, `mergeNativeApps` (dedupes by packageId, filters IRIS packages), `loadNativeApps` (calls native `getInstalledApps()`), `setHiddenApp(packageId, hidden)` (single source of truth for hidden apps), `resetToDefaults`.

### appListRepository.js — Derived App List
Reads `useAppsStore.getState()` for installed + hidden apps; `hideApp`/`unhideApp` delegate to `appsStore.setHiddenApp`. Consumed by app list UI.

### themeStore.js — Visual Settings
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

### badgeStore.js — Notification Badges
Tracks unread notification badge counts per app.

---

## HOOKS (12 files, 2,680 lines)

### useVoiceEngine.js (314 lines) — Speech Recognition + TTS
**Bridge hook**: connects useAIBackend via `setSubmitPrompt(submitPrompt, isGeneratingRef, abortControllerRef)`.

**Module-level singleton**: `recognition` (SpeechRecognition instance, created at import).

**TTS pipeline** (speakText): Cartesia TTS (native or web) → native Android TTS → browser SpeechSynthesis.

**Refs**: `submitPromptRef`, `backendIsGeneratingRef`, `backendAbortRef`, `lastTtsTextRef`, `isListeningRef`, `isLiveVoiceRef`, `isSpeakingRef`, `finishSpeakingTimerRef`, `mountedRef`.

**useCallbacks**: `startVoiceInput`, `stopVoiceInput`, `speakText`, `stopSpeaking`, `handleOpenLiveMode`, `handleExitLiveModeOnly`, `handleStopLiveModeCompletely`, `isLiveConfigured`, `handleEngageLiveClick`, `handleSaveLiveConfig`, `setSubmitPrompt`, `submitPrompt`.

### useAIBackend.js (402 lines) — AI Inference
**Constructor**: `speakTextFn` (from useVoiceEngine).

**5 backends**: GEMINI (SSE), GROQ (SSE), NVIDIA (SSE), HUGGINGFACE (SSE), OLLAMA (non-streaming). Gemini keys sent via `x-goog-api-key` header (never URL).

**Inner functions**: `fetchWebSearch(query)` (DuckDuckGo + Wikipedia), `streamSSE(res, loadingId)` (SSE parser).

**SEARCH_KEYWORDS**: 35+ keywords triggering web search.

### useOfflineAssistantCommand.js (318 lines) — Offline Command State Machine
Extracted `handleCommand` + `handleWeather` + `handleNotifications` from OfflineAssistantOverlay. Handles WAITING_FOR_* multi-turn contexts, IRIS AI queries, conversation memory, side effects, and command dispatch.

### useOfflineTTS.js (242 lines) — Piper TTS Web Worker
Manages Piper Web Worker lifecycle, audio queue, AudioContext + AnalyserNode, visualizer animation loop, 30s idle cleanup timer.

### useOfflineDispatch.js (254 lines) — Offline Voice Commands
8 actions: `open` (Levenshtein fuzzy match), `close_overlay`, `uninstall`, `app_info`, `call` (contact lookup), `timer`, `alarm`.

### useDrawerMeshEngine.js (574 lines) — DrawerMesh Engine
Fibonacci sphere distribution, drag rotation, pinch zoom, A-Z filter, icon caching, requestAnimationFrame render loop. Backs `drawer/DrawerMesh.jsx`.

### useAppEffects.js (126 lines) — App Lifecycle
7 useEffects: vault package sync, fullscreen+backButton+appStateChange, keepAlive polling, task alarm polling, vault auto-lock, task state events, notification interception.

### useAppGestures.js (202 lines) — Swipe/Long-Press
Swipe right → home, swipe left → iris_news, swipe up → drawer, swipe down → notification panel, long-press → ArcSearch.

### useAppContextMenu.js (61 lines) — Context Menu
`handleContextMenu`, `handleLockApp`, `handleTriggerUninstall`, `handleOpenAppInfo`. Used by Home.jsx and Drawer.jsx.

### useThemeVars.js (29 lines) — CSS Variables
Sets `--primary-rgb`, `--primary-color`, `--primary-color-secondary`, `--glass-opacity` on `document.documentElement`.

### usePageRouter.js (25 lines) — Navigation
`handleLaunchApp(app)`, `handleTriggerVault()`, `handleTriggerChronoLock(t)`.

### useStockData.js (133 lines) — Live Market Data
Fetches from Binance API (crypto) and Yahoo Finance via allorigins proxy (stocks).

---

## UTILITIES (21 files, 3,316 lines)

### secureStorage.js (156 lines) — AES-GCM Encryption
- Key stored in IndexedDB (`IrisSecureDB`), **non-extractable** (`extractable: false`)
- `setItem(key, value)`: encrypts with AES-GCM-256, stores in localStorage as `iris_enc_{key}`
- `getItem(key)`: reads from localStorage, decrypts
- `migrateAll()`: auto-encrypts plaintext API keys
- Special cases: `nvidia_api_key` and `huggingface_api_key` also set boolean flags `iris_has_nvidia_key`/`iris_has_hf_key`

### PowerSaveManager.js (230 lines) — Power Save Singleton
- 4 modes: AUTO, HIGH, MEDIUM, LOW
- 21 features per tier: use3DOrb, useWallpaper, particleCanvas, backdropBlur, pageTransitions, liveWidgetUpdates, backgroundNotifications, animatedIcons, gridAnimations, batteryPollMs, weatherPollMs, widgetMetricsPollMs, clockPollMs, networkPollMs, keepAlivePollMs, taskCheckPollMs, terminalNetPollMs, wallpaperFps, iconDecodeSize, deferredPiperInit, maxRenderItems
- `detectDeviceTier()`: reads `navigator.deviceMemory` and `navigator.hardwareConcurrency`
- `getPollingInterval(key)`: returns ms value for current tier
- `shouldDisable(feature)`: checks if boolean feature is false
- **Battery optimized (v4.6.1)**: keepAlivePollMs=300s, taskCheckPollMs=120s, both skip when document hidden

### OfflineCommandEngine.js (456 lines) — Voice Command Engine
- 31 regex-based command matchers in `rules` array
- RiveScript integration for fallback responses (persistent engine — one-shot bug fixed)
- Unit conversion via `convert-units`
- RiveScript macros for flashlight, wifi, bluetooth, volume, battery, app launch, call, timer, alarm, weather, notes

### offlineSideEffects.js (350 lines) — Side Effect Handlers
18 actions: battery_result, contact_result, weather, notifications, notes_result, check_ram, check_temp, optimize_memory, toggle_flashlight, set_brightness, set_volume, open_settings, timer, sleep_mode, driving_mode, save_note, read_notes, clear_notes, delete_last_note, remind, search_web, stealth_capture.

### safeMath.js (126 lines) — Eval-Free Calculator
Tokenizer + recursive-descent parser. Used by ArcSearch calculator (replaces `eval()`).

### aiQueryBridge.js (70 lines) — Shared LLM Query
SSE streaming helper used by Assistant + offline overlay + terminal. Gemini auth via `x-goog-api-key` header.

### weather.js (77 lines) — Weather API
Open-Meteo API. WMO code mapping. Reads coordinates from localStorage.

### IrisIconPack.jsx (75 lines) — Custom Icons
13 sci-fi SVG icons for common Android packages.

### appClickRouter.js (8 lines)
If `app.path` exists → `onNavigate(app.path)`. Otherwise → `launchApp(app.packageId)`.

### constants.js (3 lines)
`BUILTIN_APPS = []` (empty), `APP_VERSION = '4.8.7'`.

---

## PAGES (8 root pages + subdirectories)

### App.jsx (247 lines) — Root Router
- Reads all 8 stores (massive prop surface)
- Instantiates useVoiceEngine, useAIBackend (with bridge), useAppGestures, useThemeVars, useAppEffects, usePageRouter
- Renders: TopAppBar, BottomNavBar, page switch, InteractiveWallpaper, ChronoPinLock, VaultExplorer, SetupWizard, ArcSearch, ZeroScreen, TaskAlarmOverlay, LiveVoiceFAB, LiveConfigModal, VpnBrowser, FeatureTour
- Lazy-loaded routes (`React.lazy`) for Home, Drawer, Assistant, Widgets, IrisTools, PrivateVault, Settings, VpnBrowser
- DPI scaling via CSS `zoom: dpiScale/100`
- Page transitions via CSS classes

### Home.jsx (281 lines)
Renders: HomeGrid, HomePager, HomeScreenWidgetHost, HomeScreenFolder, AppContextMenu, OfflineAssistantOverlay (React.lazy). Swipe gestures.

### Drawer.jsx (381 lines)
4 layouts: DrawerGrid, DrawerList, DrawerCategories, DrawerMesh. FolderModal for folder view/edit. Search, sort, category filters.

### Assistant.jsx (336 lines)
Reads aiStore and assistantStore directly. Renders SessionSidebar, EngineModelBar, OllamaManager, DiagnosticsTerminal, ChatMessage. Biometric lock, live voice controls.

### Settings.jsx (101 lines)
Props (48) — largest prop count. Passes all to 20 settings section components. Accordion behavior via `expandedSections` state.

### IrisTools.jsx (231 lines)
Reads useAppStore (setShowVpnBrowser, setVpnBrowserUrl) and useThemeStore (glassOpacity). 12 tools from irisToolsData.js. `ip_info` now uses HTTPS (`https://ip-api.com`).

### Widgets.jsx (318 lines)
10 widget types: Performance, Weather, Stock, Media, Tasks, Ping, Signal, Custom + built-ins. WidgetConfig for add/remove. CyberSynth audio engine. localStorage persistence.

### PrivateVault.jsx (217 lines)
Encrypted photo gallery from `silent_captures/` directory. Filesystem API for load/delete/download. Batch loading (20 at a time).

### VpnBrowser.jsx (53 lines)
Native WebView overlay. Opens via IrisVpnBrowserPlugin → BrowserActivity.java.

---

## COMPONENTS

### LauncherPlugin.js (791 lines) — Native Bridge
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
- Offline speech: `startOfflineSpeech`, `stopOfflineSpeech`, `onSpeechStatus`, `onSpeechPartial`

### ChronoPinLock.jsx (366 lines) — Vault Lock Screen
Time-based PIN (HHMM format) + biometric. Threat photo capture on failed auth. Animated clock dial, diagnostic log console.

### TopAppBar.jsx (350 lines) — Status Bar
Clock, battery, network status. Polling via PowerSaveManager.

### OfflineAssistantOverlay.jsx (287 lines) — Offline Assistant
Full offline voice assistant. Speech recognition retry loop (up to 10 retries), multi-turn command context handling. Command logic lives in `useOfflineAssistantCommand`.

### DrawerMesh (useDrawerMeshEngine.js + DrawerMesh.jsx) — 3D Sphere Layout
Fibonacci sphere distribution, drag rotation, pinch zoom, A-Z filter bar, icon image caching, requestAnimationFrame render loop.

---

## SETTINGS SECTIONS (21 files)

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
| BackupRestoreSection | Local backup/restore | BackupManager (localStorage + Preferences) |
| GestureSettingsSection | Gesture config | swipe/long-press bindings |
| AppLockSection | Per-app locking | lockedApps |
| AdvancedSection | Advanced options | misc |
| SettingControls | Reusable controls | Toggle, Slider, OptionGrid |

---

## NATIVE JAVA FILES (16 files, 5,316 lines)

### LauncherPlugin.java (3,083 lines) — Main Native Plugin
- 64+ @PluginMethod methods
- TTS engine with UtteranceProgressListener
- SpeechRecognizer with partial results + on-device recognizer
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
- Screenshot/window-change forwarding from IrisAccessibilityService via static `onScreenshotCaptured`/`onWindowChanged` + `notifyListeners`

### MainActivity.java (160 lines)
Registers plugins, starts keepalive, requests battery optimization, sets 120Hz refresh rate, immersive fullscreen, display cutout mode.

### BrowserActivity.java (243 lines)
Native WebView with dark theme, programmatic layout, "INCOGNITO" label, progress bar, back/refresh buttons. Launched by IrisVpnBrowserPlugin.

### IrisKeepAliveService.java (136 lines)
Foreground service with PARTIAL_WAKE_LOCK (5min timeout, reacquires on restart), IMPORTANCE_MIN notification, auto-restart on task removed.

### IrisNotificationListenerService.java (140 lines)
Intercepts notifications, filters vault packages, broadcasts updates to LauncherPlugin.

### IrisScreenCaptureService.java (209 lines)
MediaProjection + ImageReader capture at 1fps, JPEG quality 40, base64 frame forwarding.

### SilentCameraHelper.java (200 lines)
Camera2 API for front+back silent capture, 8s timeout, CountDownLatch.

### IrisVpnBrowserPlugin.java (42 lines)
Launches BrowserActivity with URL. No actual VPN.

### BootReceiver.java (31 lines)
Starts IrisKeepAliveService on boot.

### IrisAccessibilityService.java (145 lines)
Monitors window changes + takes screenshots; forwards to JS in-process (not via broadcast).

### IrisGenAIPlugin.java (291 lines)
On-device silent speech recognizer.

### IrisKeystorePlugin.java (117 lines)
Encrypted keystore for sensitive values.

### PermissionManager.java (292 lines)
Runtime permission rationales/list/degradation. No phantom permissions (READ_CALL_LOG removed).

### PackageChangeReceiver.java (98 lines)
Package install/uninstall events → app list refresh.

### LauncherTileService.java (53 lines)
Quick settings tile (keeps the launcher alive / shortcuts).

### IrisBackupAgent.java (76 lines)
Legacy backup agent. **Not referenced by the manifest** (`allowBackup="false"`).

---

## IRIS TOOLS (12 tools, 137 lines)

| Tool | Type | Implementation |
|------|------|----------------|
| pw_gen | Local | `crypto.getRandomValues()` + Fisher-Yates shuffle |
| hash_gen | Local | `crypto.subtle.digest()` SHA-256/SHA-1 |
| crypto | Local | `btoa`/`atob` + `encodeURIComponent` |
| ip_info | API | `ipinfo.io` + `ip-api.com` fallback (HTTPS) |
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
Dependencies (19): Capacitor 8 (android, app, camera, core, device, filesystem, geolocation, local-notifications, preferences), @capgo/capacitor-native-biometric, @mintplex-labs/piper-tts-web, convert-units, jszip, onnxruntime-web, react 18, react-dom, rivescript, zustand 5.
Scripts: `dev`, `build`, `preview`, `lint`, `deploy:android`, `postinstall: patch-package`.

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
App.jsx (reads all 8 stores)
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
│   ├── HomePager / HomeScreenWidgetHost / HomeScreenFolder
│   ├── OfflineAssistantOverlay (React.lazy)
│   │   ├── useOfflineTTS (Piper Worker)
│   │   ├── useOfflineDispatch (voice commands)
│   │   └── useOfflineAssistantCommand (state machine)
│   └── AppContextMenu → useAppContextMenu
│
├── Drawer.jsx (17 props from App)
│   ├── DrawerGrid/List/Categories/Mesh (useDrawerMeshEngine)
│   ├── FolderModal
│   └── AppContextMenu → useAppContextMenu
│
├── Settings.jsx (48 props from App)
│   └── 20 SettingsSection components
│
├── Assistant.jsx (reads aiStore + assistantStore directly)
│   ├── SessionSidebar, EngineModelBar
│   ├── ChatMessage
│   └── OllamaManager, DiagnosticsTerminal
│
├── IrisTools.jsx (reads useAppStore + useThemeStore)
│   └── ToolResultDisplay
│
├── Widgets.jsx
│   ├── 10 widget components
│   └── CyberSynth (Web Audio)
│
└── ChronoPinLock → ChronoClockDial + PinKeypad
```

---

## NATIVE BRIDGE MAP

```
JS (LauncherPlugin.js) → Capacitor Bridge → Java (LauncherPlugin.java)
├── App management → PackageManager (+ PackageChangeReceiver)
├── TTS → android.speech.tts.TextToSpeech
├── Speech → android.speech.SpeechRecognizer (+ IrisGenAPIPlugin on-device)
├── Camera → Camera2 API (SilentCameraHelper)
├── Screen → MediaProjection + ImageReader (IrisScreenCaptureService)
├── Notifications → IrisNotificationListenerService
├── Biometric → BiometricPrompt
├── Flashlight → CameraManager
├── Contacts → ContactsContract
├── Shell → Runtime.exec (whitelisted)
├── Network → Socket + InetAddress
├── WebView → BrowserActivity (IrisVpnBrowserPlugin)
├── Keystore → IrisKeystorePlugin
├── Accessibility → IrisAccessibilityService (screenshots, window changes)
└── KeepAlive → IrisKeepAliveService + BootReceiver + LauncherTileService
```

---

## SECURITY CONFIG

- **allowBackup="false"** — cloud backup disabled; only on-device mirroring (localStorage ↔ Preferences) via BackupManager
- **network_security_config.xml**: `cleartextTrafficPermitted="false"` globally, loopback-only whitelist (`localhost`, `127.0.0.1`, `10.0.2.2`)
- **secureStorage**: AES-GCM-256 key stored in IndexedDB, **non-extractable**
- **Gemini API keys**: sent via `x-goog-api-key` header — never in URL query string
- **No eval()**: calculator uses safeMath.js tokenizer/parser
- **Keystore file** (`release.keystore`) is gitignored + untracked; password stays env-gated
- **Permissions**: no phantom `READ_CALL_LOG`; `QUERY_ALL_PACKAGES` (drawer), `MANAGE_EXTERNAL_STORAGE` (file search), `READ_CONTACTS` (contacts) kept as they back real features

---

## ALL localStorage KEYS

**appStore (2):** `iris_setup_complete`, `iris_locked_apps`
**appsStore (3):** `installed_apps`, `iris_custom_folders`, `iris_hidden_apps`
**themeStore (22):** `theme_color`, `glass_opacity`, `wallpaper`, `custom_wallpaper`, `dpi_scale`, `grid_columns`, `grid_rows`, `home_icon_size`, `home_text_size`, `drawer_icon_size`, `drawer_text_size`, `layout_style`, `show_app_labels`, `show_drawer_search`, `show_home_orb`, `iris_use_24h_clock`, `global_icon_theme`, `active_live_wallpaper`, `fullscreen_active`, `drawer_layout`, `page_transition_effect`, `iris_page_transition_speed`, `page_transition_easing`
**aiStore (5):** `system_llm_backend`, `gemini_model`, `iris_voice_enabled`, `iris_voice_pitch`, `iris_voice_rate`
**assistantStore (1):** `iris_assistant_sessions`
**Other raw LS:** `iris_terminal_history`, `iris_weather_city`, `iris_weather_lat`, `iris_weather_lon`, `iris_day_tasks`, `iris_active_widgets`, `iris_custom_widgets`, `iris_media_player_mode`, `iris_selected_system_player`, `vault_auto_lock`, `assistant_tts_enabled`, `cartesia_voice_id`, `iris_oem_battery_prompted`, `iris_camera_consent`, `iris_cached_weather_string`, `iris_system_prompt`, `iris_virtual_fs`, `iris_has_nvidia_key`, `iris_has_hf_key`

**SecureStorage keys (5):** `gemini_api_key`, `groq_api_key`, `nvidia_api_key`, `huggingface_api_key`, `cartesia_api_key`

---

## KNOWN ISSUES

- **Settings prop drilling**: Settings.jsx receives 48 props from App.jsx — architectural, acceptable for now
- **Over-300-line components**: Drawer.jsx (381), ChronoPinLock.jsx (366), TopAppBar.jsx (350), Assistant.jsx (336), ArcSearch.jsx (336), StockChart.jsx (319), Widgets.jsx (318) — targeted splits for the largest remaining; OfflineAssistantOverlay split completed (584→287)
- **useOfflineAssistantCommand**: `handleCommand` recreated each render (depends on non-memoized `startListening`) — behavior-preserving, minor perf cost

---

## FIXES APPLIED (v4.8.7 audit pass)

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | CRITICAL | useVoiceEngine.js: missing refs (`lastTtsTextRef`, `isListeningRef`, `isLiveVoiceRef`, `isSpeakingRef`, `finishSpeakingTimerRef`, `mountedRef`) caused ReferenceError | Added missing refs + mount/unmount effect + local mic-permission callback |
| 2 | CRITICAL | HomeScreenFolder: `handleNameSubmit` referenced out of scope → ReferenceError on rename | Threaded as `onNameSubmit` prop to FolderExpandedView |
| 3 | CRITICAL | HomeScreenWidgetHost: `useEffect` undefined | Added missing import |
| 4 | HIGH | IrisAccessibilityService broadcast screenshots/window changes via implicit `sendBroadcast` (unexported class, dead delivery) | Switched to in-process static forwarders + `notifyListeners` |
| 5 | HIGH | Keystore + debug artifacts (`release.keystore`, `diff.txt`, `diff_utf8.txt`) committed | `git rm --cached`, gitignored (kept on disk for builds) |
| 6 | HIGH | Cleartext HTTP allowed globally | `cleartextTrafficPermitted="false"` + loopback whitelist; `ip-api.com` → HTTPS |
| 7 | MEDIUM | Cloud backup enabled (`IrisBackupAgent` + dataExtractionRules) | `allowBackup="false"`, agent reference removed from manifest |
| 8 | MEDIUM | secureStorage CryptoKey extractable | `crypto.subtle.generateKey(..., false, ...)` — non-extractable |
| 9 | MEDIUM | Phantom `READ_CALL_LOG` permission | Removed from manifest, LauncherPlugin.java, PermissionManager.java, PermissionManager.js |
| 10 | LOW | `eval()` in ArcSearch calculator | New `safeMath.js` tokenizer + recursive-descent parser |
| 11 | LOW | Gemini API keys in URL query string | Moved to `x-goog-api-key` header (all 6 call sites) |
| 12 | LOW | Duplicate hidden-app systems | Unified on `appsStore.setHiddenApp`; appListRepository derives from it |
| 13 | HOUSE | Version drift (web 4.8.7 vs native 4.7.0) | build.gradle versionCode 248 / versionName "4.8.7"; BackupManager uses APP_VERSION |
| 14 | HOUSE | ESLint: 27 errors / 468 issues | 0 errors; fixed real no-undef (BackupManager, etc.), removed debug console.log, no-useless-escape, display-name, unescaped entities, no-constant-condition |
| 15 | HOUSE | DrawerMesh.jsx 642 lines | Split into `useDrawerMeshEngine` + `drawerMeshData` + `drawerMeshUtils`; DrawerMesh now 31 lines |
| 16 | HOUSE | OfflineAssistantOverlay.jsx 584 lines | Split into `useOfflineAssistantCommand` hook; overlay now 287 lines |
| 17 | HOUSE | AGENTS.md stale (v4.6.0, 120 files) | Rewritten to v4.8.7 reality (142 files, ~19,300 lines) |
