/**
 * ECHOES – Web Speech API Module
 * Provides optional voice-based dictation for memories, storytelling, and chat.
 * Runs 100% locally in supporting browsers with zero third-party audio transmission.
 */

import { showToast } from './utils.js';

export class VoiceInputManager {
  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.isSupported = !!SpeechRecognition;
    this.recognition = this.isSupported ? new SpeechRecognition() : null;
    this.isListening = false;
    this.activeTarget = null;
    this.activeBtn = null;

    if (this.isSupported) {
      this.initRecognition();
    }
  }

  initRecognition() {
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.activeBtn) {
        this.activeBtn.classList.add('listening');
        this.activeBtn.setAttribute('aria-pressed', 'true');
        this.activeBtn.title = 'Listening… Click to stop dictation';
      }
      showToast('🎤 Voice dictation active. Speak freely…', 'info', 2500);
    };

    this.recognition.onresult = (event) => {
      if (!this.activeTarget) return;

      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        const currentVal = this.activeTarget.value;
        const needsSpace = currentVal && !currentVal.endsWith(' ') && !currentVal.endsWith('\n');
        this.activeTarget.value = (currentVal + (needsSpace ? ' ' : '') + finalTranscript).trimStart();
        this.activeTarget.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    this.recognition.onerror = (event) => {
      console.warn('[SpeechRecognition] Error:', event.error);
      let errorMsg = 'Voice dictation error: ' + event.error;
      if (event.error === 'not-allowed') {
        errorMsg = 'Microphone permission was denied. Please allow microphone access in your browser.';
      } else if (event.error === 'no-speech') {
        errorMsg = 'No speech detected. Microphone stopped.';
      }
      showToast(errorMsg, 'warning');
      this.stop();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.activeBtn) {
        this.activeBtn.classList.remove('listening');
        this.activeBtn.setAttribute('aria-pressed', 'false');
        this.activeBtn.title = 'Start voice dictation';
      }
    };
  }

  /**
   * Attach voice input to a button and target input/textarea
   */
  attach(buttonEl, targetInputEl) {
    if (!buttonEl || !targetInputEl) return;

    if (!this.isSupported) {
      buttonEl.style.opacity = '0.4';
      buttonEl.title = 'Web Speech API is not supported in this browser';
      buttonEl.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Voice dictation requires Chrome, Edge, or a Web Speech API enabled browser.', 'info');
      });
      return;
    }

    buttonEl.addEventListener('click', (e) => {
      e.preventDefault();
      if (this.isListening && this.activeBtn === buttonEl) {
        this.stop();
      } else {
        this.start(buttonEl, targetInputEl);
      }
    });
  }

  start(buttonEl, targetInputEl) {
    if (!this.isSupported) return;

    // If already listening on another field, stop first
    if (this.isListening) {
      this.stop();
    }

    this.activeBtn = buttonEl;
    this.activeTarget = targetInputEl;

    try {
      this.recognition.start();
    } catch (err) {
      console.warn('[SpeechRecognition] Could not start:', err);
    }
  }

  stop() {
    if (!this.isSupported || !this.isListening) return;
    try {
      this.recognition.stop();
    } catch (err) {
      console.warn('[SpeechRecognition] Could not stop:', err);
    }
    this.isListening = false;
    if (this.activeBtn) {
      this.activeBtn.classList.remove('listening');
      this.activeBtn.setAttribute('aria-pressed', 'false');
    }
    this.activeBtn = null;
    this.activeTarget = null;
  }
}

export const voiceInput = new VoiceInputManager();

