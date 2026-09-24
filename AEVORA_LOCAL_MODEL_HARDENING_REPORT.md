# AEVORA Local Model Hardening Report

This report summarizes the architectural changes, hardening improvements, and verification steps performed to make the local model integration production-ready.

## Architecture Changes
- **Centralized Model Routing**: Created a new `ModelGateway` class (`packages/model-gateway/src/gateway.ts`). This is now the entrypoint for local model integration.
- **Provider Refactoring**: The `LocalProvider` (`packages/model-gateway/src/providers/LocalProvider.ts`) no longer chooses the model; it exclusively manages communication with Ollama.
- **API Callers Updated**: Modified `AgentRuntimeService` and `WorkCycleService` in `apps/api` to use `ModelGateway` instead of directly instantiating `LocalProvider`.

## Routing Implementation
- The Model Gateway dynamically chooses the target model based on the request complexity.
- `BASIC` and undefined complexity map to `OLLAMA_DEFAULT_MODEL` (default: `qwen2.5:7b`).
- `COMPLEX` complexity maps to `OLLAMA_COMPLEX_MODEL` (default: `phi4:latest`).

## Configuration
Introduced a centralized `Config` class to validate and manage environment variables:
- `OLLAMA_BASE_URL`
- `OLLAMA_DEFAULT_MODEL`
- `OLLAMA_COMPLEX_MODEL`
- `OLLAMA_TIMEOUT_MS`
- `OLLAMA_MAX_CONCURRENT_REQUESTS`

## Ollama Client Hardening
- **Timeout Protection**: Integrated `AbortController` bound to `OLLAMA_TIMEOUT_MS` to prevent hanging requests.
- **Error Handling & Malformed JSON**: Catch errors safely without crashing the system; properly detect and fail fast on invalid structured output.
- **Bounded Retries**: Implemented exponential backoff with max 2 retries for transient errors (like `ECONNREFUSED` or timeouts). Hard errors (like model missing 404) fail immediately.

## Concurrency Protection
- **Semaphore Limit**: Local generation now uses a simple Promise-based Semaphore in `LocalProvider`.
- It bounds the concurrent requests to `OLLAMA_MAX_CONCURRENT_REQUESTS` (default: 2), queuing any requests beyond that limit to prevent local hardware overload.

## Health Checks
- Added `checkHealth()` to ping Ollama via `/api/tags`.
- Verifies that Ollama is reachable and both the default and complex models are actually present on the local machine. Does not automatically pull them.

## Testing & Verification
### Packages (`packages/model-gateway`)
- **Unit Tests added**: `gateway.spec.ts` (Routing logic) and `local-provider.spec.ts` (Concurrency, Retry, JSON parsing, 404 errors).
- **Status**: All tests pass. Build passes.

### API (`apps/api`)
- **Integration Tests Updated**: Updated the mocked provider from `LocalProvider` to `ModelGateway` in `agent-runtime.service.spec.ts` and `work-cycle.service.spec.ts`.
- **Status**: All tests pass.

## Limitations & Remaining Constraints
- This system strictly relies on Ollama.
- No fallback behavior is built in if Ollama is unreachable; the request intentionally fails to ensure local-only execution.
- Auto-pulling models is deliberately disabled to give control to operators.
