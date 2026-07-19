# IRIS Cybernetic AI Launcher 🌐

A futuristic, highly customizable, and cybernetic Android launcher built with React, TailwindCSS, and Capacitor. IRIS brings an immersive sci-fi desktop experience to your mobile device, heavily integrated with local and cloud-based AI.

## 🚀 Features

- **Cybernetic Interface**: Matrix, CyberGrid, and Neon interactive wallpapers with a 3D particle sphere orb and wireframe globe.
- **AI Integrations**: Native support for 5 LLM backends (Gemini, Groq, NVIDIA, HuggingFace, Ollama) and an integrated RAG engine for local file search.
- **Offline Voice Assistant**: Fully functional offline voice commands utilizing Piper TTS Web Worker and RiveScript.
- **Private Encrypted Vault**: AES-GCM encrypted storage for photos and sensitive apps, protected by a Chrono PIN Lock and Biometric authentication.
- **Built-in Hacker Terminal**: Fully functional terminal with over 40 commands, system diagnostics, and LLM query capabilities.
- **Virtual Filesystem**: Explore and manage files with drag-and-drop functionality.
- **Power Save Manager**: Smart 3-tier resource optimization based on device memory and hardware concurrency to preserve battery life.
- **Global ArcSearch**: Unified search across installed apps, files, web, and LLM.
- **Custom Widget Dashboard**: Includes 8 widget types (Performance, Weather, Stock, Tasks, Ping, etc.) with a CyberSynth ambient audio engine.

## 🛠️ Technology Stack

- **Framework**: React 18
- **State Management**: Zustand 5
- **Styling**: TailwindCSS 3
- **Build Tool**: Vite 5
- **Native Bridge**: Capacitor 8 (Android Platform)

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

## 🔒 Security

IRIS includes advanced security measures like Threat Logs, which silently capture photos of unauthorized access attempts to the Vault, and AES-GCM encryption via Web Crypto API for secure API key storage.
