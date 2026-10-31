/**
 * ECHOES – Main Application Entry Point
 * Orchestrates all modules, UI interactions, onboarding, voice input,
 * local Ollama AI integration, and audio ambience.
 */

import { Storage, seedSampleData } from './storage.js';
import { ParticleSystem } from './particles.js';
import { Navigation } from './navigation.js';
import { MemoryVault } from './vault.js';
import { DigitalOfrenda } from './ofrenda.js';
import { onboarding } from './onboarding.js';
import { voiceInput } from './speech.js';
import { sanctuaryAudio } from './audio.js';
import {
  generateStory,
  getCompanionResponse,
  checkOllamaStatus,
  configureOllama,
  getCachedAIStatus,
  CONVERSATION_STARTERS,
  GHOST_MESSAGES,
} from './ai.js';
import {
  showToast, openModal, closeModal, generateId,
  formatDate, escapeHtml, clearElement, truncate,
  typewriterEffect, scrollToTop, debounce,
} from './utils.js';

// ── App Bootstrap ────────────────────────────────────────

class EchoesApp {
  constructor() {
    this.particles = null;
    this.nav = null;
    this.vault = null;
    this.ofrenda = null;
    this.chatMessages = [];
    this.isGhostMode = false;
    this.currentStoryTone = 'poetic';
    this.currentCompanionTone = 'emotional';
    this.isChatTyping = false;
    this.statusCheckInterval = null;
  }

  async init() {
    // Seed sample data on first run
    seedSampleData();

    // Init subsystems
    this.particles = new ParticleSystem('particle-canvas');
    this.particles.start();

    this.nav = new Navigation();
    this.vault = new MemoryVault();
    this.ofrenda = new DigitalOfrenda();

    // Initialize Local AI connection & settings
    await this.initAIStatus();

    // Initialize Onboarding Tour
    onboarding.init();

    // Initialize Audio & Voice Features
    this.initAudioAndVoice();

    // Landing page
    this.initLanding();

    // AI Storyteller
    this.initStoryteller();

    // Companion Chat
    this.initChat();

    // Ghost Mode
    this.initGhostMode();

    // Privacy Section
    this.initPrivacy();

    // AI Setup Guide & Snippets
    this.initAIGuide();

    // Cross-module events
    this.bindCrossModuleEvents();

    // Show initial section
    const startSection = document.getElementById('section-landing');
    if (startSection) startSection.classList.add('active');

    console.log('%c✦ Echoes – The Offline Memory Keeper', 'color: #a855f7; font-size: 1.2em; font-weight: bold');
    console.log('%cSome memories deserve to live forever. Local AI active.', 'color: #d4a017; font-style: italic');
  }

  // ── Audio & Voice Controls ──────────────────────────────

  initAudioAndVoice() {
    // Audio Chime Toggle Button in Navbar
    const chimeBtn = document.getElementById('chime-toggle-btn');
    const updateChimeUI = (enabled) => {
      if (!chimeBtn) return;
      chimeBtn.classList.toggle('active', enabled);
      chimeBtn.innerHTML = enabled ? '🔔 Chimes On' : '🔕 Muted';
      chimeBtn.title = enabled ? 'Ambient chimes enabled. Click to mute.' : 'Ambient chimes muted. Click to enable.';
    };

    updateChimeUI(sanctuaryAudio.enabled);

    chimeBtn?.addEventListener('click', () => {
      const isEnabled = sanctuaryAudio.toggleSound();
      updateChimeUI(isEnabled);
      showToast(isEnabled ? 'Ambient chimes enabled ✦' : 'Audio muted 🔕', 'info');
    });

    // Voice input attachments
    const storyVoiceBtn = document.getElementById('story-voice-btn');
    const storyTextarea = document.getElementById('story-input');
    if (storyVoiceBtn && storyTextarea) {
      voiceInput.attach(storyVoiceBtn, storyTextarea);
    }

    const chatVoiceBtn = document.getElementById('chat-voice-btn');
    const chatInput = document.getElementById('chat-input');
    if (chatVoiceBtn && chatInput) {
      voiceInput.attach(chatVoiceBtn, chatInput);
    }
  }

  // ── Local AI Status & Configuration ─────────────────────

  async initAIStatus() {
    const statusPill = document.getElementById('ai-status-pill');
    const mobileStatusPill = document.getElementById('mobile-ai-status-pill');

    const updateUI = (status) => {
      const isOnline = status.connected;
      const isTunnel = status.isTunnel;
      const modelName = status.model || 'qwen2.5:3b';

      const updatePill = (el) => {
        if (!el) return;
        const dot = el.querySelector('.ai-status-dot');
        const text = el.querySelector('.ai-status-text');

        if (dot) {
          dot.className = `ai-status-dot ${isOnline ? (isTunnel ? 'online tunnel' : 'online') : 'offline'}`;
        }
        if (text) {
          text.textContent = isOnline
            ? (isTunnel ? `Tunnel: ${modelName}` : `Local: ${modelName}`)
            : `AI: Offline Engine`;
        }
        el.title = isOnline
          ? (isTunnel
              ? `Connected to your local Ollama via secure tunnel (${modelName}). Click to configure.`
              : `Connected to local Ollama (${modelName}). Click to configure.`)
          : (status.isCloud
              ? `Vercel Cloud: Running on the Offline Sanctuary Engine. Click to connect your local Ollama via tunnel.`
              : `Ollama offline. Click to view local AI setup guide.`);
      };

      updatePill(statusPill);
      updatePill(mobileStatusPill);

      // Update badges in Storyteller & Chat
      const storyModelBadge = document.getElementById('storyteller-model-badge');
      if (storyModelBadge) {
        storyModelBadge.textContent = isOnline
          ? (isTunnel ? `✦ Tunneled Ollama (${modelName})` : `✦ Local Ollama (${modelName})`)
          : '⚡ Offline Pattern Engine';
        storyModelBadge.className = `ai-badge ${isOnline ? '' : 'offline-engine'}`;
      }

      const companionModelBadge = document.getElementById('companion-model-badge');
      if (companionModelBadge) {
        companionModelBadge.textContent = isOnline
          ? (isTunnel ? `✦ Tunneled Ollama (${modelName})` : `✦ Local Ollama (${modelName})`)
          : '⚡ Offline Pattern Engine';
        companionModelBadge.className = `ai-badge ${isOnline ? '' : 'offline-engine'}`;
      }
    };

    // First check
    const initialStatus = await checkOllamaStatus();
    updateUI(initialStatus);

    // Periodic check every 25 seconds
    this.statusCheckInterval = setInterval(async () => {
      const status = await checkOllamaStatus();
      updateUI(status);
    }, 25000);

    // Pill click → open AI settings modal
    const openConfig = () => this.openAIConfigModal();
    statusPill?.addEventListener('click', openConfig);
    mobileStatusPill?.addEventListener('click', openConfig);

    // AI Settings Modal wiring
    this.bindAIConfigModal(updateUI);
  }

  async openAIConfigModal() {
    const status = await checkOllamaStatus();
    const hostInput = document.getElementById('ai-host-input');
    const modelInput = document.getElementById('ai-model-input');
    const modelSelect = document.getElementById('ai-model-select');
    const statusCard = document.getElementById('ai-modal-status-card');
    const statusMsg = document.getElementById('ai-modal-status-text');
    const modelsList = document.getElementById('ai-available-models-list');

    if (hostInput) hostInput.value = status.host || 'http://127.0.0.1:11434';
    if (modelInput) modelInput.value = status.model || 'qwen2.5:3b';

    if (statusCard) {
      statusCard.className = `ai-status-card ${status.connected ? 'connected' : 'offline'}`;
    }
    if (statusMsg) {
      if (status.connected) {
        statusMsg.innerHTML = status.isTunnel
          ? `✔ <strong>Secure Tunnel Connected!</strong> Successfully linked to your local Ollama at <code>${escapeHtml(status.host)}</code>. Active model: <strong>${escapeHtml(status.model)}</strong>.`
          : `✔ <strong>Local Ollama Active!</strong> Connected to <code>${escapeHtml(status.host)}</code> with model <strong>${escapeHtml(status.model)}</strong>.`;
      } else {
        if (status.isCloud && !status.isTunnel) {
          statusMsg.innerHTML = `🟣 <strong>Vercel Cloud Preview Active:</strong> Echoes is running in 100% private <strong>Offline Sanctuary Engine</strong> mode. All features work completely without setup.<br><br><em>Want to link your laptop's local Ollama?</em> Run <code>cloudflared tunnel --url http://localhost:11434</code> or <code>ngrok http 11434</code> in your terminal, paste the HTTPS tunnel URL into the Host URL below, and click <strong>Save Configuration</strong>.`;
        } else {
          statusMsg.innerHTML = `⚠ <strong>Local Ollama Not Detected at <code>${escapeHtml(status.host)}</code>:</strong> Echoes will use its built-in offline engine. To enable local LLM inference, start Ollama in your terminal with <code>ollama serve</code> and pull <code>ollama run qwen2.5:3b</code>.`;
        }
      }
    }

    // Populate model dropdown & pills
    if (modelSelect && modelsList) {
      clearElement(modelsList);
      modelSelect.innerHTML = `<option value="">— Select an installed model —</option>`;

      if (status.availableModels && status.availableModels.length > 0) {
        status.availableModels.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m;
          opt.textContent = m;
          if (m === status.model || m.startsWith(`${status.model}:`)) opt.selected = true;
          modelSelect.appendChild(opt);

          const pill = document.createElement('button');
          pill.type = 'button';
          pill.className = `model-pill ${m === status.model ? 'active' : ''}`;
          pill.textContent = m;
          pill.addEventListener('click', () => {
            if (modelInput) modelInput.value = m;
            document.querySelectorAll('.model-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
          });
          modelsList.appendChild(pill);
        });
      } else {
        const emptyMsg = document.createElement('span');
        emptyMsg.style.fontSize = '12px';
        emptyMsg.style.color = 'var(--color-text-muted)';
        emptyMsg.textContent = status.connected
          ? 'No models found. Run "ollama run qwen2.5:3b" to pull the recommended model.'
          : 'Ollama offline. Start Ollama with "ollama serve" to detect installed models.';
        modelsList.appendChild(emptyMsg);
      }
    }

    openModal('modal-ai-config');
  }

  bindAIConfigModal(updateUI) {
    const testBtn = document.getElementById('ai-test-btn');
    const saveBtn = document.getElementById('ai-save-config-btn');
    const modelSelect = document.getElementById('ai-model-select');
    const modelInput = document.getElementById('ai-model-input');
    const localHostBtn = document.getElementById('ai-host-local-btn');

    localHostBtn?.addEventListener('click', () => {
      const hostInput = document.getElementById('ai-host-input');
      if (hostInput) {
        hostInput.value = 'http://127.0.0.1:11434';
        showToast('Reset host to local address http://127.0.0.1:11434', 'info');
      }
    });

    modelSelect?.addEventListener('change', () => {
      if (modelSelect.value && modelInput) {
        modelInput.value = modelSelect.value;
      }
    });

    testBtn?.addEventListener('click', async () => {
      testBtn.disabled = true;
      testBtn.textContent = 'Testing…';
      try {
        const host = document.getElementById('ai-host-input')?.value.trim();
        const model = document.getElementById('ai-model-input')?.value.trim();
        await configureOllama({ host, model });
        const updated = await checkOllamaStatus();
        updateUI(updated);
        showToast(
          updated.connected
            ? `Connected to Ollama! Model: ${updated.model}`
            : 'Could not connect to Ollama at that host.',
          updated.connected ? 'success' : 'error'
        );
        this.openAIConfigModal();
      } finally {
        testBtn.disabled = false;
        testBtn.textContent = 'Test Connection';
      }
    });

    saveBtn?.addEventListener('click', async () => {
      const host = document.getElementById('ai-host-input')?.value.trim();
      const model = document.getElementById('ai-model-input')?.value.trim();
      if (!model) {
        showToast('Please specify a model name (e.g. qwen2.5:3b)', 'error');
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';
      try {
        await configureOllama({ host, model });
        const updated = await checkOllamaStatus();
        updateUI(updated);
        closeModal('modal-ai-config');
        sanctuaryAudio.playChime();
        showToast(`AI configured: ${updated.model} ✦`, 'success');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Configuration';
      }
    });
  }

  // ── AI Setup Guide Modal & Snippets ─────────────────────

  initAIGuide() {
    // Open guide buttons
    document.querySelectorAll('[data-open-ai-guide]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal('modal-ai-guide');
      });
    });

    // Copyable command snippets
    document.querySelectorAll('.copyable-command').forEach(el => {
      el.addEventListener('click', () => {
        const text = el.innerText.trim();
        navigator.clipboard.writeText(text).then(() => {
          showToast(`Copied to clipboard: "${text}"`, 'success', 2000);
        });
      });
    });
  }

  // ── Landing Page ─────────────────────────────────────

  initLanding() {
    // Get Started button
    document.getElementById('hero-get-started')?.addEventListener('click', () => {
      this.nav.navigate('vault');
    });

    // Explore Ofrenda button
    document.getElementById('hero-ofrenda-btn')?.addEventListener('click', () => {
      this.nav.navigate('ofrenda');
    });

    // Feature cards navigation
    document.querySelectorAll('.feature-card[data-nav]').forEach(card => {
      card.addEventListener('click', () => this.nav.navigate(card.dataset.nav));
    });

    // Animate hero elements on load
    setTimeout(() => {
      document.querySelector('.hero-content')?.classList.add('animated');
    }, 100);
  }

  // ── AI Storyteller ───────────────────────────────────

  initStoryteller() {
    // Tone buttons: emotional, nostalgic, poetic, storytelling
    document.querySelectorAll('.story-tone-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.story-tone-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentStoryTone = btn.dataset.tone || 'poetic';
        sanctuaryAudio.playChime();
      });
    });

    // Memory picker → populate textarea
    const picker = document.getElementById('story-memory-picker');
    const textarea = document.getElementById('story-input');
    picker?.addEventListener('change', () => {
      if (!picker.value) return;
      const memory = Storage.getMemory(picker.value);
      if (memory && textarea) {
        textarea.value = memory.content;
        textarea.focus();
        showToast(`Memory loaded: "${truncate(memory.title, 40)}"`, 'info');
      }
    });

    // Populate memory picker
    this.refreshMemoryPicker();

    // Generate button
    document.getElementById('story-generate-btn')?.addEventListener('click', () => this.generateStory());

    // Story action buttons
    document.getElementById('story-copy-btn')?.addEventListener('click', () => this.copyStory());
    document.getElementById('story-save-btn')?.addEventListener('click', () => this.saveStory());
    document.getElementById('story-clear-btn')?.addEventListener('click', () => this.clearStory());
  }

  refreshMemoryPicker() {
    const picker = document.getElementById('story-memory-picker');
    if (!picker) return;
    const memories = Storage.getMemories();
    picker.innerHTML = `<option value="">— Pick a memory to inspire —</option>` +
      memories.map(m => `<option value="${m.id}">${escapeHtml(truncate(m.title, 50))}</option>`).join('');
  }

  async generateStory() {
    const textarea = document.getElementById('story-input');
    const input = textarea?.value.trim();

    if (!input || input.length < 10) {
      showToast('Please write a bit more about your memory first.', 'error');
      textarea?.focus();
      return;
    }

    // Determine memory title if loaded from picker
    const picker = document.getElementById('story-memory-picker');
    let title = '';
    if (picker?.value) {
      const memory = Storage.getMemory(picker.value);
      if (memory) title = memory.title;
    }

    // Show generating state
    const output = document.getElementById('story-output');
    const actions = document.getElementById('story-actions');
    const generateBtn = document.getElementById('story-generate-btn');

    if (output) {
      output.innerHTML = `
        <div class="story-generating">
          <span class="flame-loader">🕯</span>
          <p style="color: var(--color-text-primary); font-family: var(--font-serif); font-size: 1.1rem; margin-top: var(--space-2);">
            Weaving your story with local AI…
          </p>
          <p style="color: var(--color-text-muted); font-style: italic; font-size: 0.85rem;">
            Tone: ${this.currentStoryTone} · 100% private on your device
          </p>
        </div>
      `;
    }
    if (actions) actions.classList.add('hidden');
    if (generateBtn) generateBtn.disabled = true;

    try {
      const result = await generateStory(input, this.currentStoryTone, title);
      sanctuaryAudio.playCandleStrike();
      this.displayStory(result);
    } catch (err) {
      showToast('Story generation error: ' + err.message, 'error');
      this.clearStory();
    } finally {
      if (generateBtn) generateBtn.disabled = false;
    }
  }

  displayStory(result) {
    const output = document.getElementById('story-output');
    const actions = document.getElementById('story-actions');
    const rawStory = result.story || result;

    if (output) {
      const html = rawStory
        .replace(/\*\*(.*?)\*\*/g, '<span class="story-title">$1</span>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .split('\n\n')
        .map(p => p.trim() ? `<p>${p.replace(/\n/g, '<br>')}</p>` : '')
        .join('');

      const modelMetaHtml = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top: var(--space-4); padding-top: var(--space-3); border-top: 1px solid var(--color-border); font-size: 12px; color: var(--color-text-muted);">
          <span class="ai-badge ${result.isLocalAI ? '' : 'offline-engine'}">
            ${result.isLocalAI ? '✦ ' + result.model : '⚡ Offline Pattern Engine'}
          </span>
          <span>Tone: <strong>${result.tone || this.currentStoryTone}</strong></span>
        </div>
      `;

      output.innerHTML = `<div class="story-text">${html}</div>${modelMetaHtml}`;
    }

    if (actions) actions.classList.remove('hidden');

    if (result.isLocalAI) {
      showToast(`Story woven by local ${result.model} ✦`, 'success');
    } else {
      showToast('Story woven via offline memory engine ✦', 'info');
    }
  }

  copyStory() {
    const storyEl = document.querySelector('.story-text');
    if (!storyEl) return;
    navigator.clipboard.writeText(storyEl.innerText).then(() => {
      showToast('Story copied to clipboard ✦', 'success');
    }).catch(() => {
      showToast('Copy failed — try selecting the text manually.', 'error');
    });
  }

  saveStory() {
    const input = document.getElementById('story-input')?.value.trim();
    const storyEl = document.querySelector('.story-text');
    if (!storyEl || !input) return;

    Storage.saveStory({
      input,
      story: storyEl.innerText,
      tone: this.currentStoryTone,
    });
    sanctuaryAudio.playChime();
    showToast('Story saved to your vault ✦', 'success');
  }

  clearStory() {
    const output = document.getElementById('story-output');
    const actions = document.getElementById('story-actions');

    if (output) {
      output.innerHTML = `
        <div class="story-placeholder">
          <span class="story-placeholder-icon">🪔</span>
          <p style="font-style:italic; color: var(--color-text-ghost); max-width: 260px; text-align: center;">
            Share a memory on the left, and let local open-source AI transform it into something timeless.
          </p>
        </div>
      `;
    }
    if (actions) actions.classList.add('hidden');
  }

  // ── Companion Chat ───────────────────────────────────

  initChat() {
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send-btn');
    const messagesEl = document.getElementById('chat-messages');

    // Tone selector for Companion
    document.querySelectorAll('.companion-tone-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.companion-tone-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentCompanionTone = btn.dataset.tone || 'emotional';
        sanctuaryAudio.playChime();
        showToast(`Echo's tone set to: ${this.currentCompanionTone}`, 'info', 2000);
      });
    });

    // Send on button click
    sendBtn?.addEventListener('click', () => this.sendChatMessage());

    // Send on Enter (Shift+Enter for newline)
    chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendChatMessage();
      }
    });

    // Auto-resize textarea
    chatInput?.addEventListener('input', () => {
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    });

    // Conversation starters
    document.querySelectorAll('.starter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (chatInput) chatInput.value = btn.dataset.starter || btn.textContent;
        this.sendChatMessage();
      });
    });

    // Welcome message
    setTimeout(() => {
      this.addChatMessage(
        'assistant',
        "Welcome, keeper of memories. I am Echo — your companion in the quiet space where stories live. I'm here to listen, ask the questions that help you uncover sensory details, and preserve what matters most. Tell me, what memory is resting on your mind tonight?"
      );
    }, 400);
  }

  async sendChatMessage() {
    if (this.isChatTyping) return;

    const chatInput = document.getElementById('chat-input');
    const message = chatInput?.value.trim();
    if (!message) return;

    // Clear input
    if (chatInput) {
      chatInput.value = '';
      chatInput.style.height = 'auto';
    }

    // Add user message to UI & history
    this.addChatMessage('user', message);
    this.chatMessages.push({ role: 'user', content: message });

    // Show typing indicator
    this.isChatTyping = true;
    const typingEl = this.showTypingIndicator();

    try {
      const response = await getCompanionResponse(
        message,
        this.chatMessages,
        this.currentCompanionTone
      );
      typingEl?.remove();
      this.addChatMessage('assistant', response.reply);
      this.chatMessages.push({ role: 'assistant', content: response.reply });

      sanctuaryAudio.playChime();

      // Save conversation state
      Storage.saveConversation(this.chatMessages);
    } catch (err) {
      typingEl?.remove();
      this.addChatMessage('assistant', 'I am still here listening. Please speak again when you are ready.');
    } finally {
      this.isChatTyping = false;
    }
  }

  addChatMessage(role, content) {
    const messagesEl = document.getElementById('chat-messages');
    if (!messagesEl) return;

    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const isAssistant = role === 'assistant';

    const msgEl = document.createElement('div');
    msgEl.className = `chat-message ${role}`;
    msgEl.innerHTML = `
      <div class="message-avatar ${role}">${isAssistant ? '🌙' : '✦'}</div>
      <div style="display:flex; flex-direction:column; gap: 4px; max-width: calc(100% - 48px);">
        <div class="message-bubble">${escapeHtml(content).replace(/\n/g, '<br>')}</div>
        <div class="message-time">${now}</div>
      </div>
    `;

    messagesEl.appendChild(msgEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  showTypingIndicator() {
    const messagesEl = document.getElementById('chat-messages');
    if (!messagesEl) return null;

    const el = document.createElement('div');
    el.className = 'chat-message assistant';
    el.id = 'typing-indicator';
    el.innerHTML = `
      <div class="message-avatar assistant">🌙</div>
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    `;

    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }

  // ── Ghost Mode ───────────────────────────────────────

  initGhostMode() {
    const activateBtn = document.getElementById('ghost-activate-btn');
    const deactivateBtn = document.getElementById('ghost-deactivate-btn');
    const ghostOrb = document.getElementById('ghost-orb');

    activateBtn?.addEventListener('click', () => this.toggleGhostMode(true));
    deactivateBtn?.addEventListener('click', () => this.toggleGhostMode(false));
    ghostOrb?.addEventListener('click', () => this.toggleGhostMode(!this.isGhostMode));

    // Render ghost messages
    this.renderGhostMessages();
  }

  toggleGhostMode(enable) {
    this.isGhostMode = enable;
    document.body.classList.toggle('ghost-activated', enable);
    this.particles.setGhostMode(enable);

    const deactivateBtn = document.getElementById('ghost-deactivate-btn');
    const activateBtn = document.getElementById('ghost-activate-btn');

    if (deactivateBtn) deactivateBtn.classList.toggle('hidden', !enable);
    if (activateBtn) activateBtn.classList.toggle('hidden', enable);

    if (enable) {
      sanctuaryAudio.playCandleStrike();
      showToast('Ghost Mode activated — the veil grows thin 👻', 'info', 4000);
      this.createWisps();
    } else {
      showToast('Returning to the realm of the living...', 'info');
      document.querySelectorAll('.wisp').forEach(w => w.remove());
    }
  }

  createWisps() {
    const container = document.querySelector('.ghost-wisps');
    if (!container) return;
    clearElement(container);

    for (let i = 0; i < 15; i++) {
      const wisp = document.createElement('div');
      wisp.className = 'wisp';
      wisp.style.left = `${Math.random() * 100}%`;
      wisp.style.bottom = `${Math.random() * 30}%`;
      wisp.style.animationDuration = `${3 + Math.random() * 4}s`;
      wisp.style.animationDelay = `${Math.random() * 3}s`;
      wisp.style.height = `${20 + Math.random() * 40}px`;
      container.appendChild(wisp);
    }
  }

  renderGhostMessages() {
    const grid = document.getElementById('ghost-messages-grid');
    if (!grid) return;

    GHOST_MESSAGES.forEach((msg, i) => {
      const card = document.createElement('div');
      card.className = 'ghost-message-card';
      card.style.animationDelay = `${i * 100}ms`;
      card.innerHTML = `
        <span class="ghost-card-icon">${msg.icon}</span>
        <h3 class="ghost-card-title">${escapeHtml(msg.title)}</h3>
        <p class="ghost-card-text">${escapeHtml(msg.text)}</p>
        <p class="ghost-card-from">${escapeHtml(msg.from)}</p>
      `;
      grid.appendChild(card);
    });
  }

  // ── Privacy Section ──────────────────────────────────

  initPrivacy() {
    // Storage usage display
    const storageEl = document.getElementById('storage-size');
    if (storageEl) {
      const update = () => {
        storageEl.textContent = `${Storage.getStorageSize()} KB`;
      };
      update();
      window.addEventListener('echoes:navigate', (e) => {
        if (e.detail.section === 'privacy') update();
      });
    }

    // Clear data button
    document.getElementById('clear-all-data-btn')?.addEventListener('click', () => {
      if (confirm('This will permanently delete ALL your memories, ofrenda cards, and conversations. Are you absolutely sure?')) {
        Storage.clear();
        showToast('All data cleared. Starting fresh.', 'info');
        setTimeout(() => {
          seedSampleData();
          this.vault.render();
          this.ofrenda.render();
        }, 500);
      }
    });
  }

  // ── Cross-Module Events ──────────────────────────────

  bindCrossModuleEvents() {
    // Navigate to story with pre-filled memory
    window.addEventListener('echoes:openStory', (e) => {
      this.nav.navigate('storyteller');
      const { memory } = e.detail;
      if (memory) {
        setTimeout(() => {
          const textarea = document.getElementById('story-input');
          if (textarea) {
            textarea.value = memory.content;
            showToast(`"${truncate(memory.title, 40)}" loaded into storyteller ✦`, 'info');
          }
        }, 200);
      }
    });

    // Refresh storyteller memory picker on vault navigation
    window.addEventListener('echoes:navigate', (e) => {
      if (e.detail.section === 'storyteller') {
        this.refreshMemoryPicker();
      }
    });
  }
}

// ── Init ────────────────────────────────────────────────

const app = new EchoesApp();
document.addEventListener('DOMContentLoaded', () => app.init());
