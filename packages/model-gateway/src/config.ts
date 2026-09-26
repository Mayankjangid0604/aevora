export class Config {
  static get OLLAMA_BASE_URL(): string {
    return process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
  }

  static get OLLAMA_DEFAULT_MODEL(): string {
    return process.env.OLLAMA_DEFAULT_MODEL || 'qwen2.5:7b';
  }

  static get OLLAMA_COMPLEX_MODEL(): string {
    return process.env.OLLAMA_COMPLEX_MODEL || 'phi4:latest';
  }

  static get OLLAMA_TIMEOUT_MS(): number {
    return parseInt(process.env.OLLAMA_TIMEOUT_MS || '60000', 10);
  }

  static get OLLAMA_MAX_CONCURRENT_REQUESTS(): number {
    return parseInt(process.env.OLLAMA_MAX_CONCURRENT_REQUESTS || '2', 10);
  }

  static validate() {
    if (isNaN(this.OLLAMA_TIMEOUT_MS) || this.OLLAMA_TIMEOUT_MS <= 0) {
      throw new Error('OLLAMA_TIMEOUT_MS must be a positive integer');
    }
    if (isNaN(this.OLLAMA_MAX_CONCURRENT_REQUESTS) || this.OLLAMA_MAX_CONCURRENT_REQUESTS <= 0) {
      throw new Error('OLLAMA_MAX_CONCURRENT_REQUESTS must be a positive integer');
    }
  }
}
