# AEVORA Local Model Configuration

AEVORA strictly uses Ollama as the local inference engine. External providers like Gemini or OpenAI are explicitly excluded to maintain data privacy and a fully local architecture.

## Requirements

1. **Ollama Installed & Running**: You must have Ollama running locally.
2. **Models Pulled**: You must pull the required models manually before starting the system.
   ```bash
   ollama pull qwen2.5:7b
   ollama pull phi4:latest
   ```

## Environment Variables

The Model Gateway can be configured using the following environment variables. Defaults are provided if omitted.

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | The HTTP endpoint where Ollama is running. |
| `OLLAMA_DEFAULT_MODEL`| `qwen2.5:7b` | The model used for `BASIC` and `NORMAL` complexity requests. |
| `OLLAMA_COMPLEX_MODEL`| `phi4:latest` | The model used for `COMPLEX` reasoning requests. |
| `OLLAMA_TIMEOUT_MS` | `60000` | Timeout in milliseconds before cancelling a local generation request. |
| `OLLAMA_MAX_CONCURRENT_REQUESTS` | `2` | Bounded concurrency limit for Ollama. Requests exceeding this will queue. |

## Routing Behavior

The `ModelGateway` routes requests based on the requested `complexity`.
- `BASIC` / Default -> `OLLAMA_DEFAULT_MODEL` (`qwen2.5:7b`)
- `COMPLEX` -> `OLLAMA_COMPLEX_MODEL` (`phi4:latest`)

## Health Checks

The Model Gateway includes a health check that verifies:
- Ollama is reachable.
- Both the default and complex models are downloaded and available.

It will **not** download models automatically. If models are missing, it returns a controlled error prompting the user to pull them.

## Concurrency Protection

Because local hardware (CPU/RAM/GPU) is finite, the Gateway implements bounded concurrency via `OLLAMA_MAX_CONCURRENT_REQUESTS`.
- Up to `N` requests run in parallel.
- Additional requests queue automatically.
- This prevents out-of-memory errors and extreme slowdowns from uncontrolled parallel execution.

## Timeout and Error Behavior

- **Timeouts**: If a request exceeds `OLLAMA_TIMEOUT_MS`, it is aborted safely.
- **Retries**: A bounded retry policy (max 2 retries) applies **only** to transient errors (like `fetch failed`, `ECONNREFUSED` or timeouts).
- **Hard Failures**: `404 Not Found`, invalid JSON, or invalid payloads fail immediately and do not retry.
- **No Fallback**: If Ollama fails, the request fails. The system will **never** fallback to an external API (e.g., Gemini).

## Observability

Metadata (Request latency, Token usage, Model chosen, Provider = LOCAL, errors) is logged centrally by the Model Gateway.
**Note**: API secrets, prompt contents, and full customer data are strictly excluded from these logs to prevent data leaks.

## Troubleshooting

- **"fetch failed" / "ECONNREFUSED"**: Ensure Ollama is running (`ollama serve`). Check `OLLAMA_BASE_URL`.
- **"Ollama API error: 404"**: You are missing the required model. Run `ollama list` and compare against `OLLAMA_DEFAULT_MODEL` / `OLLAMA_COMPLEX_MODEL`.
- **Hanging requests**: Ensure `OLLAMA_TIMEOUT_MS` is set correctly. Check if `OLLAMA_MAX_CONCURRENT_REQUESTS` is too low, causing a long queue.
