# Phase 41 — World Engine Foundation: Implementation Report

## Summary

Phase 41 introduces the World Engine: a boundary-respecting layer that ingests real-world economic events, normalizes them into a `MarketState`, and dispatches advisory `SimulationEvent` records that agents and the simulation engine can consume. **The real-world layer never directly mutates company financial data.**

---

## Files Created / Modified

### New Files

| File | Purpose |
|------|---------|
| `apps/api/src/world-engine/we-interpretation.service.ts` | Rules engine: `WeWorldEvent` → `MarketStateDelta + SimulationImpact[]` |
| `apps/api/src/world-engine/we-market-state.service.ts` | CRUD for `WeMarketState`; additive delta merges with geopolitical risk clamping |
| `apps/api/src/world-engine/we-simulation-bridge.service.ts` | Dispatches `SimulationEvent` records from world impacts; idempotency-safe |
| `apps/api/src/world-engine/we-world-event.service.ts` | Ingests and interprets `WeWorldEvent`; mock factory helpers; P2002 idempotency |
| `apps/api/src/world-engine/world-engine.controller.ts` | REST API: 9 endpoints, all guarded by `JwtAuthGuard` |
| `apps/api/src/world-engine/world-engine.module.ts` | NestJS module wiring |
| `scripts/test-phase41.ts` | 40+ integration test assertions against `localhost:13000` |
| `packages/database/prisma/migrations/20260924000000_phase41_world_engine/migration.sql` | Applied migration SQL |

### Modified Files

| File | Change |
|------|--------|
| `packages/database/prisma/schema.prisma` | Added 4 enums + 3 models (`WeWorldEvent`, `WeEconomicIndicator`, `WeMarketState`); added relations to `Company` |
| `apps/api/src/simulation/simulation-engine.service.ts` | Added `WORLD_EVENT`, `ECONOMIC_SHOCK`, `MARKET_TICK` cases to `handleEvent()` |
| `apps/api/src/app.module.ts` | Registered `WorldEngineModule` |

---

## Migration Applied

```
Migration: 20260924000000_phase41_world_engine
Status:    Applied ✓

Tables created:
  WeWorldEvent          — raw normalized external events
  WeEconomicIndicator   — time-series indicator data points
  WeMarketState         — current economic conditions per company

Enums created:
  WeEventCategory, WeEventSeverity, WeEventSource, WeIndicatorType
```

Prisma client regenerated with `npx prisma generate`.

---

## API Endpoints

```
POST   /world-engine/events                  Ingest a world event
GET    /world-engine/events                  List events (filters: category, limit, offset)
POST   /world-engine/events/:id/interpret    Trigger interpretation → MarketState update + SimulationEvents
GET    /world-engine/market-state            Current market state for company
POST   /world-engine/market-state/reset      Reset all indices to baseline
POST   /world-engine/mock/oil-shock          { magnitudePct } → ingest + auto-interpret
POST   /world-engine/mock/fx-move            { fromRate, toRate } → USD/INR move
POST   /world-engine/mock/rate-hike          { newRate } → base interest rate
```

---

## Integration Tests

Run: `npx ts-node scripts/test-phase41.ts`

| # | Test | Covers |
|---|------|--------|
| T1 | Mock oil shock (+18%) creates WeWorldEvent | Happy path, isAdvisory flag |
| T2 | MarketState energyCostIndex ≈ 1.18, logisticsCostIndex ≈ 1.12 | Interpretation rules |
| T3 | SimulationEvents dispatched | Bridge dispatch |
| T4 | Events list endpoint | List/pagination |
| T5 | GET market-state reflects oil shock | State persistence |
| T6 | Reset → all indices back to 1.0, tickCount=0 | Reset correctness |
| T7 | Same idempotencyKey → same event id returned | P2002 idempotency |
| T8 | FX move 83→87 → usdInrRate=87 in MarketState | FX rule |
| T9 | Rate hike → baseInterestRate=6.5 | Interest rate rule |
| T10 | GEOPOLITICAL CRITICAL → geopoliticalRiskScore ≥ 0.5 | Geopolitical rule |
| T11 | LOW geopolitical adds exactly 0.05 | Boundary |
| T12 | Multiple CRITICALs → geopoliticalRiskScore capped at 1.0 | Clamping |
| T13 | SUPPLY_CHAIN event → supplyCostIndex + logisticsCostIndex increase | Supply chain rule |
| T14 | INFLATION 8% → consumerDemandIndex decreases, inflationRate=8 | Inflation rule |
| T15 | Full event with indicators payload | Data completeness |
| T16 | Kill switch disabled by default | Kill switch |
| T17 | Reset restores all 5 baseline indices | Full reset |
| T18 | EUR/USD move via indicator → eurUsdRate updated | EUR rule |
| T19 | Pagination of event list | List bounds |
| T20 | Category filter returns only matching events | Filter correctness |

Total assertions: **40+**

---

## MarketState Chain Walkthrough — Oil Shock Scenario

```
1. POST /world-engine/mock/oil-shock  { magnitudePct: 18 }

2. WeWorldEvent created:
   category=COMMODITY_PRICE  severity=MEDIUM
   normalizedData={ magnitudePct: 18 }
   WeEconomicIndicator: OIL_PRICE_BRENT value=92.04  previousValue=78.0

3. WeInterpretationService.interpret():
   pct = 0.18
   delta.energyCostIndex    = +0.18   → new state: 1.18
   delta.logisticsCostIndex = +0.12   → new state: 1.1206
   delta.supplyCostIndex    = +0.077  → new state: 1.077

4. WeMarketStateService.applyDelta():
   WeMarketState updated, tickCount++, lastEventId set

5. WeSimulationBridgeService dispatches 2 SimulationEvents:
   { type: ECONOMIC_SHOCK, priority: 3, payload: { affectedAreas: [logistics, manufacturing, margins], magnitude: 0.18 } }
   { type: MARKET_TICK,    priority: 3, payload: { delta: {...}, marketStateSnapshot } }

6. SimulationEngineService.handleEvent():
   ECONOMIC_SHOCK → logs shock with affectedAreas + magnitude (advisory)
   MARKET_TICK    → logs market snapshot update (advisory)

7. Company consequence (advisory chain, non-mutating Phase 41):
   Logistics cost signals available to CFO AI and operational agents via GET /world-engine/market-state
   Future phases wire these indices into cost multipliers on ProjectCost / CompanyExpense records
```

---

## Kill Switch

Set `WE_WORLD_ENGINE=false` in environment to disable ingestion and interpretation.  
`ingest()` and `interpret()` throw `ServiceUnavailableException(503)` when active.

## Design Notes

- All world engine output carries `isAdvisory: true` — these are signals, not mutations
- `geopoliticalRiskScore` is clamped 0.0–1.0 in `applyDelta()`
- Index deltas are **additive** (they are ratio shifts); rates (`usdInrRate`, `baseInterestRate`) are **absolute overwrites**
- Idempotency on `WeWorldEvent` via `@@unique([companyId, idempotencyKey])` with P2002 catch-and-return
- No external API calls — Phase 41 is fully deterministic/mock
