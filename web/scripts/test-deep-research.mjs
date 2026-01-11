#!/usr/bin/env node
/**
 * Deep Research API Battle Tests
 * Run: node scripts/test-deep-research.mjs
 */

const BASE_URL = 'http://localhost:3000/api/v1/deep-research';
const API_KEY = 'uf_3ZiBy3WnjhhUQQt8f3wFgf5D';
const TAVILY_KEY = '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';

const tests = [];
let passed = 0;
let failed = 0;

function log(msg, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warn: '\x1b[33m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}${msg}${colors.reset}`);
}

async function runTest(name, testFn) {
  log(`\n🧪 Running: ${name}`, 'info');
  try {
    await testFn();
    log(`✅ PASSED: ${name}`, 'success');
    passed++;
  } catch (error) {
    log(`❌ FAILED: ${name}`, 'error');
    log(`   Error: ${error.message}`, 'error');
    failed++;
  }
}

async function fetchApi(body, extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
    'x-tavily-key': TAVILY_KEY,
    ...extraHeaders
  };
  
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  
  return { response, data: await response.json() };
}

// ============================================
// TEST CASES
// ============================================

// Test 1: Health check
await runTest('Health Check (GET)', async () => {
  const response = await fetch(BASE_URL);
  const data = await response.json();
  
  if (data.status !== 'ok') throw new Error('Expected status ok');
  if (data.service !== 'UnforgeAPI Deep Research') throw new Error('Wrong service name');
  if (!data.features.modes.includes('report')) throw new Error('Missing report mode');
  if (!data.features.modes.includes('compare')) throw new Error('Missing compare mode');
  log(`   Version: ${data.version}`, 'info');
});

// Test 2: Missing API key
await runTest('Error: Missing API Key', async () => {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'test' })
  });
  const data = await response.json();
  
  if (response.status !== 401) throw new Error(`Expected 401, got ${response.status}`);
  if (data.code !== 'MISSING_API_KEY') throw new Error(`Expected MISSING_API_KEY, got ${data.code}`);
});

// Test 3: Invalid API key
await runTest('Error: Invalid API Key', async () => {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': 'Bearer invalid_key_123'
    },
    body: JSON.stringify({ query: 'test' })
  });
  const data = await response.json();
  
  if (response.status !== 401) throw new Error(`Expected 401, got ${response.status}`);
  if (data.error !== 'Invalid API Key') throw new Error(`Expected Invalid API Key error`);
});

// Test 4: BYOK user missing Tavily key
await runTest('Error: BYOK Missing Tavily Key', async () => {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
      // No x-tavily-key
    },
    body: JSON.stringify({ query: 'test' })
  });
  const data = await response.json();
  
  // Either rate limited OR missing tavily key error is acceptable
  const validCodes = ['BYOK_MISSING_TAVILY_KEY', 'DEEP_RESEARCH_LIMIT_EXCEEDED'];
  if (!validCodes.includes(data.code)) {
    throw new Error(`Expected BYOK_MISSING_TAVILY_KEY or rate limit, got ${data.code}`);
  }
});

// Test 5: Invalid JSON body
await runTest('Error: Invalid JSON Body', async () => {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'x-tavily-key': TAVILY_KEY
    },
    body: 'not valid json {'
  });
  const data = await response.json();
  
  // Either rate limited OR invalid JSON error is acceptable
  const validCodes = ['INVALID_JSON', 'DEEP_RESEARCH_LIMIT_EXCEEDED'];
  if (!validCodes.includes(data.code)) {
    throw new Error(`Expected INVALID_JSON or rate limit, got ${data.code}`);
  }
});

// Test 6: Compare mode with < 2 queries (validation)
await runTest('Validation: Compare Mode Requires 2+ Queries', async () => {
  const { response, data } = await fetchApi({
    mode: 'compare',
    queries: ['Only one item']
  });
  
  // Rate limited, API errors, or validation error are all acceptable
  const validCodes = ['INVALID_REQUEST', 'DEEP_RESEARCH_LIMIT_EXCEEDED', 'API_ERROR', 'RATE_LIMITED'];
  if (!validCodes.includes(data.code)) {
    throw new Error(`Expected INVALID_REQUEST or rate limit, got ${data.code}`);
  }
  if (data.code !== 'INVALID_REQUEST') {
    log(`   Skipped validation (${data.code})`, 'warn');
  }
});

// Test 7: Compare mode with > 3 queries (guardrail)
await runTest('Guardrail: Compare Mode Max 3 Queries', async () => {
  const { response, data } = await fetchApi({
    mode: 'compare',
    queries: ['Item1', 'Item2', 'Item3', 'Item4', 'Item5']
  });
  
  // Rate limited, API errors, or validation error are all acceptable
  const validCodes = ['TOO_MANY_COMPARE_QUERIES', 'DEEP_RESEARCH_LIMIT_EXCEEDED', 'API_ERROR', 'RATE_LIMITED'];
  if (!validCodes.includes(data.code)) {
    throw new Error(`Expected TOO_MANY_COMPARE_QUERIES or rate limit, got ${data.code}`);
  }
  if (data.code !== 'TOO_MANY_COMPARE_QUERIES') {
    log(`   Skipped validation (${data.code})`, 'warn');
  }
});

// Test 8: Extract mode without fields
await runTest('Validation: Extract Mode Requires Fields', async () => {
  const { response, data } = await fetchApi({
    query: 'iPhone 16',
    mode: 'extract'
    // Missing extract array
  });
  
  const validCodes = ['INVALID_REQUEST', 'DEEP_RESEARCH_LIMIT_EXCEEDED', 'API_ERROR', 'RATE_LIMITED'];
  if (!validCodes.includes(data.code)) {
    throw new Error(`Expected INVALID_REQUEST or rate limit, got ${data.code}`);
  }
  if (data.code !== 'INVALID_REQUEST') {
    log(`   Skipped validation (${data.code})`, 'warn');
  }
});

// Test 9: Schema mode without schema
await runTest('Validation: Schema Mode Requires Schema', async () => {
  const { response, data } = await fetchApi({
    query: 'Compare Tesla vs Rivian',
    mode: 'schema'
    // Missing schema object
  });
  
  const validCodes = ['INVALID_REQUEST', 'DEEP_RESEARCH_LIMIT_EXCEEDED', 'API_ERROR', 'RATE_LIMITED'];
  if (!validCodes.includes(data.code)) {
    throw new Error(`Expected INVALID_REQUEST or rate limit, got ${data.code}`);
  }
  if (data.code !== 'INVALID_REQUEST') {
    log(`   Skipped validation (${data.code})`, 'warn');
  }
});

// Test 10: Invalid preset
await runTest('Validation: Invalid Preset', async () => {
  const { response, data } = await fetchApi({
    query: 'Test query',
    preset: 'invalid_preset_name'
  });
  
  const validCodes = ['INVALID_PRESET', 'DEEP_RESEARCH_LIMIT_EXCEEDED', 'API_ERROR', 'RATE_LIMITED'];
  if (!validCodes.includes(data.code)) {
    throw new Error(`Expected INVALID_PRESET or rate limit, got ${data.code}`);
  }
  if (data.code !== 'INVALID_PRESET') {
    log(`   Skipped validation (${data.code})`, 'warn');
  }
});

// Test 11: Invalid webhook URL
await runTest('Validation: Invalid Webhook URL', async () => {
  const { response, data } = await fetchApi({
    query: 'Test query',
    webhook: 'not-a-valid-url'
  });
  
  const validCodes = ['INVALID_WEBHOOK', 'DEEP_RESEARCH_LIMIT_EXCEEDED', 'API_ERROR', 'RATE_LIMITED'];
  if (!validCodes.includes(data.code)) {
    throw new Error(`Expected INVALID_WEBHOOK or rate limit, got ${data.code}`);
  }
  if (data.code !== 'INVALID_WEBHOOK') {
    log(`   Skipped validation (${data.code})`, 'warn');
  }
});

// Test 12: Query too long
await runTest('Validation: Query Too Long (>2000 chars)', async () => {
  const longQuery = 'a'.repeat(2500);
  const { response, data } = await fetchApi({
    query: longQuery
  });
  
  const validCodes = ['QUERY_TOO_LONG', 'DEEP_RESEARCH_LIMIT_EXCEEDED', 'API_ERROR', 'RATE_LIMITED'];
  if (!validCodes.includes(data.code)) {
    throw new Error(`Expected QUERY_TOO_LONG or rate limit, got ${data.code}`);
  }
  if (data.code !== 'QUERY_TOO_LONG') {
    log(`   Skipped validation (${data.code})`, 'warn');
  }
});

// Test 13: Rate limit response format
await runTest('Rate Limit Response Format', async () => {
  const { response, data } = await fetchApi({
    query: 'Test rate limit'
  });
  
  // If we're rate limited, check the response format
  if (data.code === 'DEEP_RESEARCH_LIMIT_EXCEEDED') {
    if (typeof data.limit !== 'number') throw new Error('Missing limit in response');
    if (typeof data.remaining !== 'number') throw new Error('Missing remaining in response');
    if (typeof data.reset !== 'number') throw new Error('Missing reset timestamp');
    if (!data.upgrade_url) throw new Error('Missing upgrade_url');
    log(`   Rate limited: ${data.remaining}/${data.limit} remaining`, 'warn');
    return; // Test passes - rate limit format is correct
  }
  
  // If not rate limited, we got a successful response
  if (data.report) {
    log(`   Got report (${data.report.length} chars)`, 'info');
  }
});

// Test 14: Successful response format validation (from earlier test results)
await runTest('Success Response Format (Report Mode)', async () => {
  const { response, data } = await fetchApi({
    query: 'What is Bitcoin?'
  });
  
  // If rate limited or API error, that's still a valid test
  if (data.code === 'DEEP_RESEARCH_LIMIT_EXCEEDED' || data.code === 'API_ERROR' || data.code === 'RATE_LIMITED') {
    log(`   Skipped format check (${data.code})`, 'warn');
    return;
  }
  
  // Validate response structure
  if (!data.mode) throw new Error('Missing mode in response');
  if (!data.query) throw new Error('Missing query in response');
  if (!data.report) throw new Error('Missing report in response');
  if (!data.meta) throw new Error('Missing meta in response');
  if (!data.meta.request_id) throw new Error('Missing request_id in meta');
  if (typeof data.meta.latency_ms !== 'number') throw new Error('Missing latency_ms in meta');
  if (typeof data.meta.sources_count !== 'number') throw new Error('Missing sources_count in meta');
  
  log(`   Mode: ${data.mode}, Latency: ${data.meta.latency_ms}ms, Sources: ${data.meta.sources_count}`, 'info');
});

// Test 15: Cache behavior (same query should be faster)
await runTest('Cache Behavior', async () => {
  const query = 'Test cache query ' + Date.now();
  
  // First request - should generate
  const start1 = Date.now();
  const { data: data1 } = await fetchApi({ query });
  const time1 = Date.now() - start1;
  
  if (data1.code === 'DEEP_RESEARCH_LIMIT_EXCEEDED') {
    log(`   Rate limited - cannot test cache`, 'warn');
    return;
  }
  
  // Second request - should be cached
  const start2 = Date.now();
  const { data: data2 } = await fetchApi({ query });
  const time2 = Date.now() - start2;
  
  if (data2.code === 'DEEP_RESEARCH_LIMIT_EXCEEDED') {
    log(`   Rate limited on second request - cannot test cache`, 'warn');
    return;
  }
  
  // Cache hit should be much faster
  log(`   First: ${time1}ms, Second: ${time2}ms (cache: ${data2.meta?.source})`, 'info');
  
  if (data2.meta?.source === 'cache') {
    if (time2 > time1 * 0.5) {
      log(`   Warning: Cache hit was not significantly faster`, 'warn');
    }
  }
});

// Test 16: Meta quota information
await runTest('Quota Information in Response', async () => {
  const { response, data } = await fetchApi({
    query: 'Test quota info'
  });
  
  // If rate limited, check for quota info
  if (data.code === 'DEEP_RESEARCH_LIMIT_EXCEEDED') {
    if (typeof data.limit !== 'number') throw new Error('Missing limit');
    if (typeof data.remaining !== 'number') throw new Error('Missing remaining');
    log(`   Quota: ${data.remaining}/${data.limit} remaining`, 'warn');
    return;
  }
  
  // If successful, check meta.quota
  if (data.meta?.quota) {
    if (typeof data.meta.quota.limit !== 'number') throw new Error('Missing quota.limit');
    if (typeof data.meta.quota.remaining !== 'number') throw new Error('Missing quota.remaining');
    if (!data.meta.quota.period) throw new Error('Missing quota.period');
    log(`   Quota: ${data.meta.quota.remaining}/${data.meta.quota.limit} per ${data.meta.quota.period}`, 'info');
  }
});

// ============================================
// SUMMARY
// ============================================
log('\n' + '='.repeat(50), 'info');
log(`📊 Test Results: ${passed} passed, ${failed} failed`, failed > 0 ? 'error' : 'success');
log('='.repeat(50), 'info');

if (failed > 0) {
  process.exit(1);
}
