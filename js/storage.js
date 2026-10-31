/**
 * ECHOES – Storage Module
 * Manages all LocalStorage operations, export/import backups, categories, and settings.
 */

const STORAGE_KEYS = {
  MEMORIES: 'echoes_memories',
  OFRENDA: 'echoes_ofrenda',
  CONVERSATIONS: 'echoes_conversations',
  SETTINGS: 'echoes_settings',
  STORIES: 'echoes_stories',
  CUSTOM_CATEGORIES: 'echoes_custom_categories',
  ONBOARDED: 'echoes_onboarded',
};

export const Storage = {
  // ── Generic ──────────────────────────────────────

  get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.error(`[Storage] Failed to get "${key}":`, err);
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error(`[Storage] Failed to set "${key}":`, err);
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },

  clear() {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
  },

  // ── Onboarding State ─────────────────────────────

  isOnboarded() {
    return localStorage.getItem(STORAGE_KEYS.ONBOARDED) === 'true';
  },

  setOnboarded(value = true) {
    localStorage.setItem(STORAGE_KEYS.ONBOARDED, value ? 'true' : 'false');
  },

  // ── Memories ─────────────────────────────────────

  getMemories() {
    return this.get(STORAGE_KEYS.MEMORIES) || [];
  },

  saveMemory(memory) {
    const memories = this.getMemories();
    const existing = memories.findIndex(m => m.id === memory.id);
    if (existing >= 0) {
      memories[existing] = { ...memory, updatedAt: new Date().toISOString() };
    } else {
      memories.unshift({
        ...memory,
        createdAt: memory.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    return this.set(STORAGE_KEYS.MEMORIES, memories);
  },

  deleteMemory(id) {
    const memories = this.getMemories().filter(m => m.id !== id);
    return this.set(STORAGE_KEYS.MEMORIES, memories);
  },

  getMemory(id) {
    return this.getMemories().find(m => m.id === id) || null;
  },

  // ── Custom Categories & Tags ──────────────────────

  getCustomCategories() {
    return this.get(STORAGE_KEYS.CUSTOM_CATEGORIES) || [];
  },

  saveCustomCategory(name) {
    if (!name || typeof name !== 'string') return false;
    const clean = name.trim().toLowerCase();
    const cats = this.getCustomCategories();
    if (!cats.includes(clean)) {
      cats.push(clean);
      this.set(STORAGE_KEYS.CUSTOM_CATEGORIES, cats);
    }
    return true;
  },

  deleteCustomCategory(name) {
    const clean = (name || '').trim().toLowerCase();
    const cats = this.getCustomCategories().filter(c => c !== clean);
    return this.set(STORAGE_KEYS.CUSTOM_CATEGORIES, cats);
  },

  getAllTags() {
    const memories = this.getMemories();
    const tagCounts = {};
    memories.forEach(m => {
      (m.tags || []).forEach(t => {
        const clean = t.trim().toLowerCase();
        if (clean) tagCounts[clean] = (tagCounts[clean] || 0) + 1;
      });
    });
    return tagCounts;
  },

  // ── Ofrenda Cards ─────────────────────────────────

  getOfrendaCards() {
    return this.get(STORAGE_KEYS.OFRENDA) || [];
  },

  saveOfrendaCard(card) {
    const cards = this.getOfrendaCards();
    const existing = cards.findIndex(c => c.id === card.id);
    if (existing >= 0) {
      cards[existing] = { ...card, updatedAt: new Date().toISOString() };
    } else {
      cards.unshift({ ...card, createdAt: card.createdAt || new Date().toISOString() });
    }
    return this.set(STORAGE_KEYS.OFRENDA, cards);
  },

  deleteOfrendaCard(id) {
    const cards = this.getOfrendaCards().filter(c => c.id !== id);
    return this.set(STORAGE_KEYS.OFRENDA, cards);
  },

  // ── Conversations ─────────────────────────────────

  getConversations() {
    return this.get(STORAGE_KEYS.CONVERSATIONS) || [];
  },

  saveConversation(messages) {
    const convos = this.getConversations();
    const entry = {
      id: `convo_${Date.now()}`,
      messages,
      savedAt: new Date().toISOString(),
    };
    convos.unshift(entry);
    return this.set(STORAGE_KEYS.CONVERSATIONS, convos.slice(0, 20));
  },

  // ── Stories ───────────────────────────────────────

  getStories() {
    return this.get(STORAGE_KEYS.STORIES) || [];
  },

  saveStory(story) {
    const stories = this.getStories();
    stories.unshift({
      ...story,
      id: story.id || `story_${Date.now()}`,
      createdAt: new Date().toISOString(),
    });
    return this.set(STORAGE_KEYS.STORIES, stories.slice(0, 50));
  },

  // ── Settings ──────────────────────────────────────

  getSettings() {
    return this.get(STORAGE_KEYS.SETTINGS) || {
      particlesEnabled: true,
      ghostModeEnabled: false,
      soundEnabled: true,
      theme: 'dark',
    };
  },

  saveSetting(key, value) {
    const settings = this.getSettings();
    settings[key] = value;
    return this.set(STORAGE_KEYS.SETTINGS, settings);
  },

  // ── Export & Import Backups ────────────────────────

  exportBackup() {
    const bundle = {
      echoesBackupVersion: '1.2.0',
      exportedAt: new Date().toISOString(),
      appName: 'Echoes – The Offline Memory Keeper',
      data: {
        memories: this.getMemories(),
        ofrenda: this.getOfrendaCards(),
        stories: this.getStories(),
        conversations: this.getConversations(),
        customCategories: this.getCustomCategories(),
        settings: this.getSettings(),
      },
      stats: {
        memoryCount: this.getMemories().length,
        ofrendaCount: this.getOfrendaCards().length,
        storiesCount: this.getStories().length,
      },
    };

    const jsonStr = JSON.stringify(bundle, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const dateSlug = new Date().toISOString().split('T')[0];
    const link = document.createElement('a');
    link.href = url;
    link.download = `echoes-sanctuary-backup-${dateSlug}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return bundle;
  },

  importBackup(jsonString, mode = 'merge') {
    let parsed;
    try {
      parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
    } catch (err) {
      throw new Error('Invalid JSON file format.');
    }

    if (!parsed || (!parsed.data && !parsed.echoesBackupVersion && !Array.isArray(parsed))) {
      throw new Error('Unrecognized backup structure. Please provide a valid Echoes backup JSON.');
    }

    const payload = parsed.data || (Array.isArray(parsed) ? { memories: parsed } : parsed);
    const newMemories = Array.isArray(payload.memories) ? payload.memories : [];
    const newOfrenda = Array.isArray(payload.ofrenda) ? payload.ofrenda : [];
    const newStories = Array.isArray(payload.stories) ? payload.stories : [];
    const newCategories = Array.isArray(payload.customCategories) ? payload.customCategories : [];

    let importedMemories = 0;
    let importedOfrenda = 0;

    if (mode === 'replace') {
      this.set(STORAGE_KEYS.MEMORIES, newMemories);
      this.set(STORAGE_KEYS.OFRENDA, newOfrenda);
      this.set(STORAGE_KEYS.STORIES, newStories);
      if (newCategories.length) this.set(STORAGE_KEYS.CUSTOM_CATEGORIES, newCategories);
      importedMemories = newMemories.length;
      importedOfrenda = newOfrenda.length;
    } else {
      // Merge mode
      const currentMemories = this.getMemories();
      newMemories.forEach(nm => {
        const idx = currentMemories.findIndex(m => m.id === nm.id || (m.title === nm.title && m.content === nm.content));
        if (idx >= 0) {
          currentMemories[idx] = { ...currentMemories[idx], ...nm };
        } else {
          currentMemories.push(nm);
          importedMemories++;
        }
      });
      this.set(STORAGE_KEYS.MEMORIES, currentMemories);

      const currentOfrenda = this.getOfrendaCards();
      newOfrenda.forEach(no => {
        const idx = currentOfrenda.findIndex(o => o.id === no.id || (o.name === no.name && o.birthYear === no.birthYear));
        if (idx >= 0) {
          currentOfrenda[idx] = { ...currentOfrenda[idx], ...no };
        } else {
          currentOfrenda.push(no);
          importedOfrenda++;
        }
      });
      this.set(STORAGE_KEYS.OFRENDA, currentOfrenda);

      const currentStories = this.getStories();
      newStories.forEach(ns => {
        if (!currentStories.some(s => s.id === ns.id)) currentStories.push(ns);
      });
      this.set(STORAGE_KEYS.STORIES, currentStories);

      newCategories.forEach(c => this.saveCustomCategory(c));
    }

    return {
      success: true,
      mode,
      importedMemories,
      importedOfrenda,
      totalMemories: this.getMemories().length,
      totalOfrenda: this.getOfrendaCards().length,
    };
  },

  // ── Storage Utility ───────────────────────────────

  getStorageSize() {
    let size = 0;
    Object.values(STORAGE_KEYS).forEach(k => {
      const item = localStorage.getItem(k);
      if (item) size += item.length;
    });
    return (size / 1024).toFixed(2); // KB
  },
};

// ── Sample Data Seeder ────────────────────────────────

export function seedSampleData() {
  if (Storage.getMemories().length > 0) return;

  const sampleMemories = [
    {
      id: 'mem_001',
      title: 'Grandmother\'s Kitchen',
      content: `Every Sunday, the smell of cinnamon and brown sugar would drift through the house before I even opened my eyes. Abuela would be in the kitchen by 5am, humming old songs I never learned the words to but somehow always knew the melody of. The worn wooden spoon, the cracked ceramic bowl — they were magic in her hands.\n\nShe never measured anything. "You feel it," she would say, pressing my small hand into the dough. I thought I understood then. I didn't understand until she was gone.`,
      type: 'person',
      tags: ['family', 'love', 'cooking', 'childhood'],
      mood: 'nostalgic',
      createdAt: '2024-10-15T08:30:00.000Z',
      updatedAt: '2024-10-15T08:30:00.000Z',
    },
    {
      id: 'mem_002',
      title: 'The Last Train to Montmartre',
      content: `It was 2 AM and we had missed the last Métro. We didn't care. We walked from the 4th arrondissement all the way to Sacré-Cœur, the city impossibly quiet, impossibly beautiful. You were laughing at something I said, and the streetlights caught your eyes just so, and I thought — this. This is the moment I will carry forever.\n\nI still have the ticket stub from the train we never took.`,
      type: 'moment',
      tags: ['travel', 'paris', 'love', 'night'],
      mood: 'joyful',
      createdAt: '2024-09-22T14:20:00.000Z',
      updatedAt: '2024-09-22T14:20:00.000Z',
    },
    {
      id: 'mem_003',
      title: 'The Old Lighthouse at Dusk',
      content: `There is a lighthouse on the coast of Maine that nobody visits anymore. The keeper's cottage has long since fallen to weeds and salt wind. But the light still turns — automated now, mechanical, faithful without knowing what faithfulness means.\n\nI sat on the rocks below for three hours one August evening. The sky went from blue to amber to the deepest violet I have ever seen. I was completely alone, and for the first time in years, that felt like exactly what I needed.`,
      type: 'place',
      tags: ['solitude', 'ocean', 'peace', 'travel'],
      mood: 'peaceful',
      createdAt: '2024-08-08T19:45:00.000Z',
      updatedAt: '2024-08-08T19:45:00.000Z',
    },
    {
      id: 'mem_004',
      title: 'The Recurring Dream',
      content: `In the dream, there is always a library. The shelves go up forever, past clouds, past stars, into a darkness that somehow feels warm. Every book is one I have read, but none of the words are right — they shift when I try to read them, like they're written in a language I almost know.\n\nAt the center of the library there is always a single candle. And I always wake up just before I reach it.`,
      type: 'dream',
      tags: ['mystery', 'subconscious', 'light', 'longing'],
      mood: 'mysterious',
      createdAt: '2024-07-30T06:10:00.000Z',
      updatedAt: '2024-07-30T06:10:00.000Z',
    },
    {
      id: 'mem_005',
      title: 'First Day of Teaching',
      content: `Twenty-three faces looked up at me, and I had never felt so completely unprepared for anything in my life. The lesson plan I'd spent two weeks preparing suddenly seemed absurd — a map to a country that didn't exist.\n\nThen a girl in the third row raised her hand and asked, completely seriously: "Do you think Shakespeare was happy?" And everything changed. We talked for the whole period. I threw the lesson plan in the recycling bin when I got home. I was a teacher from that day forward.`,
      type: 'story',
      tags: ['teaching', 'growth', 'literature', 'purpose'],
      mood: 'transformative',
      createdAt: '2024-06-12T11:00:00.000Z',
      updatedAt: '2024-06-12T11:00:00.000Z',
    },
    {
      id: 'mem_006',
      title: 'Learning to Let Go',
      content: `The day I released the paper lantern into the night sky, I finally understood what everyone had been trying to tell me. Grief is not a wall you climb over. It is a river you learn to swim in — sometimes calm, sometimes wild, always changing you.\n\nThe lantern rose, small and bright, and then it was just another star among millions. That was enough. That was everything.`,
      type: 'moment',
      tags: ['grief', 'healing', 'release', 'stars'],
      mood: 'bittersweet',
      createdAt: '2024-11-01T21:30:00.000Z',
      updatedAt: '2024-11-01T21:30:00.000Z',
    },
  ];

  const sampleOfrenda = [
    {
      id: 'ofr_001',
      name: 'Elena Rosario Vega',
      birthYear: '1932',
      passYear: '2019',
      emoji: '🌹',
      message: 'You taught me that love is a verb, not a feeling. That it lives in small actions — the cup of tea brought without asking, the song hummed while washing dishes, the hand held in the dark. I hear you in every kitchen.',
      favorites: ['Cinnamon roses', 'Old boleros', 'Sunday mornings', 'Hibiscus tea', 'Stray cats'],
      photoUrl: null,
      createdAt: '2024-10-15T10:00:00.000Z',
    },
    {
      id: 'ofr_002',
      name: 'Captain James Whitmore',
      birthYear: '1948',
      passYear: '2021',
      emoji: '⚓',
      message: 'Dad, you smelled like engine oil and Old Spice and I never told you how much comfort that gave me. The sea was your first love, but you always came home. That\'s the bravest thing I know.',
      favorites: ['Deep sea fishing', 'Classic rock', 'Black coffee at dawn', 'Weather reports', 'His old Timex watch'],
      photoUrl: null,
      createdAt: '2024-10-15T10:30:00.000Z',
    },
    {
      id: 'ofr_003',
      name: 'Mochi',
      birthYear: '2009',
      passYear: '2023',
      emoji: '🐾',
      message: 'Fourteen years of unconditional love. You slept at my feet through breakups and breakthroughs, through panic attacks and dissertation defenses. The house is so quiet now. I keep your collar by the door.',
      favorites: ['Warm socks', 'Belly rubs', 'Morning walks', 'Peanut butter', 'The sunny spot on the rug'],
      photoUrl: null,
      createdAt: '2024-10-16T09:00:00.000Z',
    },
  ];

  sampleMemories.forEach(m => Storage.saveMemory(m));
  sampleOfrenda.forEach(c => Storage.saveOfrendaCard(c));
}
