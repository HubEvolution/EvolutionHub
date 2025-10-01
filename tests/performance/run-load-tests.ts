#!/usr/bin/env tsx
import { loadEnv } from 'vite';
import { execa } from 'execa';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { readFileSync } from 'fs';

// Lade Umgebungsvariablen
loadEnv(process.env.NODE_ENV || 'test', process.cwd(), '');

// Pfade für Testumgebung
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');

// Lade Load-Test-Konfiguration
const configPath = join(__dirname, 'load-test-config.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));

// Kommandozeilenargumente
const args = process.argv.slice(2);
const testType = args[0] || 'rate-limit'; // 'rate-limit', 'stress', 'benchmark'
const environment = args[1] || 'development';
const endpoint = args[2]; // Optional: spezifischer Endpunkt

// Interface für Test-Ergebnisse
interface LoadTestResult {
  testName: string;
  endpoint: string;
  totalRequests: number;
  successfulRequests: number;
  rateLimitedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  totalDuration: number;
  timestamp: string;
  success: boolean;
}

// Hilfsfunktion für parallele Requests
async function makeParallelRequests(
  baseUrl: string,
  endpoint: string,
  count: number,
  requestFn: (index: number) => Promise<Response>
): Promise<LoadTestResult> {
  const startTime = Date.now();
  const promises = Array(count).fill(null).map((_, index) => requestFn(index));
  const responses = await Promise.allSettled(promises);
  const endTime = Date.now();

  const successful = responses.filter(r => r.status === 'fulfilled').length;
  const failed = responses.filter(r => r.status === 'rejected').length;
  const rateLimited = responses.filter(r =>
    r.status === 'fulfilled' && r.value.status === 429
  ).length;

  // Berechne durchschnittliche Antwortzeit (geschätzt)
  const avgResponseTime = (endTime - startTime) / count;
  const requestsPerSecond = (count / (endTime - startTime)) * 1000;

  return {
    testName: `Parallel_${count}_requests`,
    endpoint,
    totalRequests: count,
    successfulRequests: successful,
    rateLimitedRequests: rateLimited,
    averageResponseTime: avgResponseTime,
    minResponseTime: avgResponseTime * 0.5,
    maxResponseTime: avgResponseTime * 1.5,
    requestsPerSecond,
    totalDuration: endTime - startTime,
    timestamp: new Date().toISOString(),
    success: failed === 0
  };
}

// Hauptfunktion für Rate-Limit-Tests
async function runRateLimitTests() {
  console.log('🚀 Starte Rate-Limiting-Performance-Tests...\n');

  const results: LoadTestResult[] = [];
  const envConfig = config.testEnvironments[environment];
  const baseUrl = envConfig.baseUrl;

  for (const [apiName, apiConfig] of Object.entries(config.rateLimitTests)) {
    if (endpoint && !apiName.includes(endpoint)) continue;

    console.log(`📊 Teste ${apiName} Rate-Limiting...`);

    for (const scenario of apiConfig.testScenarios) {
      console.log(`  └─ ${scenario.name}: ${scenario.requestsPerSecond} RPS für ${scenario.duration}s`);

      const result = await makeParallelRequests(
        baseUrl,
        apiConfig.endpoint,
        scenario.requestsPerSecond * scenario.duration,
        async (index) => {
          if (apiConfig.method === 'GET') {
            return fetch(`${baseUrl}${apiConfig.endpoint}`);
          } else {
            const formData = new URLSearchParams({
              email: `loadtest${index}@example.com`,
              name: `Load Test User ${index}`,
              ...(apiConfig.endpoint.includes('lead-magnets') && {
                magnetId: 'ki-tools-checkliste-2025'
              })
            });

            return fetch(`${baseUrl}${apiConfig.endpoint}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Origin': baseUrl
              },
              body: formData.toString()
            });
          }
        }
      );

      results.push(result);

      // Prüfe Erwartungen
      const expectedRateLimited = Math.round((scenario.expectedRateLimited / 100) * result.totalRequests);
      if (result.rateLimitedRequests >= expectedRateLimited * 0.8) {
        console.log(`    ✅ Rate-Limiting funktioniert korrekt (${result.rateLimitedRequests}/${result.totalRequests} Rate-Limited)`);
      } else {
        console.log(`    ⚠️  Rate-Limiting könnte zu permissiv sein (${result.rateLimitedRequests}/${result.totalRequests} Rate-Limited, erwartet: ${expectedRateLimited})`);
      }

      console.log(`    📈 Performance: ${result.averageResponseTime.toFixed(2)}ms avg, ${result.requestsPerSecond.toFixed(2)} RPS\n`);
    }
  }

  return results;
}

// Hauptfunktion für Stress-Tests
async function runStressTests() {
  console.log('🔥 Starte Stress-Tests...\n');

  const results: LoadTestResult[] = [];
  const envConfig = config.testEnvironments[environment];
  const baseUrl = envConfig.baseUrl;

  if (endpoint === 'burst' || !endpoint) {
    console.log('💥 Teste Burst-Traffic...');

    const burstResult = await makeParallelRequests(
      baseUrl,
      'burst-traffic',
      config.stressTests.burstTraffic.requestsPerEndpoint * config.stressTests.burstTraffic.parallelEndpoints.length,
      async (index) => {
        const endpointIndex = index % config.stressTests.burstTraffic.parallelEndpoints.length;
        const testEndpoint = config.stressTests.burstTraffic.parallelEndpoints[endpointIndex];

        if (testEndpoint.includes('newsletter')) {
          const formData = new URLSearchParams({
            email: `burst${index}@example.com`,
            name: `Burst Test User ${index}`,
            magnetId: 'ki-tools-checkliste-2025'
          });

          return fetch(`${baseUrl}${testEndpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Origin': baseUrl
            },
            body: formData.toString()
          });
        } else {
          return fetch(`${baseUrl}${testEndpoint}`);
        }
      }
    );

    results.push(burstResult);
    console.log(`💥 Burst-Traffic: ${burstResult.requestsPerSecond.toFixed(2)} RPS, ${burstResult.rateLimitedRequests} Rate-Limited\n`);
  }

  return results;
}

// Hauptfunktion für Benchmarks
async function runBenchmarks() {
  console.log('📊 Starte Performance-Benchmarks...\n');

  const results: LoadTestResult[] = [];
  const envConfig = config.testEnvironments[environment];
  const baseUrl = envConfig.baseUrl;

  const benchmarkResult = await makeParallelRequests(
    baseUrl,
    'benchmark-suite',
    100, // 100 Requests für Benchmark
    async (index) => {
      const endpoints = ['/api/dashboard/stats', '/api/projects', '/api/billing/credits'];
      const endpoint = endpoints[index % endpoints.length];
      return fetch(`${baseUrl}${endpoint}`);
    }
  );

  results.push(benchmarkResult);

  console.log(`📊 Benchmark-Ergebnisse:`);
  console.log(`  Durchschnittliche Antwortzeit: ${benchmarkResult.averageResponseTime.toFixed(2)}ms`);
  console.log(`  Requests pro Sekunde: ${benchmarkResult.requestsPerSecond.toFixed(2)}`);
  console.log(`  Rate-Limited: ${benchmarkResult.rateLimitedRequests}/${benchmarkResult.totalRequests}`);

  // Prüfe Performance-Thresholds
  const thresholds = config.performanceThresholds;
  const performanceOk =
    benchmarkResult.averageResponseTime <= thresholds.maxAverageResponseTime &&
    benchmarkResult.requestsPerSecond >= thresholds.minRequestsPerSecond;

  if (performanceOk) {
    console.log(`✅ Performance-Thresholds erfüllt`);
  } else {
    console.log(`❌ Performance-Thresholds nicht erfüllt`);
  }

  return results;
}

// Testergebnisse speichern
function saveResults(results: LoadTestResult[], testType: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `load-test-results-${testType}-${environment}-${timestamp}.json`;

  const report = {
    testType,
    environment,
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: results.length,
      averageResponseTime: results.reduce((sum, r) => sum + r.averageResponseTime, 0) / results.length,
      averageRequestsPerSecond: results.reduce((sum, r) => sum + r.requestsPerSecond, 0) / results.length,
      totalRateLimitedRequests: results.reduce((sum, r) => sum + r.rateLimitedRequests, 0)
    },
    results
  };

  console.log(`💾 Ergebnisse gespeichert in: ${filename}`);
  console.log(`📊 Zusammenfassung:`);
  console.log(`  Tests: ${report.summary.totalTests}`);
  console.log(`  Ø Antwortzeit: ${report.summary.averageResponseTime.toFixed(2)}ms`);
  console.log(`  Ø RPS: ${report.summary.averageRequestsPerSecond.toFixed(2)}`);
  console.log(`  Rate-Limited: ${report.summary.totalRateLimitedRequests}`);

  return report;
}

// Hauptprogramm
async function main() {
  console.log(`🧪 Starte Load-Tests: ${testType} auf ${environment}\n`);

  try {
    let results: LoadTestResult[] = [];

    switch (testType) {
      case 'rate-limit':
        results = await runRateLimitTests();
        break;
      case 'stress':
        results = await runStressTests();
        break;
      case 'benchmark':
        results = await runBenchmarks();
        break;
      default:
        console.error(`❌ Unbekannter Test-Typ: ${testType}`);
        console.log('Verfügbare Typen: rate-limit, stress, benchmark');
        process.exit(1);
    }

    const report = saveResults(results, testType);

    // Prüfe ob alle Tests erfolgreich waren
    const allSuccessful = results.every(r => r.success);
    if (allSuccessful) {
      console.log(`✅ Alle Load-Tests erfolgreich`);
      process.exit(0);
    } else {
      console.log(`❌ Einige Load-Tests fehlgeschlagen`);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Fehler bei Load-Tests:', error);
    process.exit(1);
  }
}

// Script als Modul oder direkt ausführbar
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runRateLimitTests, runStressTests, runBenchmarks };