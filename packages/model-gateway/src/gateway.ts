import { ModelRequest, ModelResponse, ModelCapabilities } from './types';
import { LocalProvider } from './providers/LocalProvider';
import { Config } from './config';

export class ModelGateway {
  private localProvider: LocalProvider;

  constructor() {
    Config.validate();
    this.localProvider = new LocalProvider();
  }

  get capabilities(): ModelCapabilities {
    return this.localProvider.capabilities;
  }

  async checkHealth(): Promise<{ status: 'ok' | 'error', message: string }> {
    return this.localProvider.checkHealth();
  }

  async generate(request: ModelRequest): Promise<ModelResponse> {
    const startTime = Date.now();
    
    // Routing policy
    let targetModel = Config.OLLAMA_DEFAULT_MODEL;
    if (request.complexity === 'COMPLEX') {
      targetModel = Config.OLLAMA_COMPLEX_MODEL;
    }

    try {
      const response = await this.localProvider.generate({
        ...request,
        targetModel
      } as any);

      const latency = Date.now() - startTime;
      
      // Observability: Log metadata (no secrets/PII)
      console.log(JSON.stringify({
        event: 'inference_success',
        provider: 'LOCAL',
        model: response.model,
        latencyMs: latency,
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens
      }));

      return response;
    } catch (error: any) {
      const latency = Date.now() - startTime;
      
      console.error(JSON.stringify({
        event: 'inference_failure',
        provider: 'LOCAL',
        model: targetModel,
        latencyMs: latency,
        errorCategory: this.categorizeError(error),
        errorMessage: error.message
      }));
      
      throw error;
    }
  }
  
  private categorizeError(error: any): string {
    if (error.name === 'AbortError') return 'TIMEOUT';
    if (error.message && error.message.includes('ECONNREFUSED')) return 'CONNECTION_REFUSED';
    if (error.message && error.message.includes('JSON')) return 'MALFORMED_RESPONSE';
    if (error.message && error.message.includes('Ollama API error: 404')) return 'MODEL_NOT_FOUND';
    return 'UNKNOWN_ERROR';
  }
}
