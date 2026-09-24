# AEVORA Multi-Provider AI Inference Audit

## 1. Current Architecture & Model Gateway State

**Status**: Inspected.
The current AI architecture is centralized around the `@aevora/model-gateway` module. Agents do not call external APIs directly; instead, they format a `ModelRequest` (with `prompt`, `systemMessage`, `requireStructuredOutput`, etc.) and send it to the `ModelProvider` interface via the gateway. 

Currently, `packages/model-gateway/src/providers/LocalProvider.ts` serves as a stub implementation. It uses hardcoded regex matching on prompts to return predefined `mockStructured` objects for various AEVORA phases (e.g., employee task management, receptionist, project manager, company operations). 

The gateway provides a solid foundation but currently lacks:
- Real local inference integration (Ollama/llama.cpp).
- A robust `RoutingService` to dynamically switch between providers based on policy.
- A Gemini fallback provider with key pooling.
- Extensive audit logging and quota tracking for model usage.

## 2. Hardware Inventory

**Platform**: Windows 11 Home Single Language
- **CPU**: Intel(R) Core(TM) Ultra 9 185H (16 Cores, 22 Logical Processors)
- **RAM**: 32 GB Total (~14 GB Currently Available)
- **GPU**: Intel(R) Arc(TM) Graphics (Integrated, ~2GB VRAM allocated, No NVIDIA CUDA)
- **Virtualization**: WSL2 is available and active (`docker-desktop` is running).

## 3. Installed Runtimes

- **Ollama**: The Ollama CLI is installed (`v0.15.6`), but the background service is currently offline. 
- **Docker**: Docker Desktop is installed and running via WSL2. 
- **LM Studio / Others**: Not detected in system PATH.

## 4. Recommended Local Models

Since the system lacks a dedicated NVIDIA GPU with high VRAM, local inference will primarily rely on the powerful 16-core CPU and system RAM. The following models are recommended to fit comfortably within the ~14GB available RAM while leaving headroom for the AEVORA system:

1. **Llama 3 (8B Instruct)**
   - **Quantization**: 4-bit (`Q4_K_M`)
   - **RAM Required**: ~4.7 GB
   - **Context**: 8k tokens
   - **Suitability**: Excellent reasoning capabilities for agentic workflows (Project Management, Analyst roles). The best balance of size and intelligence.

2. **Mistral (7B Instruct v0.3)**
   - **Quantization**: 4-bit (`Q4_K_M`)
   - **RAM Required**: ~4.1 GB
   - **Context**: Up to 32k tokens
   - **Suitability**: Great for handling larger context windows (e.g., processing long research documents) with reliable instruction following.

3. **Phi-3 Mini (3.8B)**
   - **Quantization**: 4-bit or 8-bit
   - **RAM Required**: ~2.5 GB
   - **Context**: 4k or 128k versions available.
   - **Suitability**: Extremely fast on CPU. Ideal for low-complexity, high-volume classification, routing, or basic extraction tasks. 

**Recommended Runtime**: **Ollama**. It is already installed on the machine, abstracts away the complexity of managing `llama.cpp` directly, and exposes a clean REST API that the AEVORA Model Gateway can easily consume.

## 5. Proposed Provider Architecture

```text
       ┌────────────────────────┐
       │     AEVORA Agent       │
       └───────────┬────────────┘
                   │ ModelRequest
       ┌───────────▼────────────┐
       │  AEVORA Model Gateway  │
       │  (Routing & Auditing)  │
       └───────────┬────────────┘
                   │
         [ Routing Policy ]
       (Is task low-complexity?
       Is local model available?)
         /                  \
    [Yes]                    [No]
      │                       │
┌─────▼──────┐          ┌─────▼──────────┐
│  Ollama    │          │ Gemini Key Pool│
│ (Default)  │          │   (Fallback)   │
└────────────┘          └────────────────┘
```

## 6. Gemini Key-Pool Architecture (Future)

To safely manage 10-15 Gemini API keys without exposing them to agents or hitting rate limits:
- **Secret Storage**: Keys are stored encrypted in the database (`GeminiKeyPool` table). Agents never see the keys.
- **Health & Quota Tracking**: Each key tracks `requests_per_minute` (RPM), `tokens_per_minute` (TPM), and daily quotas. 
- **Circuit Breaker & Cooldown**: If a key receives a `429 Too Many Requests` or `5xx` error, it is placed in a cooldown state (`next_available_at = NOW() + 60s`). The gateway automatically rotates to the next healthy key in the pool.
- **Fail-Safe**: If all keys are exhausted or in cooldown, the gateway throws a `ResourceExhaustedException` rather than spinning in a retry storm. 

## 7. Routing Policy Requirements

- **Local Default**: All inference defaults to the Local Ollama provider to guarantee zero data leakage and zero variable costs.
- **Escalation Triggers**: The gateway routes to Gemini ONLY if:
  1. The task requires a massive context window (>8k tokens) that exceeds local hardware limits.
  2. The task requires complex reasoning that the local 8B model repeatedly fails at (detected via agent retry loop).
  3. The local Ollama service is down or overloaded.
- **Auditability**: Every routing decision is logged in an `AiAuditLog` database table, recording `provider_used`, `prompt_tokens`, `completion_tokens`, and the `routing_reason`.

## 8. Implementation Impact

**Files to Modify:**
- `packages/model-gateway/src/types.ts` (Add provider types, routing policies)
- `packages/model-gateway/src/GatewayService.ts` (Implement the core routing and circuit breaker logic)
- `packages/model-gateway/src/providers/LocalProvider.ts` (Replace stubs with actual Ollama REST API calls)
- `packages/model-gateway/src/providers/GeminiProvider.ts` (New file for Gemini API integration and key pool management)

**Database Schema Changes (`packages/database/prisma/schema.prisma`):**
- Add `AiProviderKey` model (id, provider, encryptedKey, status, limitRpm, limitTpm, nextAvailableAt, usageTotal).
- Add `AiAuditLog` model (id, timestamp, agentId, provider, modelName, promptTokens, completionTokens, routingReason, success).

## 9. Security Risks & Failure Modes

- **Prompt Leakage**: Risk of sending sensitive local company data to Google if the routing policy degrades and defaults to Gemini. *Mitigation*: Strict allow-lists for what data can be sent to external providers.
- **Local Model Overload**: Because the system relies heavily on the CPU (no CUDA), concurrent agent requests could peg the CPU to 100%, starving the main AEVORA web/api processes. *Mitigation*: The gateway must enforce a concurrency limit (e.g., max 1 active local inference task at a time).
- **Key Exhaustion / Retry Storms**: If Gemini goes down globally, rotating through all 15 keys rapidly could trigger security flags or ban the keys. *Mitigation*: Implement exponential backoff and a global circuit breaker.

## 10. Exact Next Implementation Step

1. **Start the Ollama service** on the host machine.
2. **Pull the `llama3:8b` model** via Ollama to prepare the local environment.
3. **Rewrite `LocalProvider.ts`** to make actual HTTP POST requests to `http://127.0.0.1:11434/api/generate` instead of returning hardcoded stubs.
4. Test the Local Provider integration before beginning the Gemini fallback implementation.
