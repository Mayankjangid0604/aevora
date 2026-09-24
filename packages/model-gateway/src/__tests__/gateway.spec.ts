import { ModelGateway } from '../gateway';
import { Config } from '../config';
import { LocalProvider } from '../providers/LocalProvider';

jest.mock('../providers/LocalProvider');

describe('ModelGateway', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OLLAMA_DEFAULT_MODEL = 'qwen2.5:7b';
    process.env.OLLAMA_COMPLEX_MODEL = 'phi4:latest';
  });

  it('should route BASIC complexity to default model', async () => {
    const gateway = new ModelGateway();
    const generateMock = jest.fn().mockResolvedValue({ model: 'qwen2.5:7b', usage: {} });
    (LocalProvider.prototype.generate as jest.Mock).mockImplementation(generateMock);

    await gateway.generate({
      prompt: 'test',
      complexity: 'BASIC'
    });

    expect(generateMock).toHaveBeenCalledWith(expect.objectContaining({
      targetModel: 'qwen2.5:7b'
    }));
  });

  it('should route undefined complexity to default model', async () => {
    const gateway = new ModelGateway();
    const generateMock = jest.fn().mockResolvedValue({ model: 'qwen2.5:7b', usage: {} });
    (LocalProvider.prototype.generate as jest.Mock).mockImplementation(generateMock);

    await gateway.generate({
      prompt: 'test'
    });

    expect(generateMock).toHaveBeenCalledWith(expect.objectContaining({
      targetModel: 'qwen2.5:7b'
    }));
  });

  it('should route COMPLEX complexity to complex model', async () => {
    const gateway = new ModelGateway();
    const generateMock = jest.fn().mockResolvedValue({ model: 'phi4:latest', usage: {} });
    (LocalProvider.prototype.generate as jest.Mock).mockImplementation(generateMock);

    await gateway.generate({
      prompt: 'test',
      complexity: 'COMPLEX'
    });

    expect(generateMock).toHaveBeenCalledWith(expect.objectContaining({
      targetModel: 'phi4:latest'
    }));
  });

  it('should pass through health check', async () => {
    const gateway = new ModelGateway();
    const healthMock = jest.fn().mockResolvedValue({ status: 'ok', message: 'Healthy' });
    (LocalProvider.prototype.checkHealth as jest.Mock).mockImplementation(healthMock);

    const res = await gateway.checkHealth();
    expect(res).toEqual({ status: 'ok', message: 'Healthy' });
    expect(healthMock).toHaveBeenCalled();
  });
});
