/**
 * ECHOES – Onboarding Experience Module
 * Interactive multi-step guide introducing the dark gothic sanctuary,
 * local Ollama AI architecture, Voice Dictation, and memory preservation.
 */

import { Storage } from './storage.js';
import { sanctuaryAudio } from './audio.js';
import { openModal, closeModal } from './utils.js';

export class OnboardingTour {
  constructor() {
    this.currentStep = 0;
    this.modalId = 'modal-onboarding';
    this.totalSteps = 4;
  }

  init() {
    this.bindButtons();

    // Automatically trigger for first-time visitors
    if (!Storage.isOnboarded()) {
      setTimeout(() => {
        this.start();
      }, 800);
    }
  }

  start() {
    this.currentStep = 0;
    this.renderStep();
    openModal(this.modalId);
    sanctuaryAudio.playChime();
  }

  renderStep() {
    // Hide all step slides
    document.querySelectorAll('.onboarding-slide').forEach((slide, idx) => {
      slide.classList.toggle('active', idx === this.currentStep);
    });

    // Update dots
    document.querySelectorAll('.onboarding-dot').forEach((dot, idx) => {
      dot.classList.toggle('active', idx === this.currentStep);
      dot.classList.toggle('completed', idx < this.currentStep);
    });

    // Button states
    const prevBtn = document.getElementById('onboarding-prev-btn');
    const nextBtn = document.getElementById('onboarding-next-btn');

    if (prevBtn) {
      prevBtn.style.visibility = this.currentStep === 0 ? 'hidden' : 'visible';
    }

    if (nextBtn) {
      if (this.currentStep === this.totalSteps - 1) {
        nextBtn.innerHTML = '✦ Enter Sanctuary';
        nextBtn.className = 'btn btn-gold btn-sm';
      } else {
        nextBtn.innerHTML = 'Next →';
        nextBtn.className = 'btn btn-primary btn-sm';
      }
    }
  }

  next() {
    if (this.currentStep < this.totalSteps - 1) {
      this.currentStep++;
      this.renderStep();
      sanctuaryAudio.playChime();
    } else {
      this.finish();
    }
  }

  prev() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.renderStep();
    }
  }

  finish() {
    Storage.setOnboarded(true);
    closeModal(this.modalId);
    sanctuaryAudio.playCandleStrike();
  }

  bindButtons() {
    document.getElementById('onboarding-next-btn')?.addEventListener('click', () => this.next());
    document.getElementById('onboarding-prev-btn')?.addEventListener('click', () => this.prev());
    document.getElementById('onboarding-skip-btn')?.addEventListener('click', () => this.finish());

    // Navigation trigger
    document.querySelectorAll('[data-open-onboarding]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.start();
      });
    });

    // Dot click navigation
    document.querySelectorAll('.onboarding-dot').forEach((dot, idx) => {
      dot.addEventListener('click', () => {
        this.currentStep = idx;
        this.renderStep();
      });
    });
  }
}

export const onboarding = new OnboardingTour();

