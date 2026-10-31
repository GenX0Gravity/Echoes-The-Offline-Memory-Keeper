/**
 * ECHOES – Local Ollama Client Module
 * Communicates exclusively with a locally running Ollama instance.
 * No data is ever transmitted to external cloud APIs.
 */

class OllamaClient {
  constructor() {
    this.host = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
    this.model = process.env.OLLAMA_MODEL || 'qwen2.5:3b';
    this.timeoutMs = 60000; // 60s for local generation
    this.pingTimeoutMs = 2500; // 2.5s for health check
  }

  /**
   * Set the active model
   */
  setModel(newModel) {
    if (newModel && typeof newModel === 'string') {
      this.model = newModel.trim();
    }
    return this.model;
  }

  /**
   * Set the Ollama host URL
   */
  setHost(newHost) {
    if (newHost && typeof newHost === 'string') {
      let host = newHost.trim();
      if (host.endsWith('/')) host = host.slice(0, -1);
      this.host = host;
    }
    return this.host;
  }

  /**
   * Test connection and retrieve available models
   */
  async getStatus(customHost) {
    const targetHost = customHost || this.host;
    try {
      const response = await fetch(`${targetHost}/api/tags`, {
        signal: AbortSignal.timeout(this.pingTimeoutMs),
      });

      if (!response.ok) {
        throw new Error(`Ollama returned status ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const models = Array.isArray(data.models) ? data.models.map(m => m.name) : [];
      const hasConfiguredModel = models.some(m => m === this.model || m.startsWith(`${this.model}:`));

      return {
        connected: true,
        host: targetHost,
        model: this.model,
        hasModel: hasConfiguredModel,
        availableModels: models,
        message: hasConfiguredModel
          ? `Connected to Ollama with ${this.model}`
          : `Connected to Ollama, but model "${this.model}" is not yet pulled. Run "ollama run ${this.model}" or select an available model.`
      };
    } catch (err) {
      return {
        connected: false,
        host: targetHost,
        model: this.model,
        hasModel: false,
        availableModels: [],
        error: err.name === 'TimeoutError'
          ? 'Connection timed out while reaching local Ollama'
          : `Ollama is not responding at ${targetHost} (${err.message}). Start it with "ollama serve".`,
      };
    }
  }

  /**
   * Text generation with local Ollama
   */
  async generate({ prompt, system, model, host, temperature = 0.7 }) {
    const targetModel = model || this.model;
    const targetHost = host || this.host;
    const url = `${targetHost}/api/generate`;

    const payload = {
      model: targetModel,
      prompt,
      system,
      stream: false,
      options: {
        temperature,
        top_p: 0.9,
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama error (${response.status}): ${errorText || response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        text: data.response?.trim() || '',
        model: data.model || targetModel,
        totalDuration: data.total_duration,
        evalCount: data.eval_count,
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        model: targetModel,
      };
    }
  }

  /**
   * Multi-turn chat completion with local Ollama
   */
  async chat({ messages, system, model, host, temperature = 0.75 }) {
    const targetModel = model || this.model;
    const targetHost = host || this.host;
    const url = `${targetHost}/api/chat`;

    const formattedMessages = [];
    if (system) {
      formattedMessages.push({ role: 'system', content: system });
    }

    // Add conversation history
    for (const msg of messages) {
      formattedMessages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }

    const payload = {
      model: targetModel,
      messages: formattedMessages,
      stream: false,
      options: {
        temperature,
        top_p: 0.9,
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama error (${response.status}): ${errorText || response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        message: data.message?.content?.trim() || '',
        model: data.model || targetModel,
        totalDuration: data.total_duration,
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        model: targetModel,
      };
    }
  }
}

export const ollama = new OllamaClient();

