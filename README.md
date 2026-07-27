# IRIS Cybernetic AI Launcher 🌐

A futuristic, highly customizable, and cybernetic Android launcher built with React, TailwindCSS, and Capacitor. IRIS brings an immersive sci-fi desktop experience to your mobile device, heavily integrated with local and cloud-based AI.

## 🚀 Features

- **Cybernetic Interface**: Matrix, CyberGrid, and Neon interactive wallpapers with a 3D particle sphere orb and wireframe globe.
- **AI Integrations**: Native support for 5 LLM backends (Gemini, Groq, NVIDIA, HuggingFace, Ollama) with automatic model fallback and an integrated RAG engine for local file search.
- **Offline Voice Assistant**: Fully functional offline voice commands utilizing Piper TTS Web Worker and RiveScript with 31 regex command matchers.
- **Private Encrypted Vault**: AES-GCM encrypted storage for photos and sensitive apps, protected by a Chrono PIN Lock and Biometric authentication.
- **Built-in Hacker Terminal**: Fully functional terminal with over 40 commands, system diagnostics, and LLM query capabilities.
- **Virtual Filesystem**: Explore and manage files with drag-and-drop functionality.
- **Power Save Manager**: Smart 4-mode resource optimization (AUTO, HIGH, MEDIUM, LOW) with 21 feature presets per tier based on device capabilities.
- **Global ArcSearch**: Unified search across installed apps, files, web, and LLM.
- **Custom Widget Dashboard**: Includes 8 widget types (Performance, Weather, Stock, Tasks, Ping, Signal, Custom) with a CyberSynth ambient audio engine.
- **IRIS News**: Hacker News and BBC RSS feed aggregator.
- **Cybersecurity Tools**: 12 built-in security tools including port scanner, DNS lookup, WHOIS, and traceroute.
- **Backup & Restore**: Full app state backup and restore with encrypted export.

## 🛠️ Technology Stack

| Technology | Version |
|---|---|
| React | 18 |
| Zustand | 5 |
| TailwindCSS | 3 |
| Vite | 5 |
| Capacitor | 8 (Android) |

## 📱 App Info

- **Version**: 4.7.0
- **App ID**: `com.stitch.iris.launcher`
- **Platform**: Android

## 📦 Build & Run

Ensure you have Node.js and the Android SDK installed.

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Build + sync + compile APK
npm run deploy:android
```

## 🏗️ Project Structure

```
src/
├── main.jsx                 Entry point
├── App.jsx                  Root router
├── stores/                  Zustand state management (6 stores)
├── hooks/                   Custom React hooks (10 files)
├── utils/                   Utilities & engines
├── components/              Reusable UI components (30+ files)
├── pages/                   Page components (11 pages)
├── terminal/                Terminal commands engine
├── tools/                   IRIS cybersecurity tools data
├── data/                    Stock & OEM data
├── workers/                 Piper TTS Web Worker
└── rivescript/              Offline chatbot brain files
```

## 🔒 Security

IRIS includes advanced security measures:
- **Threat Logs**: Silently capture photos of unauthorized Vault access attempts.
- **AES-GCM Encryption**: Web Crypto API for secure API key and vault storage.
- **Biometric Authentication**: Fingerprint/face unlock for the Private Vault.
- **Chrono PIN Lock**: Time-based PIN system for vault access.

## 📄 License

This project is proprietary software.
