# IRIS Cybernetic AI Launcher — Future Upgrades Roadmap

This document tracks approved high-utility features, architectural upgrades, and engine enhancements focused on privacy, AI intelligence, and performance.

---

## 🎙️ 1. Kokoro-82M Neural Voice Synthesis (Offline TTS Upgrade)
* **Goal**: Replace Piper TTS and Android System TTS with **Kokoro-82M** for ultra-realistic, human-like voice synthesis (82M parameter ONNX model).
* **Architecture**: 
  - Android Native C++/Java pipeline (`sherpa-onnx`) for zero-latency offline TTS.
  - ONNX Runtime Web worker fallback (`hexgrad/Kokoro-82M-v1.0-ONNX`).
  - **Pruning**: Completely remove Android System TTS and Piper TTS workers once Kokoro is integrated to keep the launcher lean and lightweight.

---

## 🧠 2. On-Device AI & Multimodal Intelligence
* **Visual Vision Assistant ("IRIS Optics")**: Camera & screen capture analyzer for code errors, real-time text translation, and object detection.
* **Zero-Cloud Local SLM Engine (WebGPU / MLC)**: 100% offline Small Language Models (`Llama-3.2-1B`, `Gemma-2B`, `Phi-3.5`) via WebGPU / NNAPI without API keys.
* **Contextual Proactive Intent Engine**: Predictive launcher actions surfacing relevant tools/apps based on time, location, bluetooth state, and battery.

---

## 🛡️ 3. Cybersecurity & Threat Operations (IRIS Security Suite)
* **App Permission Auditor & Privacy Guard**: Risk scoring dashboard for installed Android apps based on granted background permissions (Camera, Mic, Location, Contacts, Accessibility).
* **Wi-Fi Signal & Rogue AP Inspector**: Network security scanner for weak encryption (WEP/WPA1), ARP spoofing, and open ports.
* **Encrypted Vault Backup**: Zero-knowledge AES-GCM-256 encrypted backup export for Private Vault media and launcher configurations with master password protection.
