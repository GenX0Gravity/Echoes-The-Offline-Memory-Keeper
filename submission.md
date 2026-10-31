---
title: "Echoes: An Offline AI Memory Keeper for the Ghosts We Carry"
published: false
description: "A dark gothic memory archive and digital ofrenda powered by local open-source AI (Ollama + Qwen2.5 3B). 100% private, sovereign, and on-device."
tags: "hacktoberfest, ai, open source, privacy"
cover_image: ""
canonical_url: ""
---

## What I Built

**Echoes – The Offline Memory Keeper** is a private digital memory sanctuary and memorial archive designed for the **Hacktoberfest Open-Source AI Challenge Week 4: Ghost in the Machine**.

Inspired by the reverence of **Día de los Muertos** (Day of the Dead) and dark gothic aesthetics, Echoes gives people an intimate, sacred space to preserve their most fragile memories, remember departed loved ones, and transform raw personal reflections into timeless literature.

Unlike mainstream memory and journaling applications that push personal reflections onto third-party servers and commercial LLM APIs, Echoes runs on a strictly **sovereign, air-gapped philosophy**:
- **100% On-Device Local AI**: Powered by **Ollama** running **Qwen2.5 3B** on the user's physical computer. Zero closed-source tokens, zero external API keys, zero tracking.
- **Client-Side Storage**: All memories, memorial cards, and conversations are preserved locally via HTML5 LocalStorage, with JSON export and import backup tools.
- **Graceful Dual-Mode Engine**: Operates as a local LLM application on desktop machines or as an offline-pattern generative sanctuary on cloud platforms like Vercel.

### Core Sanctuaries inside Echoes:
1. **🗝 Memory Vault**: A searchable, taggable repository for lived moments, classified by emotional moods (*Nostalgic, Joyful, Peaceful, Bittersweet, Sorrowful, Transformative, Grateful*) and categories.
2. **📜 AI Storyteller**: Converts raw memory fragments into moving prose across four distinct tones: *Emotional*, *Nostalgic*, *Poetic*, and *Storytelling*.
3. **🌙 Memory Companion ("Echo")**: An empathetic conversational entity trained to gently excavate fading sensory details (*"What did the light feel like in that moment?"*, *"What was their laugh like?"*) before they are forgotten.
4. **🕯 Digital Ofrenda**: An altar of remembrance where users place photos, memorial dates, favorite foods or items, and light candles. Features an AI dedication generator that composes heartfelt epitaphs.
5. **👻 Ghost Mode**: An atmospheric shift where the veil between memory and reality grows thin, accompanied by floating wisps, candle flames, and whispered philosophical reflections from the other side.
6. **🎤 Voice Dictation**: Integrated speech-to-text powered directly by the browser's Web Speech API.
7. **🔔 Harmonic Audio Synthesis**: Pure 432Hz ambient bell chimes and candle strike acoustics synthesized in real-time with the Web Audio API without external audio files.
8. **✨ Interactive Onboarding Tour**: A 4-step guided walk through the sanctuary's rooms and local AI setup.

---

## Demo

- **Live Web Application**: [https://your-echoes-app.vercel.app](https://your-echoes-app.vercel.app) *(Replace with your deployed Vercel URL)*
- **Local Application**: Clone the repository and run `npm start` to access `http://localhost:3000`.

### Visual Tour of the Sanctuary:
- **Landing Room**: Obsidian backgrounds (`#050508`), candlelight glows, and floating embers greeting the memory keeper.
- **Memory Vault**: Filterable card grid with instant search, mood sorting, and backup management.
- **The Storyteller's Hearth**: Multi-tone narrative generator with real-time model attribution badges.
- **The Companion's Study**: Multi-turn conversational chamber with real-time typing indicators.
- **The Ofrenda**: Flickering candles, cempasúchil marigold glows, and heartfelt memorial dedications.
- **Ghost Mode**: Atmospheric darkness illuminated by ascending purple wisps and spectral meditations.

*(Include screenshots or a demo GIF of your deployed application here)*

---

## Code

- **GitHub Repository**: [https://github.com/<your-username>/Echoes-The-Offline-Memory-Keeper](https://github.com/<your-username>/Echoes-The-Offline-Memory-Keeper) *(Replace with your GitHub repository URL)*
- **License**: MIT Open Source License

```bash
# Clone and explore
git clone https://github.com/<your-username>/Echoes-The-Offline-Memory-Keeper.git
cd Echoes-The-Offline-Memory-Keeper
npm install
npm start
```

---

## How I Built It

Echoes was architected with a strict commitment to **simplicity, longevity, and zero vendor lock-in**:

### 1. Technology Architecture
- **Frontend**: Plain Vanilla JavaScript (ES6 Modules), semantic HTML5, and CSS Custom Properties. No heavy frameworks (React/Vue/Angular), no build-step bundling required for static delivery, and zero client vulnerabilities.
- **FX & Audio Engine**:
  - Floating embers, stars, and spectral wisps rendered via an optimized 60 FPS HTML5 Canvas engine.
  - Ambient harmonic bell chimes and candle strike sound effects synthesized entirely in the browser using the Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`).
- **Local AI Provider**:
  - [Ollama](https://ollama.ai) serving [Qwen2.5 3B](https://huggingface.co/Qwen/Qwen2.5-3B).
  - Selected for its extraordinary literary fluency, rich emotional vocabulary, and lightweight footprint (~2.5GB of RAM/VRAM), allowing it to run smoothly on modest consumer hardware.
- **Backend & Cloud Deployment**:
  - Local mode: Node.js with Express 4.x for local loopback proxying and prompt templating.
  - Cloud mode: Vercel Serverless Functions (`api/*.js`) coupled with `vercel.json` routing.
  - Client-side AI management that transparently detects local Ollama, secure tunnels (e.g., Cloudflare Tunnel / ngrok), or falls back to the rich Offline Pattern Engine.

### 2. Prompt Engineering Guardrails
All prompts were designed in [`server/prompts.js`](file:///c:/MyProjects/Echoes/Echoes-The-Offline-Memory-Keeper/server/prompts.js) to treat memories as sacred relics:
- **Storyteller Persona**: Directs the LLM to write with restraint, avoiding generic cheerful cliches or robotic summaries. It grounds narratives in physical sensations: the smell of woodsmoke, the slant of October light, the silence after laughter.
- **Memory Excavation Persona**: Acts as an empathetic archivist who listens deeply, validates feelings, and asks exactly one or two thoughtful sensory follow-up questions to draw out details before memory fades.

### 3. Dual-Mode Resilience & Vercel Compatibility
Because cloud serverless platforms cannot directly reach a user's local `127.0.0.1` port without an external tunnel, Echoes features a hybrid AI provider:
1. **Local Desktop Execution**: When launched via `npm start`, the app connects automatically to `http://127.0.0.1:11434`.
2. **Vercel Cloud Deployment**: Works out of the box with the built-in Offline Sanctuary Engine. Users can also link their desktop's local Ollama by launching `cloudflared tunnel --url http://localhost:11434` and pasting the URL into the in-app AI settings.

---

## Why Does Open Innovation Matter?

Human memories are the most intimate data that exists. They contain:
- Confessions of grief and love
- Names and photos of departed family members
- Secrets, childhood milestones, and private regrets

When we outsource memory preservation to proprietary cloud AI platforms, we make an irreversible Faustian bargain:
1. **The Surveillance Machine**: Closed AI APIs process, store, and often train upon our most vulnerable disclosures. Your grief becomes training corpus tokens for corporate models.
2. **The Paywalled Cemetery**: If a commercial AI service raises prices, changes its terms of service, or ceases operations, your memories are locked behind paywalls or lost forever.
3. **The Homogenization of Sentiment**: Closed commercial models are heavily RLHF'd toward corporate cheerfulness and polite corporate neutrality, stripping away the poetic, gothic, and solemn reverence that grief and remembrance require.

**Open-source AI matters because sovereignty matters.** 

Running **Qwen2.5 3B via Ollama** on your own hardware means:
- No company knows whose name you whispered into the ofrenda.
- No cloud outage can lock you out of your memories.
- The software will run twenty years from now on any machine with a CPU.

Open innovation restores agency to the individual. It transforms AI from an extractive surveillance apparatus into a personal digital heirloom.

---

## My Agent Session

This project was conceived, implemented, refined, and deployed in collaboration with **Antigravity**, Google's agentic AI coding environment.

- **DevRelay Session Transcript**: `https://devrelay.com/sessions/<your-session-id>` *(Replace with your DevRelay session link)*

### Collaborative Development Workflow:
1. **Gothic Aesthetic & Architectural Conception**: Synthesized the dark gothic theme inspired by Día de los Muertos, establishing color palettes (`#050508`, deep purples, candlelight ambers), Web Audio synthesis, and canvas particle dynamics.
2. **Local AI Engine Engineering**: Integrated Ollama with Qwen2.5 3B, architecting reusable prompt engineering modules, tone controllers, and an offline pattern fallback engine.
3. **Production Hardening**: Refactored the architecture for Vercel serverless deployment, building modular API endpoints under `api/`, persistent tunnel configuration, Web Speech API dictation, and JSON export/import backup validation.

---

## The Spirit of It

The prompt for Week 4 of Hacktoberfest is **"Ghost in the Machine"**.

Technology is usually obsessed with speed, productivity, and the future. But what about the past? What about the people and moments that slip away in the dark?

In Mexican culture, Día de los Muertos teaches us that a person only truly dies when there is no one left to remember them. In literature, a "ghost" is not necessarily a terrifying specter — it is an emotional imprint, a memory that refuses to be extinguished, an echo of someone whose presence still shapes the room they used to walk in.

**Echoes is built for those ghosts.**

The "machine" in our title is the silicon in your laptop; the "ghost" is the love, grief, and lived history you entrust to it. By running local open-source models, we ensure that the machine belongs to you, and the ghosts remain safe.

---

## Prize Categories

Echoes is submitted for:
- **Primary Track**: **Hacktoberfest Open-Source AI Challenge Week 4: Ghost in the Machine**
- **Sponsor / Additional Considerations**:
  - Best Local / Offline Open-Source AI Architecture
  - Best Creative & Literary Application of Small Language Models (SLMs)
  - Excellence in User Privacy and Data Sovereignty

