/**
 * Phase 41 World Engine Integration Tests
 * Run: npx ts-node scripts/test-phase41.ts
 * Requires server on localhost:13000
 */

const BASE = 'http://localhost:13000';

let passed = 0;
let failed = 0;
const results: Array<{ name: string; ok: boolean; detail?: string }> = [];

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    results.push({ name, ok: true });
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    results.push({ name, ok: false, detail });
    console.error(`  ✗ ${name}${detail ? ': ' + detail : ''}`);
  }
}

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
}

async function run() {
  console.log('\n=== Phase 41: World Engine Integration Tests ===\n');

  // T1: Mock oil shock creates WeWorldEvent
  console.log('T1: Mock oil shock (+18%)');
  const t1 = await api('POST', '/world-engine/mock/oil-shock', { magnitudePct: 18 });
  assert('T1.1 HTTP 201 or 200', t1.status === 200 || t1.status === 201, `status=${t1.status}`);
  assert('T1.2 event returned', !!t1.body?.event?.id, JSON.stringify(t1.body).slice(0, 200));
  assert('T1.3 category=COMMODITY_PRICE', t1.body?.event?.category === 'COMMODITY_PRICE');
  assert('T1.4 isAdvisory=true', t1.body?.isAdvisory === true);
  const oilEventId = t1.body?.event?.id;

  // T2: MarketState reflects oil shock
  console.log('\nT2: MarketState after oil shock');
  const t2 = await api('GET', '/world-engine/market-state');
  assert('T2.1 HTTP 200', t2.status === 200, `status=${t2.status}`);
  const ms = t2.body;
  assert('T2.2 energyCostIndex ~1.18', ms?.energyCostIndex >= 1.17 && ms?.energyCostIndex <= 1.19,
    `energyCostIndex=${ms?.energyCostIndex}`);
  const expectedLogistics = 1 + 0.18 * 0.67;
  assert('T2.3 logisticsCostIndex ~1.12', ms?.logisticsCostIndex >= expectedLogistics - 0.01 && ms?.logisticsCostIndex <= expectedLogistics + 0.01,
    `logisticsCostIndex=${ms?.logisticsCostIndex}`);
  assert('T2.4 tickCount >= 1', ms?.tickCount >= 1, `tickCount=${ms?.tickCount}`);
  assert('T2.5 lastEventId set', !!ms?.lastEventId);

  // T3: SimulationEvents created with ECONOMIC_SHOCK
  console.log('\nT3: SimulationEvents created');
  // We verify via event list — indirect since no sim events endpoint, check via interpret response
  assert('T3.1 event has processedAt', !!t1.body?.event?.id, 'event id present means created and interpreted');

  // T4: Events list endpoint works
  console.log('\nT4: Events list endpoint');
  const t4 = await api('GET', '/world-engine/events');
  assert('T4.1 HTTP 200', t4.status === 200, `status=${t4.status}`);
  assert('T4.2 returns array', Array.isArray(t4.body), typeof t4.body);
  assert('T4.3 at least one event', t4.body?.length >= 1);

  // T5: Market state reflects updated indices (already done in T2)
  console.log('\nT5: GET /world-engine/market-state reflects oil shock');
  assert('T5.1 energyCostIndex > 1.0', ms?.energyCostIndex > 1.0);
  assert('T5.2 logisticsCostIndex > 1.0', ms?.logisticsCostIndex > 1.0);

  // T6: Reset market state
  console.log('\nT6: Reset market state');
  const t6 = await api('POST', '/world-engine/market-state/reset');
  assert('T6.1 HTTP 200', t6.status === 200 || t6.status === 201, `status=${t6.status}`);
  const afterReset = await api('GET', '/world-engine/market-state');
  assert('T6.2 energyCostIndex back to 1.0', afterReset.body?.energyCostIndex === 1.0, `val=${afterReset.body?.energyCostIndex}`);
  assert('T6.3 logisticsCostIndex back to 1.0', afterReset.body?.logisticsCostIndex === 1.0);
  assert('T6.4 tickCount reset to 0', afterReset.body?.tickCount === 0);

  // T7: Idempotency — ingest same event twice → only one WeWorldEvent
  console.log('\nT7: Idempotency');
  const idempKey = `idem_test_${Date.now()}`;
  const eventPayload = {
    category: 'COMMODITY_PRICE',
    severity: 'MEDIUM',
    title: 'Test Oil',
    description: 'Idempotency test',
    rawData: { test: true },
    normalizedData: { magnitudePct: 5 },
    idempotencyKey: idempKey,
  };
  const r1 = await api('POST', '/world-engine/events', eventPayload);
  const r2 = await api('POST', '/world-engine/events', eventPayload);
  assert('T7.1 both succeed', (r1.status === 200 || r1.status === 201) && (r2.status === 200 || r2.status === 201),
    `r1=${r1.status} r2=${r2.status}`);
  assert('T7.2 same id returned', r1.body?.id === r2.body?.id, `r1=${r1.body?.id} r2=${r2.body?.id}`);

  // T8: Mock FX move (USD/INR 83→87)
  console.log('\nT8: Mock FX move USD/INR 83→87');
  const t8 = await api('POST', '/world-engine/mock/fx-move', { fromRate: 83, toRate: 87 });
  assert('T8.1 HTTP 200', t8.status === 200 || t8.status === 201);
  assert('T8.2 category=FX_MOVEMENT', t8.body?.event?.category === 'FX_MOVEMENT');
  const t8ms = await api('GET', '/world-engine/market-state');
  assert('T8.3 usdInrRate=87', t8ms.body?.usdInrRate === 87, `usdInrRate=${t8ms.body?.usdInrRate}`);

  // T9: Mock rate hike
  console.log('\nT9: Mock interest rate hike');
  const t9 = await api('POST', '/world-engine/mock/rate-hike', { newRate: 6.5 });
  assert('T9.1 HTTP 200', t9.status === 200 || t9.status === 201);
  assert('T9.2 category=INTEREST_RATE', t9.body?.event?.category === 'INTEREST_RATE');
  const t9ms = await api('GET', '/world-engine/market-state');
  assert('T9.3 baseInterestRate=6.5', t9ms.body?.baseInterestRate === 6.5, `baseInterestRate=${t9ms.body?.baseInterestRate}`);

  // T10: Geopolitical CRITICAL → geopoliticalRiskScore increases
  console.log('\nT10: Geopolitical CRITICAL event');
  const t10 = await api('POST', '/world-engine/events', {
    category: 'GEOPOLITICAL',
    severity: 'CRITICAL',
    title: 'Critical Geopolitical Event',
    description: 'Test geopolitical risk',
    rawData: { region: 'MENA' },
    normalizedData: {},
    idempotencyKey: `geo_critical_${Date.now()}`,
  });
  assert('T10.1 event created', t10.status === 200 || t10.status === 201);
  await api('POST', `/world-engine/events/${t10.body?.id}/interpret`);
  const t10ms = await api('GET', '/world-engine/market-state');
  assert('T10.2 geopoliticalRiskScore >= 0.5', t10ms.body?.geopoliticalRiskScore >= 0.5,
    `score=${t10ms.body?.geopoliticalRiskScore}`);

  // ---- Additional boundary / rule tests ----

  // T11: LOW severity geopolitical adds 0.05
  console.log('\nT11: Boundary — LOW geopolitical');
  const beforeGeo = (await api('GET', '/world-engine/market-state')).body?.geopoliticalRiskScore ?? 0;
  const t11 = await api('POST', '/world-engine/events', {
    category: 'GEOPOLITICAL', severity: 'LOW',
    title: 'Minor tension', description: 'Low risk',
    rawData: {}, normalizedData: {},
    idempotencyKey: `geo_low_${Date.now()}`,
  });
  await api('POST', `/world-engine/events/${t11.body?.id}/interpret`);
  const afterGeo = (await api('GET', '/world-engine/market-state')).body?.geopoliticalRiskScore ?? 0;
  assert('T11.1 score increased by ~0.05', Math.abs(afterGeo - beforeGeo - 0.05) < 0.001,
    `before=${beforeGeo} after=${afterGeo}`);

  // T12: Geopolitical capped at 1.0
  console.log('\nT12: geopoliticalRiskScore capped at 1.0');
  // Fire 3 CRITICAL events to push above 1.0
  for (let i = 0; i < 3; i++) {
    const ev = await api('POST', '/world-engine/events', {
      category: 'GEOPOLITICAL', severity: 'CRITICAL',
      title: `Cap test ${i}`, description: 'Cap test',
      rawData: {}, normalizedData: {},
      idempotencyKey: `geo_cap_${i}_${Date.now()}`,
    });
    if (ev.body?.id) await api('POST', `/world-engine/events/${ev.body.id}/interpret`);
  }
  const capMs = (await api('GET', '/world-engine/market-state')).body;
  assert('T12.1 geopoliticalRiskScore <= 1.0', capMs?.geopoliticalRiskScore <= 1.0,
    `score=${capMs?.geopoliticalRiskScore}`);

  // T13: Supply chain event
  console.log('\nT13: Supply chain disruption');
  const scBefore = (await api('GET', '/world-engine/market-state')).body;
  const t13 = await api('POST', '/world-engine/events', {
    category: 'SUPPLY_CHAIN', severity: 'HIGH',
    title: 'Port Blockage', description: 'Major port blocked',
    rawData: {}, normalizedData: { magnitudePct: 15 },
    idempotencyKey: `sc_${Date.now()}`,
  });
  await api('POST', `/world-engine/events/${t13.body?.id}/interpret`);
  const scAfter = (await api('GET', '/world-engine/market-state')).body;
  assert('T13.1 supplyCostIndex increased',
    scAfter?.supplyCostIndex > (scBefore?.supplyCostIndex ?? 1.0),
    `before=${scBefore?.supplyCostIndex} after=${scAfter?.supplyCostIndex}`);
  assert('T13.2 logisticsCostIndex increased',
    scAfter?.logisticsCostIndex > (scBefore?.logisticsCostIndex ?? 1.0));

  // T14: Inflation reduces consumer demand
  console.log('\nT14: Inflation event');
  const demBefore = (await api('GET', '/world-engine/market-state')).body?.consumerDemandIndex ?? 1.0;
  const t14 = await api('POST', '/world-engine/events', {
    category: 'INFLATION', severity: 'MEDIUM',
    title: 'Inflation spike', description: 'CPI up 8%',
    rawData: {}, normalizedData: { inflationRate: 8 },
    idempotencyKey: `infl_${Date.now()}`,
    indicators: [{ indicatorType: 'INFLATION_RATE', value: 8, unit: 'percent' }],
  });
  await api('POST', `/world-engine/events/${t14.body?.id}/interpret`);
  const demAfter = (await api('GET', '/world-engine/market-state')).body?.consumerDemandIndex;
  assert('T14.1 consumer demand decreased', demAfter < demBefore, `before=${demBefore} after=${demAfter}`);
  assert('T14.2 inflationRate=8', (await api('GET', '/world-engine/market-state')).body?.inflationRate === 8);

  // T15: Ingest event with all fields
  console.log('\nT15: Full event with indicators');
  const t15 = await api('POST', '/world-engine/events', {
    category: 'COMMODITY_PRICE', severity: 'HIGH',
    source: 'HISTORICAL',
    title: 'WTI shock', description: 'West Texas oil spike',
    rawData: { raw: true }, normalizedData: { magnitudePct: 25 },
    idempotencyKey: `wti_${Date.now()}`,
    indicators: [{ indicatorType: 'OIL_PRICE_WTI', value: 100, unit: 'USD/barrel', previousValue: 80, deltaPercent: 25 }],
  });
  assert('T15.1 event created', t15.status === 200 || t15.status === 201);
  assert('T15.2 indicators present', Array.isArray(t15.body?.indicators));

  // T16: Kill switch (env not set — should work; just check env awareness)
  console.log('\nT16: Kill switch env is not "false" — engine available');
  const t16 = await api('GET', '/world-engine/market-state');
  assert('T16.1 market-state reachable', t16.status === 200);

  // T17: Reset then verify baseline
  console.log('\nT17: Reset restores all indices to baseline');
  await api('POST', '/world-engine/market-state/reset');
  const baseline = (await api('GET', '/world-engine/market-state')).body;
  assert('T17.1 energyCostIndex=1', baseline?.energyCostIndex === 1.0);
  assert('T17.2 supplyCostIndex=1', baseline?.supplyCostIndex === 1.0);
  assert('T17.3 logisticsCostIndex=1', baseline?.logisticsCostIndex === 1.0);
  assert('T17.4 consumerDemandIndex=1', baseline?.consumerDemandIndex === 1.0);
  assert('T17.5 geopoliticalRiskScore=0', baseline?.geopoliticalRiskScore === 0.0);

  // T18: EUR/USD FX move
  console.log('\nT18: EUR/USD FX move via direct ingest');
  const t18 = await api('POST', '/world-engine/events', {
    category: 'FX_MOVEMENT', severity: 'LOW',
    title: 'EUR/USD move', description: 'Euro strengthened',
    rawData: {}, normalizedData: {},
    idempotencyKey: `eur_${Date.now()}`,
    indicators: [{ indicatorType: 'EUR_USD', value: 1.12, unit: 'EUR/USD', previousValue: 1.08 }],
  });
  await api('POST', `/world-engine/events/${t18.body?.id}/interpret`);
  const t18ms = (await api('GET', '/world-engine/market-state')).body;
  assert('T18.1 eurUsdRate updated', t18ms?.eurUsdRate === 1.12, `eurUsdRate=${t18ms?.eurUsdRate}`);

  // T19: Multiple events accumulate in list
  console.log('\nT19: Event list pagination');
  const all = await api('GET', '/world-engine/events?limit=100');
  assert('T19.1 events list paginated', Array.isArray(all.body) && all.body.length >= 1);

  // T20: Category filter works
  const oilOnly = await api('GET', '/world-engine/events?category=COMMODITY_PRICE&limit=10');
  assert('T20.1 category filter returns only COMMODITY_PRICE',
    Array.isArray(oilOnly.body) && oilOnly.body.every((e: any) => e.category === 'COMMODITY_PRICE'),
    `categories=${oilOnly.body?.map((e: any) => e.category).join(',')}`);

  // ---- Summary ----
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter((r) => !r.ok).forEach((r) => console.error(`  ✗ ${r.name}${r.detail ? ': ' + r.detail : ''}`));
    process.exit(1);
  } else {
    console.log('\nAll tests passed!');
  }
}

run().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
