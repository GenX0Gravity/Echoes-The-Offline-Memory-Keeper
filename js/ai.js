/**
 * ECHOES – AI Storyteller & Companion Logic
 * Integrated with Local Ollama (default: Qwen2.5 3B) via Express Backend.
 * Features automatic, graceful offline fallback to pattern-based generation.
 * Zero external cloud AI APIs; 100% private and on-device.
 */

// ── TONES DEFINITION ─────────────────────────────────────

export const AI_TONES = {
  emotional: {
    id: 'emotional',
    label: 'Emotional',
    icon: '❤️',
    description: 'Deeply touching, honoring raw feeling, vulnerability, and heart.',
  },
  nostalgic: {
    id: 'nostalgic',
    label: 'Nostalgic',
    icon: '🌅',
    description: 'Warm, golden, reminiscent of times past and fleeting seasons.',
  },
  poetic: {
    id: 'poetic',
    label: 'Poetic',
    icon: '🌸',
    description: 'Lyrical, metaphorical, philosophical, rich in gothic imagery.',
  },
  storytelling: {
    id: 'storytelling',
    label: 'Storytelling',
    icon: '📖',
    description: 'Cinematic narrative with dramatic arc and vivid atmosphere.',
  },
};

// ── OLLAMA STATUS & CONFIGURATION API ─────────────────────

const savedHost = typeof localStorage !== 'undefined' ? localStorage.getItem('echoes_ollama_host') : null;
const savedModel = typeof localStorage !== 'undefined' ? localStorage.getItem('echoes_ollama_model') : null;

let currentAIStatus = {
  connected: false,
  model: savedModel || 'qwen2.5:3b',
  host: savedHost || 'http://127.0.0.1:11434',
  availableModels: [],
  hasModel: false,
  isTunnel: false,
  isCloud: false,
  message: 'Checking AI status...',
};

/**
 * Check connection to local or tunneled Ollama via backend
 */
export async function checkOllamaStatus() {
  const isCloud = typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';

  const isTunnel = !!(currentAIStatus.host &&
    !currentAIStatus.host.includes('127.0.0.1') &&
    !currentAIStatus.host.includes('localhost'));

  try {
    const query = currentAIStatus.host ? `?host=${encodeURIComponent(currentAIStatus.host)}` : '';
    const response = await fetch(`/api/status${query}`, {
      headers: {
        'x-ollama-host': currentAIStatus.host || 'http://127.0.0.1:11434',
      },
      signal: AbortSignal.timeout(4500),
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const data = await response.json();
    currentAIStatus = {
      ...data,
      isTunnel,
      isCloud,
    };
    return currentAIStatus;
  } catch (err) {
    currentAIStatus = {
      connected: false,
      model: currentAIStatus.model || 'qwen2.5:3b',
      host: currentAIStatus.host || 'http://127.0.0.1:11434',
      availableModels: [],
      hasModel: false,
      isTunnel,
      isCloud,
      error: err.message,
      message: isCloud && !isTunnel
        ? 'Vercel cloud preview active. Using offline memory engine. (Connect local Ollama via tunnel in AI Settings)'
        : 'Ollama offline. Using built-in offline memory engine.',
    };
    return currentAIStatus;
  }
}

/**
 * Configure active model or host in backend and persist to localStorage
 */
export async function configureOllama({ model, host }) {
  if (host) {
    currentAIStatus.host = host.trim();
    try { localStorage.setItem('echoes_ollama_host', currentAIStatus.host); } catch {}
  }
  if (model) {
    currentAIStatus.model = model.trim();
    try { localStorage.setItem('echoes_ollama_model', currentAIStatus.model); } catch {}
  }

  try {
    const response = await fetch('/api/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ollama-host': currentAIStatus.host,
      },
      body: JSON.stringify({ model: currentAIStatus.model, host: currentAIStatus.host }),
    });

    if (!response.ok) throw new Error('Failed to update config on server');
    const data = await response.json();

    const isCloud = typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1';

    const isTunnel = !!(currentAIStatus.host &&
      !currentAIStatus.host.includes('127.0.0.1') &&
      !currentAIStatus.host.includes('localhost'));

    currentAIStatus = {
      ...data.status,
      isTunnel,
      isCloud,
    };
    return data;
  } catch (err) {
    console.warn('[AI] Remote config update warning, keeping client settings:', err.message);
    return { success: false, error: err.message, status: currentAIStatus };
  }
}

export function getCachedAIStatus() {
  return currentAIStatus;
}

// ── STORY GENERATOR (OLLAMA + OFFLINE FALLBACK) ──────────

/**
 * Converts memory into an emotional story.
 * Uses local Ollama (qwen2.5:3b by default) with automatic offline fallback.
 */
export async function generateStory(input, tone = 'poetic', title = '') {
  // Try local or tunneled Ollama first
  try {
    const response = await fetch('/api/story', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ollama-host': currentAIStatus.host,
      },
      body: JSON.stringify({
        memoryContent: input,
        tone,
        memoryTitle: title,
        model: currentAIStatus.model,
        host: currentAIStatus.host,
      }),
      signal: AbortSignal.timeout(90000), // 90s for local models
    });

    if (response.ok) {
      const data = await response.json();
      return {
        story: data.story,
        model: data.model || currentAIStatus.model,
        isLocalAI: true,
        isTunnel: currentAIStatus.isTunnel,
        tone: data.tone,
        durationMs: data.durationMs,
      };
    }
  } catch (err) {
    console.warn('[AI Storyteller] Ollama unavailable, using offline fallback:', err.message);
  }

  // Graceful offline fallback
  const fallbackStory = await generateOfflineStory(input, tone);
  return {
    story: fallbackStory,
    model: 'Offline Engine (Pattern AI)',
    isLocalAI: false,
    tone,
    hint: 'Generated via offline memory engine. Start Ollama with "ollama serve" for full local LLM generation.',
  };
}

// ── MEMORY COMPANION CHAT (OLLAMA + OFFLINE FALLBACK) ────

/**
 * Memory Companion multi-turn chat.
 * Empathizes and asks thoughtful follow-up questions to help users preserve memories.
 */
export async function getCompanionResponse(userMessage, conversationHistory = [], tone = 'emotional') {
  // Format history for backend
  const formattedHistory = conversationHistory.map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content,
  }));

  // Append latest user message if not already present
  if (!formattedHistory.length || formattedHistory[formattedHistory.length - 1].content !== userMessage) {
    formattedHistory.push({ role: 'user', content: userMessage });
  }

  // Try local or tunneled Ollama
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ollama-host': currentAIStatus.host,
      },
      body: JSON.stringify({
        messages: formattedHistory,
        tone,
        model: currentAIStatus.model,
        host: currentAIStatus.host,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        reply: data.reply,
        model: data.model || currentAIStatus.model,
        isLocalAI: true,
        isTunnel: currentAIStatus.isTunnel,
      };
    }
  } catch (err) {
    console.warn('[AI Companion] Ollama unavailable, using offline fallback:', err.message);
  }

  // Offline fallback with follow-up inquiry
  const fallbackReply = await generateOfflineCompanionReply(userMessage, tone);
  return {
    reply: fallbackReply,
    model: 'Offline Engine (Pattern AI)',
    isLocalAI: false,
  };
}

// ── DIGITAL OFRENDA MESSAGE GENERATOR ─────────────────────

/**
 * Generates an ofrenda remembrance dedication message.
 */
export async function generateOfrendaMessage({ name, birthYear, passYear, emoji, favorites = [], traits = '', tone = 'emotional' }) {
  // Try local or tunneled Ollama
  try {
    const response = await fetch('/api/ofrenda/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ollama-host': currentAIStatus.host,
      },
      body: JSON.stringify({
        name,
        birthYear,
        passYear,
        emoji,
        favorites,
        traits,
        tone,
        model: currentAIStatus.model,
        host: currentAIStatus.host,
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        message: data.message,
        model: data.model || currentAIStatus.model,
        isLocalAI: true,
        isTunnel: currentAIStatus.isTunnel,
      };
    }
  } catch (err) {
    console.warn('[AI Ofrenda] Ollama unavailable, using offline fallback:', err.message);
  }

  // Offline tribute generator
  const fallbackMsg = generateOfflineOfrendaTribute({ name, favorites, tone, traits });
  return {
    message: fallbackMsg,
    model: 'Offline Engine (Pattern AI)',
    isLocalAI: false,
  };
}

// ── OFFLINE DEMO ENGINES ──────────────────────────────────

const OFFLINE_STORY_TEMPLATES = {
  emotional: [
    (title, text) => `**${title}**\n\nThere is a place inside the chest where memories do not fade — they only deepen, like water in a stone basin. When you speak of this, every word carries the ache of genuine human tenderness.\n\n${generateEmotionalCore(text)}\n\nTo hold someone or something so dearly that the remembering itself brings tears is not sorrow; it is the highest testimony of love. Some moments are born to be eternal. This is one of them.`,
    (title, text) => `**${title}: The Heart's Chronicle**\n\nIf love could take a physical form, it would look like this moment caught in stillness. Nothing was wasted; no touch, no pause was without purpose.\n\n${transformToStoryArc(text)}\n\nWhat stays behind is not just the memory, but the way it remade you. You carry their presence in every breath you take forward.`,
  ],
  nostalgic: [
    (title, text) => `**${title}: In the Golden Light**\n\nThe hours from that time smelled of sunlight on old wood and quiet afternoons that seemed as though they would never end. You can almost reach out your hand and feel the exact temperature of the air.\n\n${generateNostalgicTexture(text)}\n\nThe clock moved forward, as clocks always do, but in the quiet chambers of memory, that season remains untouched by autumn or winter. Still warm. Still yours.`,
  ],
  poetic: [
    (title, text) => `**${title}**\n\nThere is a kind of memory that does not age — it lives outside of time, preserved in amber, golden and untouchable. This is such a memory.\n\n${generatePoeticism(text)}\n\nSome things do not end. They only become quiet, like a candle moved to another room — its light still warm, still real, even when you cannot see the flame.\n\nAnd so this remains: ${extractEssence(text)} A whisper in the architecture of who you are becoming.`,
    (title, text) => `**${title}: A Meditation in Shadows**\n\nI have been turning this memory over in my hands, the way you turn a river stone — finding its smoothness, its weight, the way light moves across it differently each time.\n\n${transformToPoetry(text)}\n\nThis is the strange alchemy of memory: it keeps becoming something new. The past is not fixed — it breathes, it shifts, it grows into something sacred.`,
  ],
  storytelling: [
    (title, text) => `**${title}: The Unfolding**\n\nEvery great memory begins with an ordinary detail before the world shifts beneath your feet.\n\n${transformToStoryArc(text)}\n\nYears from now, when the details of lesser days have dissolved into fog, this chapter will remain sharply etched — a testament to the hour when time held its breath.`,
  ],
};

function generateOfflineStory(input, tone) {
  return new Promise(resolve => {
    setTimeout(() => {
      const templates = OFFLINE_STORY_TEMPLATES[tone] || OFFLINE_STORY_TEMPLATES.poetic;
      const template = templates[Math.floor(Math.random() * templates.length)];
      const firstSentence = input.split(/[.!?\n]/)[0]?.trim();
      const title = firstSentence?.length > 4 && firstSentence.length < 50
        ? firstSentence
        : 'A Memory Suspended in Time';
      resolve(template(title, input));
    }, 1200);
  });
}

function generateEmotionalCore(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const core = sentences[0]?.trim() || text;
  return `"${core}" — it echoed long after the moment passed. The truth is, we do not grieve what was small; we grieve what was vast enough to fill our lives with meaning.`;
}

function generateNostalgicTexture(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 8);
  return sentences.slice(0, 3).map(s => `${s.trim()}.`).join(' ') || text;
}

function generatePoeticism(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  if (!sentences.length) return text;
  const key = sentences[Math.floor(sentences.length * 0.3)]?.trim();
  return `"${key || sentences[0].trim()}" — these words have lived inside me longer than I knew how to explain them. ${sentences.slice(-1)[0]?.trim() || ''}. Some things ask only to be felt.`;
}

function extractEssence(text) {
  const words = text.split(' ');
  return `"${words.slice(0, 10).join(' ')}..."`;
}

function transformToPoetry(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 8);
  return sentences.slice(0, 3).map(s => `\n*${s.trim()}.*`).join('\n') || text;
}

function transformToStoryArc(text) {
  return text.split(/[.!?]+/).filter(Boolean).map(s => s.trim()).slice(0, 4).join('. ') + '.';
}

// ── OFFLINE COMPANION LOGIC WITH FOLLOW-UP QUESTIONS ──────

const COMPANION_FOLLOWUPS = [
  "What did the air or the light feel like in that exact moment?",
  "If you close your eyes right now, what sound or scent from that day comes back first?",
  "What was something left unsaid between you that still lingers in your thoughts?",
  "What was their laugh like, and when was the last time you heard it?",
  "How has that memory changed the way you look at the world today?",
  "What is the one small detail about them you are most afraid of forgetting?",
];

const COMPANION_PATTERNS = [
  {
    triggers: ['remember', 'memory', 'memories', 'recall', 'reminisce', 'forgot'],
    reply: "Memory is such a peculiar miracle — a single scent or slant of light can collapse years in an instant. I'm listening closely.",
    followUp: "When this memory surfaces, where does it land in you first? What sensory detail feels most alive?",
  },
  {
    triggers: ['miss', 'missing', 'lost', 'gone', 'grief', 'grieve', 'died', 'death', 'passed', 'passed away'],
    reply: "Grief is love with nowhere left to go — proof that someone was profoundly cherished. You don't have to carry that weight alone tonight.",
    followUp: "Tell me about one of their everyday gestures or phrases. How do you feel their presence around you now?",
  },
  {
    triggers: ['happy', 'joy', 'wonderful', 'beautiful', 'love', 'grateful', 'thankful', 'laugh'],
    reply: "There is quiet defiance in holding onto joy. Those golden moments deserve witnesses just as much as sorrow does.",
    followUp: "What made that moment feel so complete? Was there a specific look or word that sealed it?",
  },
  {
    triggers: ['dream', 'dreamed', 'dreamt', 'nightmare', 'sleep', 'night'],
    reply: "Dreams are the subconscious speaking in sacred symbols, bridging the waking world and what our hearts yearn to resolve.",
    followUp: "What feeling did the dream leave you with when your eyes first opened to the morning?",
  },
];

function generateOfflineCompanionReply(userMessage, tone) {
  return new Promise(resolve => {
    setTimeout(() => {
      const msg = userMessage.toLowerCase();
      let matched = COMPANION_PATTERNS.find(p => p.triggers.some(t => msg.includes(t)));

      const randomFollowUp = COMPANION_FOLLOWUPS[Math.floor(Math.random() * COMPANION_FOLLOWUPS.length)];

      if (matched) {
        resolve(`${matched.reply}\n\n${matched.followUp}`);
      } else {
        const fallbacks = [
          `I am sitting quietly with what you just shared. Every memory you put into words is an altar built against forgetting.\n\n${randomFollowUp}`,
          `There is something deeply human in the way you express this. It carries so much unspoken weight.\n\n${randomFollowUp}`,
          `Thank you for trusting me with this piece of your living history.\n\n${randomFollowUp}`,
        ];
        resolve(fallbacks[Math.floor(Math.random() * fallbacks.length)]);
      }
    }, 700);
  });
}

function generateOfflineOfrendaTribute({ name, favorites, tone, traits }) {
  const favText = favorites?.length ? `surrounded by your beloved ${favorites.slice(0, 3).join(', ')}` : 'wrapped in eternal light';
  const templates = [
    `You taught us that love never ends; it simply changes form. We hold your spirit in every quiet morning, ${favText}. Your light will never go dark.`,
    `To the world, you were one person; to us, you were the warmth in the kitchen, the steadfast compass, and the quiet blessing. We remember you with every candle lit tonight.`,
    `In the sacred glow of the ofrenda, your name is spoken with endless gratitude. Thank you for the joy, the lessons, and the laughter you left etched upon our hearts.`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

// ── CONVERSATION STARTERS & GHOST MESSAGES ────────────────

export const CONVERSATION_STARTERS = [
  "Tell me about someone you miss deeply.",
  "What's a memory you've never fully put into words?",
  "Is there a place that holds special meaning for you?",
  "What dream keeps returning to you?",
  "Tell me about a moment when everything changed.",
  "Who taught you how to love?",
  "What was the last thing that truly surprised you?",
];

export const GHOST_MESSAGES = [
  {
    title: 'From the Other Side of Forgetting',
    text: 'We were there. We laughed. We cried. We held things too tightly and let others go too easily. And then we became part of the story someone else is still telling.',
    from: '— The ones who came before',
    icon: '👻',
  },
  {
    title: 'What We Left Behind',
    text: 'Look at the handwriting in the margins of old books. Someone held that pen, in a world that no longer exists, thinking thoughts that somehow reach you now across the dark.',
    from: '— An echo across time',
    icon: '📜',
  },
  {
    title: 'The Message in the Dark',
    text: 'You are made of everyone who loved you. When you move your hands in that particular way, you are moving their hands. When you laugh at that specific thing, you are laughing their laugh. You are the living continuation of all of them.',
    from: '— Whispered at midnight',
    icon: '🕯',
  },
  {
    title: 'On the Night of Remembrance',
    text: 'Tonight the veil is thinnest. Not because of superstition, but because you have chosen to remember — and choosing to remember is how the dead stay alive.',
    from: '— Día de los Muertos, always',
    icon: '💀',
  },
  {
    title: 'What Memory Protects',
    text: 'Every story you write down, every photograph you save, every name you speak aloud — these are acts of resistance against the great forgetting. You are keeping people alive.',
    from: '— The Keeper of Echoes',
    icon: '🔮',
  },
  {
    title: 'The Lantern We Carry',
    text: 'Grief is not the opposite of love. It is the form love takes when there is nowhere left to put it. You are not broken. You are carrying a very heavy, very luminous thing.',
    from: '— From one mourner to another',
    icon: '🪔',
  },
];
