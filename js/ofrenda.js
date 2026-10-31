/**
 * ECHOES – Digital Ofrenda Module
 * Features AI Remembrance Message Generator powered by local Ollama / Qwen2.5 3B
 */

import { Storage } from './storage.js';
import { generateOfrendaMessage } from './ai.js';
import {
  showToast, openModal, closeModal, generateId,
  formatDate, escapeHtml, clearElement, fileToBase64,
} from './utils.js';

export class DigitalOfrenda {
  constructor() {
    this.editingCardId = null;
    this.currentPhotoBase64 = null;
    this.favoritesList = [];
    this.ofrendaTone = 'emotional';
    this.isGeneratingAI = false;

    this.grid = document.getElementById('ofrenda-grid');
    this.init();
  }

  init() {
    this.bindAddButton();
    this.bindForm();
    this.bindModalClose();
    this.render();
  }

  // ── Render ───────────────────────────────────────────

  render() {
    if (!this.grid) return;
    const cards = Storage.getOfrendaCards();
    clearElement(this.grid);

    if (!cards.length) {
      this.grid.innerHTML = `
        <div class="memories-empty" style="grid-column:1/-1">
          <span class="memories-empty-icon">🕯</span>
          <h3 class="memories-empty-title">Light the first candle</h3>
          <p class="memories-empty-hint">Create a remembrance card to honor someone precious to you.</p>
          <button class="btn btn-gold mt-4" id="ofrenda-empty-btn">✦ Create Remembrance Card</button>
        </div>
      `;
      document.getElementById('ofrenda-empty-btn')?.addEventListener('click', () => this.openAddModal());
      return;
    }

    cards.forEach((card, i) => {
      const el = this.buildCard(card);
      el.style.animationDelay = `${i * 80}ms`;
      this.grid.appendChild(el);
    });
  }

  buildCard(card) {
    const el = document.createElement('div');
    el.className = 'remembrance-card';
    el.dataset.id = card.id;

    const photoHtml = card.photoUrl
      ? `<img src="${card.photoUrl}" alt="${escapeHtml(card.name)}" class="remembrance-card-photo-img">`
      : `<span class="card-photo-placeholder">${card.emoji || '🕊'}</span>`;

    const favoritesHtml = card.favorites?.length
      ? `<div class="remembrance-card-favorites">
           <span class="favorites-label">✦ Beloved things</span>
           <div class="favorites-list">
             ${card.favorites.slice(0, 5).map(f => `<span class="favorite-tag">${escapeHtml(f)}</span>`).join('')}
           </div>
         </div>`
      : '';

    const dates = [card.birthYear, card.passYear].filter(Boolean).join(' — ');

    el.innerHTML = `
      <div class="remembrance-card-actions">
        <button class="memory-action-btn edit-btn" title="Edit">✎</button>
        <button class="memory-action-btn delete delete-btn" title="Remove">✕</button>
      </div>
      <div class="remembrance-card-photo">${photoHtml}</div>
      <div class="remembrance-card-body">
        <div class="remembrance-card-top">${card.emoji || '🕊'}</div>
        <h3 class="remembrance-card-name">${escapeHtml(card.name)}</h3>
        ${dates ? `<p class="remembrance-card-dates">${escapeHtml(dates)}</p>` : ''}
        <div class="remembrance-card-divider"></div>
        <p class="remembrance-card-message">"${escapeHtml(card.message || '')}"</p>
        ${favoritesHtml}
      </div>
    `;

    el.querySelector('.edit-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openEditModal(card.id);
    });

    el.querySelector('.delete-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.confirmDelete(card.id, card.name);
    });

    return el;
  }

  // ── Modals ───────────────────────────────────────────

  openAddModal() {
    this.editingCardId = null;
    this.currentPhotoBase64 = null;
    this.favoritesList = [];
    this.ofrendaTone = 'emotional';
    this.resetForm();
    document.getElementById('ofrenda-modal-title').textContent = '✦ Create Remembrance Card';
    openModal('modal-ofrenda');
  }

  openEditModal(id) {
    const card = Storage.getOfrendaCards().find(c => c.id === id);
    if (!card) return;

    this.editingCardId = id;
    this.currentPhotoBase64 = card.photoUrl || null;
    this.favoritesList = [...(card.favorites || [])];

    this.resetForm();
    document.getElementById('ofrenda-name-input').value = card.name || '';
    document.getElementById('ofrenda-birth-input').value = card.birthYear || '';
    document.getElementById('ofrenda-pass-input').value = card.passYear || '';
    document.getElementById('ofrenda-emoji-input').value = card.emoji || '🕊';
    document.getElementById('ofrenda-message-input').value = card.message || '';

    if (this.currentPhotoBase64) {
      this.showPhotoPreview(this.currentPhotoBase64);
    }

    this.renderFavoriteChips();
    document.getElementById('ofrenda-modal-title').textContent = '✎ Edit Remembrance Card';
    openModal('modal-ofrenda');
  }

  resetForm() {
    document.getElementById('ofrenda-form')?.reset();
    const photoArea = document.getElementById('photo-upload-area');
    if (photoArea) {
      photoArea.classList.remove('has-image');
      const prevImg = photoArea.querySelector('.photo-preview-img');
      if (prevImg) prevImg.remove();
    }
    // Reset tone buttons
    document.querySelectorAll('.ofrenda-tone-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tone === 'emotional');
    });
    this.ofrendaTone = 'emotional';
    this.renderFavoriteChips();
  }

  showPhotoPreview(src) {
    const area = document.getElementById('photo-upload-area');
    if (!area) return;
    let img = area.querySelector('.photo-preview-img');
    if (!img) {
      img = document.createElement('img');
      img.className = 'photo-preview-img';
      area.appendChild(img);
    }
    img.src = src;
    area.classList.add('has-image');
  }

  renderFavoriteChips() {
    const container = document.getElementById('ofrenda-favorites-chips');
    if (!container) return;
    clearElement(container);
    this.favoritesList.forEach((fav, i) => {
      const chip = document.createElement('span');
      chip.className = 'favorite-chip';
      chip.innerHTML = `${escapeHtml(fav)} <span class="chip-remove" data-index="${i}">✕</span>`;
      chip.querySelector('.chip-remove').addEventListener('click', () => {
        this.favoritesList.splice(i, 1);
        this.renderFavoriteChips();
      });
      container.appendChild(chip);
    });
  }

  // ── AI Message Generation ─────────────────────────────

  async generateAIMessage() {
    if (this.isGeneratingAI) return;

    const name = document.getElementById('ofrenda-name-input')?.value.trim();
    if (!name) {
      showToast('Please enter the person\'s name first.', 'error');
      document.getElementById('ofrenda-name-input')?.focus();
      return;
    }

    const birthYear = document.getElementById('ofrenda-birth-input')?.value.trim();
    const passYear = document.getElementById('ofrenda-pass-input')?.value.trim();
    const emoji = document.getElementById('ofrenda-emoji-input')?.value.trim();
    const messageTextarea = document.getElementById('ofrenda-message-input');
    const aiBtn = document.getElementById('ofrenda-ai-generate-btn');

    this.isGeneratingAI = true;
    if (aiBtn) {
      aiBtn.disabled = true;
      aiBtn.innerHTML = '🕯 Inscribing…';
    }
    messageTextarea?.classList.add('generating-glow');

    try {
      const result = await generateOfrendaMessage({
        name,
        birthYear,
        passYear,
        emoji,
        favorites: this.favoritesList,
        tone: this.ofrendaTone,
      });

      if (messageTextarea && result.message) {
        messageTextarea.value = result.message;
        messageTextarea.focus();
      }

      if (result.isLocalAI) {
        showToast(`Remembrance inscribed by local AI (${result.model}) ✦`, 'success');
      } else {
        showToast(`Remembrance drafted via offline memory engine ✦`, 'info');
      }
    } catch (err) {
      showToast('Could not generate message: ' + err.message, 'error');
    } finally {
      this.isGeneratingAI = false;
      if (aiBtn) {
        aiBtn.disabled = false;
        aiBtn.innerHTML = '✦ Inscribe with AI';
      }
      messageTextarea?.classList.remove('generating-glow');
    }
  }

  saveCard() {
    const name = document.getElementById('ofrenda-name-input').value.trim();
    const message = document.getElementById('ofrenda-message-input').value.trim();

    if (!name) { showToast('Please enter a name.', 'error'); return; }

    const card = {
      id: this.editingCardId || generateId('ofr'),
      name,
      birthYear: document.getElementById('ofrenda-birth-input').value.trim(),
      passYear: document.getElementById('ofrenda-pass-input').value.trim(),
      emoji: document.getElementById('ofrenda-emoji-input').value.trim() || '🕊',
      message,
      favorites: [...this.favoritesList],
      photoUrl: this.currentPhotoBase64,
    };

    Storage.saveOfrendaCard(card);
    closeModal('modal-ofrenda');
    this.render();
    showToast('Remembrance card created ✦', 'success');
  }

  confirmDelete(id, name) {
    if (confirm(`Remove ${name}'s remembrance card? This action is permanent.`)) {
      Storage.deleteOfrendaCard(id);
      this.render();
      showToast('Card removed 🕊', 'info');
    }
  }

  // ── Event Binding ────────────────────────────────────

  bindAddButton() {
    document.getElementById('add-ofrenda-btn')?.addEventListener('click', () => this.openAddModal());
  }

  bindForm() {
    // Photo upload
    const photoInput = document.getElementById('ofrenda-photo-input');
    photoInput?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        showToast('Photo must be under 2MB.', 'error');
        return;
      }
      try {
        const base64 = await fileToBase64(file);
        this.currentPhotoBase64 = base64;
        this.showPhotoPreview(base64);
      } catch {
        showToast('Failed to load photo.', 'error');
      }
    });

    // Favorites input
    const favInput = document.getElementById('ofrenda-fav-input');
    const favBtn = document.getElementById('ofrenda-add-fav-btn');

    const addFav = () => {
      const val = favInput?.value.trim();
      if (val && !this.favoritesList.includes(val) && this.favoritesList.length < 10) {
        this.favoritesList.push(val);
        this.renderFavoriteChips();
        if (favInput) favInput.value = '';
      }
    };

    favInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addFav(); } });
    favBtn?.addEventListener('click', addFav);

    // AI message button
    document.getElementById('ofrenda-ai-generate-btn')?.addEventListener('click', () => this.generateAIMessage());

    // Tone buttons for Ofrenda AI
    document.querySelectorAll('.ofrenda-tone-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.ofrenda-tone-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.ofrendaTone = btn.dataset.tone || 'emotional';
      });
    });

    // Save
    document.getElementById('save-ofrenda-btn')?.addEventListener('click', () => this.saveCard());
  }

  bindModalClose() {
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
    });
  }
}
