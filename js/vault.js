/**
 * ECHOES – Memory Vault Module
 * Manages memory cards, search, filtering, custom categories, sorting,
 * export/import backups, and voice-assisted memory recording.
 */

import { Storage } from './storage.js';
import { voiceInput } from './speech.js';
import { sanctuaryAudio } from './audio.js';
import {
  showToast, openModal, closeModal, generateId,
  formatDate, formatRelativeDate, truncate, escapeHtml,
  debounce, clearElement, MEMORY_TYPES, MOODS, fileToBase64,
} from './utils.js';

export class MemoryVault {
  constructor() {
    this.currentFilter = 'all';
    this.currentMoodFilter = 'all';
    this.currentTagFilter = null;
    this.currentSort = 'newest';
    this.searchQuery = '';
    this.editingMemoryId = null;
    this.favoriteChips = [];

    this.grid = document.getElementById('memories-grid');
    this.countEl = document.getElementById('memory-count');
    this.filteredCountEl = document.getElementById('memory-filtered-count');
    this.modal = document.getElementById('modal-memory');
    this.detailModal = document.getElementById('modal-memory-detail');

    this.init();
  }

  init() {
    this.bindSearch();
    this.bindFilters();
    this.bindSort();
    this.bindAddButton();
    this.bindExportImport();
    this.bindVoiceInput();
    this.bindForm();
    this.bindModalClose();
    this.render();
  }

  // ── Data & Filtering ──────────────────────────────────

  getFilteredMemories() {
    let memories = Storage.getMemories();

    // Type filter
    if (this.currentFilter !== 'all') {
      memories = memories.filter(m => m.type === this.currentFilter);
    }

    // Mood filter
    if (this.currentMoodFilter !== 'all') {
      memories = memories.filter(m => m.mood === this.currentMoodFilter);
    }

    // Tag filter
    if (this.currentTagFilter) {
      memories = memories.filter(m =>
        (m.tags || []).some(t => t.toLowerCase() === this.currentTagFilter.toLowerCase())
      );
    }

    // Free text search
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      memories = memories.filter(m =>
        (m.title || '').toLowerCase().includes(q) ||
        (m.content || '').toLowerCase().includes(q) ||
        (m.mood || '').toLowerCase().includes(q) ||
        (m.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }

    // Sorting
    switch (this.currentSort) {
      case 'oldest':
        memories.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'title-asc':
        memories.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'mood':
        memories.sort((a, b) => (a.mood || '').localeCompare(b.mood || ''));
        break;
      case 'newest':
      default:
        memories.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
    }

    return memories;
  }

  // ── Render ───────────────────────────────────────────

  render() {
    if (!this.grid) return;
    const memories = this.getFilteredMemories();
    const all = Storage.getMemories();

    // Update counts
    if (this.countEl) this.countEl.textContent = all.length;
    if (this.filteredCountEl) {
      if (memories.length !== all.length) {
        this.filteredCountEl.textContent = `(Showing ${memories.length} of ${all.length})`;
      } else {
        this.filteredCountEl.textContent = '';
      }
    }

    // Update active tag chips filter indicator
    this.renderActiveFilterBar();

    clearElement(this.grid);

    if (!memories.length) {
      this.grid.appendChild(this.buildEmptyState());
      return;
    }

    memories.forEach((memory, i) => {
      const card = this.buildMemoryCard(memory);
      card.style.animationDelay = `${i * 50}ms`;
      this.grid.appendChild(card);
    });
  }

  renderActiveFilterBar() {
    const filterBar = document.getElementById('vault-active-filters');
    if (!filterBar) return;
    clearElement(filterBar);

    if (this.currentTagFilter) {
      const tagPill = document.createElement('div');
      tagPill.className = 'active-filter-chip';
      tagPill.innerHTML = `<span>Tag: <strong>#${escapeHtml(this.currentTagFilter)}</strong></span> <button class="chip-remove" title="Clear tag filter">✕</button>`;
      tagPill.querySelector('.chip-remove').addEventListener('click', () => {
        this.currentTagFilter = null;
        this.render();
      });
      filterBar.appendChild(tagPill);
    }
  }

  buildEmptyState() {
    const el = document.createElement('div');
    el.className = 'memories-empty';
    el.innerHTML = `
      <span class="memories-empty-icon">🌙</span>
      <h3 class="memories-empty-title">
        ${this.searchQuery || this.currentFilter !== 'all' || this.currentTagFilter ? 'No matching memories found' : 'Your vault awaits'}
      </h3>
      <p class="memories-empty-hint">
        ${this.searchQuery || this.currentFilter !== 'all' || this.currentTagFilter
          ? 'Try adjusting your search terms, tag filters, or categories.'
          : 'Every memory you cherish deserves a home. Begin by preserving your first one.'}
      </p>
      ${!this.searchQuery && this.currentFilter === 'all' && !this.currentTagFilter
        ? `<button class="btn btn-primary mt-4" id="empty-add-btn">✦ Add First Memory</button>`
        : `<button class="btn btn-ghost mt-4" id="empty-reset-filters-btn">↺ Reset Filters</button>`}
    `;

    el.querySelector('#empty-add-btn')?.addEventListener('click', () => this.openAddModal());
    el.querySelector('#empty-reset-filters-btn')?.addEventListener('click', () => {
      this.searchQuery = '';
      this.currentFilter = 'all';
      this.currentMoodFilter = 'all';
      this.currentTagFilter = null;
      const searchInput = document.getElementById('memory-search');
      if (searchInput) searchInput.value = '';
      const moodSelect = document.getElementById('vault-mood-filter');
      if (moodSelect) moodSelect.value = 'all';
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
      this.render();
    });

    return el;
  }

  buildMemoryCard(memory) {
    const typeInfo = MEMORY_TYPES[memory.type] || { emoji: '✨', label: memory.type };
    const moodInfo = MOODS.find(m => m.value === memory.mood);
    const card = document.createElement('div');
    card.className = 'memory-card';
    card.dataset.type = memory.type;
    card.dataset.id = memory.id;

    card.innerHTML = `
      <div class="memory-card-header">
        <span class="memory-type-badge" data-type="${memory.type}">
          ${typeInfo.emoji} ${typeInfo.label}
        </span>
        ${moodInfo ? `<span class="badge badge-purple" style="font-size:10px; padding:2px 8px;">${moodInfo.label}</span>` : ''}
        <div class="memory-card-actions">
          <button class="memory-action-btn edit-btn" title="Edit" aria-label="Edit memory">✎</button>
          <button class="memory-action-btn delete delete-btn" title="Delete" aria-label="Delete memory">✕</button>
        </div>
      </div>
      <h3 class="memory-card-title">${escapeHtml(memory.title)}</h3>
      <p class="memory-card-preview line-clamp-3">${escapeHtml(truncate(memory.content, 140))}</p>
      <div class="memory-card-footer">
        <span class="memory-date">${formatRelativeDate(memory.createdAt)}</span>
        <div class="memory-tags">
          ${(memory.tags || []).slice(0, 3).map(t => `<button class="memory-tag tag-click-filter" data-tag="${escapeHtml(t)}" title="Filter by #${escapeHtml(t)}">#${escapeHtml(t)}</button>`).join('')}
        </div>
      </div>
    `;

    // Tag click filters
    card.querySelectorAll('.tag-click-filter').forEach(tBtn => {
      tBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.currentTagFilter = tBtn.dataset.tag;
        this.render();
      });
    });

    card.addEventListener('click', (e) => {
      if (e.target.closest('.edit-btn')) { e.stopPropagation(); this.openEditModal(memory.id); return; }
      if (e.target.closest('.delete-btn')) { e.stopPropagation(); this.confirmDelete(memory.id, memory.title); return; }
      this.openDetailModal(memory.id);
    });

    return card;
  }

  // ── Modals ───────────────────────────────────────────

  openAddModal() {
    this.editingMemoryId = null;
    this.favoriteChips = [];
    this.resetForm();
    document.getElementById('memory-modal-title').textContent = '✦ New Memory';
    openModal('modal-memory');
  }

  openEditModal(id) {
    const memory = Storage.getMemory(id);
    if (!memory) return;
    this.editingMemoryId = id;
    this.populateForm(memory);
    document.getElementById('memory-modal-title').textContent = '✎ Edit Memory';
    openModal('modal-memory');
  }

  openDetailModal(id) {
    const memory = Storage.getMemory(id);
    if (!memory) return;
    const typeInfo = MEMORY_TYPES[memory.type] || { emoji: '✨', label: memory.type };

    document.getElementById('detail-title').textContent = memory.title;
    document.getElementById('detail-type').textContent = `${typeInfo.emoji} ${typeInfo.label}`;
    document.getElementById('detail-type').dataset.type = memory.type;
    document.getElementById('detail-date').textContent = formatDate(memory.createdAt);
    document.getElementById('detail-body').textContent = memory.content;

    const tagsEl = document.getElementById('detail-tags');
    tagsEl.innerHTML = (memory.tags || []).map(t => `<span class="favorite-chip">#${escapeHtml(t)}</span>`).join('');

    document.getElementById('detail-edit-btn').onclick = () => {
      closeModal('modal-memory-detail');
      this.openEditModal(id);
    };

    document.getElementById('detail-story-btn').onclick = () => {
      closeModal('modal-memory-detail');
      window.dispatchEvent(new CustomEvent('echoes:openStory', { detail: { memory } }));
    };

    openModal('modal-memory-detail');
  }

  // ── Form ─────────────────────────────────────────────

  resetForm() {
    const form = document.getElementById('memory-form');
    if (!form) return;
    document.getElementById('memory-title-input').value = '';
    document.getElementById('memory-content-input').value = '';

    // Reset type selector
    document.querySelectorAll('.type-option').forEach(opt => opt.classList.remove('selected'));
    document.querySelector('.type-option[data-type="moment"]')?.classList.add('selected');
    document.getElementById('memory-type-input').value = 'moment';

    // Clear tags
    clearElement(document.getElementById('memory-tags-display'));
    this.favoriteChips = [];
  }

  populateForm(memory) {
    this.resetForm();
    document.getElementById('memory-title-input').value = memory.title || '';
    document.getElementById('memory-content-input').value = memory.content || '';
    document.getElementById('memory-mood-input').value = memory.mood || '';

    // Type
    document.querySelectorAll('.type-option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.type === memory.type);
    });
    document.getElementById('memory-type-input').value = memory.type || 'moment';

    // Tags
    this.favoriteChips = [...(memory.tags || [])];
    this.renderTagChips();
  }

  renderTagChips() {
    const container = document.getElementById('memory-tags-display');
    if (!container) return;
    clearElement(container);
    this.favoriteChips.forEach((tag, i) => {
      const chip = document.createElement('span');
      chip.className = 'favorite-chip';
      chip.innerHTML = `#${escapeHtml(tag)} <span class="chip-remove" data-index="${i}">✕</span>`;
      chip.querySelector('.chip-remove').addEventListener('click', () => {
        this.favoriteChips.splice(i, 1);
        this.renderTagChips();
      });
      container.appendChild(chip);
    });
  }

  saveMemory() {
    const title = document.getElementById('memory-title-input').value.trim();
    const content = document.getElementById('memory-content-input').value.trim();
    const type = document.getElementById('memory-type-input').value;
    const mood = document.getElementById('memory-mood-input').value;

    if (!title) {
      showToast('Please provide a title for your memory.', 'error');
      document.getElementById('memory-title-input').focus();
      return;
    }
    if (!content) {
      showToast('Please describe your memory.', 'error');
      document.getElementById('memory-content-input').focus();
      return;
    }

    const memory = {
      id: this.editingMemoryId || generateId('mem'),
      title,
      content,
      type,
      mood,
      tags: [...this.favoriteChips],
    };

    Storage.saveMemory(memory);
    sanctuaryAudio.playCandleStrike();
    closeModal('modal-memory');
    this.render();
    showToast(
      this.editingMemoryId ? 'Memory updated in the vault ✦' : 'Memory preserved forever in the vault ✦',
      'success'
    );
  }

  confirmDelete(id, title) {
    if (confirm(`Remove "${title}" from your vault? This cannot be undone.`)) {
      Storage.deleteMemory(id);
      this.render();
      showToast('Memory released to the wind 🕊', 'info');
    }
  }

  // ── Search & Filter Bindings ──────────────────────────

  bindSearch() {
    const input = document.getElementById('memory-search');
    const clearBtn = document.getElementById('memory-search-clear');

    input?.addEventListener('input', debounce((e) => {
      this.searchQuery = e.target.value.trim();
      if (clearBtn) clearBtn.classList.toggle('hidden', !this.searchQuery);
      this.render();
    }, 250));

    clearBtn?.addEventListener('click', () => {
      if (input) input.value = '';
      this.searchQuery = '';
      clearBtn.classList.add('hidden');
      this.render();
    });
  }

  bindFilters() {
    // Type Filter Pills
    document.querySelectorAll('.vault-type-filters .filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.vault-type-filters .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.filter;
        this.render();
      });
    });

    // Mood Filter Dropdown
    const moodSelect = document.getElementById('vault-mood-filter');
    if (moodSelect) {
      moodSelect.innerHTML = `<option value="all">All Moods</option>` +
        MOODS.map(m => `<option value="${m.value}">${m.label}</option>`).join('');
      moodSelect.addEventListener('change', () => {
        this.currentMoodFilter = moodSelect.value;
        this.render();
      });
    }
  }

  bindSort() {
    const sortSelect = document.getElementById('vault-sort-select');
    sortSelect?.addEventListener('change', () => {
      this.currentSort = sortSelect.value;
      this.render();
    });
  }

  bindAddButton() {
    document.getElementById('add-memory-btn')?.addEventListener('click', () => this.openAddModal());
  }

  // ── Backup Export / Import ────────────────────────────

  bindExportImport() {
    // Export backup
    const exportBtns = [
      document.getElementById('vault-export-btn'),
      document.getElementById('privacy-export-btn'),
    ];

    exportBtns.forEach(btn => {
      btn?.addEventListener('click', () => {
        try {
          const bundle = Storage.exportBackup();
          sanctuaryAudio.playChime();
          showToast(`Sanctuary backup exported (${bundle.stats.memoryCount} memories) ✦`, 'success');
        } catch (err) {
          showToast('Failed to export backup: ' + err.message, 'error');
        }
      });
    });

    // Import backup trigger file inputs
    const importInput = document.getElementById('vault-import-input');
    const importBtns = [
      document.getElementById('vault-import-btn'),
      document.getElementById('privacy-import-btn'),
    ];

    importBtns.forEach(btn => {
      btn?.addEventListener('click', () => {
        importInput?.click();
      });
    });

    importInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const mode = confirm('Do you want to MERGE with existing memories?\nClick OK to Merge, or Cancel to Replace entire vault.')
          ? 'merge'
          : 'replace';

        const result = Storage.importBackup(text, mode);
        sanctuaryAudio.playChime();
        this.render();
        showToast(
          `Backup imported successfully! (${result.totalMemories} total memories) ✦`,
          'success',
          4000
        );
      } catch (err) {
        showToast('Import error: ' + err.message, 'error', 4500);
      } finally {
        importInput.value = '';
      }
    });
  }

  // ── Voice Input Attachment ────────────────────────────

  bindVoiceInput() {
    const voiceBtn = document.getElementById('memory-content-voice-btn');
    const contentTextarea = document.getElementById('memory-content-input');
    if (voiceBtn && contentTextarea) {
      voiceInput.attach(voiceBtn, contentTextarea);
    }
  }

  bindForm() {
    // Type selector
    document.querySelectorAll('.type-option').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.type-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        document.getElementById('memory-type-input').value = opt.dataset.type;
      });
    });

    // Tag input
    const tagInput = document.getElementById('memory-tag-input');
    const tagAddBtn = document.getElementById('add-tag-btn');

    const addTag = () => {
      const val = tagInput?.value.trim().toLowerCase().replace(/^#/, '');
      if (val && !this.favoriteChips.includes(val) && this.favoriteChips.length < 8) {
        this.favoriteChips.push(val);
        this.renderTagChips();
        if (tagInput) tagInput.value = '';
      }
    };

    tagInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTag();
      }
    });
    tagAddBtn?.addEventListener('click', addTag);

    // Save button
    document.getElementById('save-memory-btn')?.addEventListener('click', () => this.saveMemory());

    // Mood select
    const moodSelect = document.getElementById('memory-mood-input');
    if (moodSelect) {
      moodSelect.innerHTML = `<option value="">Choose a mood...</option>` +
        MOODS.map(m => `<option value="${m.value}">${m.label}</option>`).join('');
    }
  }

  bindModalClose() {
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
    });
  }
}
