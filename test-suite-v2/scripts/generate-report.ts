#!/usr/bin/env tsx

/**
 * Berichts-Generator für Test-Suite v2
 * Generiert umfassende Testberichte in verschiedenen Formaten
 */

import * as fs from 'fs';
import * as path from 'path';
import { getTestLogger } from '../utils/logger.js';

interface TestResult {
  testId: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  duration: number;
  error?: string;
  category: 'unit' | 'integration' | 'e2e' | 'performance';
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface TestSuiteResult {
  suiteName: string;
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    pending: number;
    duration: number;
    coverage?: {
      statements: number;
      branches: number;
      functions: number;
      lines: number;
    };
  };
  environment: {
    nodeVersion: string;
    platform: string;
    timestamp: Date;
    commit?: string;
    branch?: string;
  };
}

interface ReportConfig {
  outputDir: string;
  formats: ('html' | 'json' | 'xml' | 'markdown' | 'pdf')[];
  includeCoverage: boolean;
  includeScreenshots: boolean;
  includePerformance: boolean;
  customMetadata?: Record<string, any>;
}

/**
 * Hauptklasse für Berichts-Generierung
 */
export class TestReportGenerator {
  private logger = getTestLogger();
  private config: ReportConfig;

  constructor(config: Partial<ReportConfig> = {}) {
    this.config = {
      outputDir: config.outputDir || './reports',
      formats: config.formats || ['html', 'json', 'markdown'],
      includeCoverage: config.includeCoverage !== false,
      includeScreenshots: config.includeScreenshots !== false,
      includePerformance: config.includePerformance !== false,
      customMetadata: config.customMetadata || {},
    };
  }

  /**
   * Generiert Berichte für eine Test-Suite
   */
  async generateReport(suiteResult: TestSuiteResult): Promise<string[]> {
    this.logger.info(`Generiere Berichte für Suite: ${suiteResult.suiteName}`);

    const generatedFiles: string[] = [];

    // Stelle sicher, dass Output-Verzeichnis existiert
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }

    // Generiere Berichte in allen konfigurierten Formaten
    for (const format of this.config.formats) {
      try {
        const filePath = await this.generateReportFile(suiteResult, format);
        generatedFiles.push(filePath);
        this.logger.info(`Bericht generiert: ${filePath}`);
      } catch (error) {
        this.logger.error(`Fehler beim Generieren des ${format}-Berichts`, error);
      }
    }

    // Generiere Zusammenfassungsbericht
    const summaryPath = await this.generateSummaryReport([suiteResult]);
    generatedFiles.push(summaryPath);

    return generatedFiles;
  }

  /**
   * Generiert einen Bericht in einem bestimmten Format
   */
  private async generateReportFile(
    suiteResult: TestSuiteResult,
    format: ReportConfig['formats'][0]
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${suiteResult.suiteName}-report-${timestamp}.${format}`;
    const filePath = path.join(this.config.outputDir, fileName);

    let content: string;

    switch (format) {
      case 'html':
        content = this.generateHtmlReport(suiteResult);
        break;
      case 'json':
        content = this.generateJsonReport(suiteResult);
        break;
      case 'xml':
        content = this.generateXmlReport(suiteResult);
        break;
      case 'markdown':
        content = this.generateMarkdownReport(suiteResult);
        break;
      case 'pdf':
        // PDF-Generierung würde eine separate Bibliothek erfordern
        throw new Error('PDF-Generierung noch nicht implementiert');
      default:
        throw new Error(`Unbekanntes Format: ${format}`);
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * Generiert HTML-Bericht
   */
  private generateHtmlReport(suiteResult: TestSuiteResult): string {
    const { summary } = suiteResult;
    const passRate = summary.total > 0 ? (summary.passed / summary.total * 100).toFixed(2) : '0.00';

    return `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test-Bericht: ${suiteResult.suiteName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin: 20px 0; }
        .metric { background: #e8f4f8; padding: 15px; border-radius: 6px; text-align: center; }
        .metric.pass { background: #d4edda; }
        .metric.fail { background: #f8d7da; }
        .metric.skip { background: #fff3cd; }
        .tests { margin-top: 20px; }
        .test-item { border: 1px solid #ddd; margin: 10px 0; padding: 10px; border-radius: 4px; }
        .test-passed { border-left: 4px solid #28a745; }
        .test-failed { border-left: 4px solid #dc3545; }
        .test-skipped { border-left: 4px solid #ffc107; }
        .error { color: #dc3545; font-family: monospace; background: #f8f9fa; padding: 10px; margin: 5px 0; }
        .duration { color: #6c757d; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Test-Bericht: ${suiteResult.suiteName}</h1>
        <p>Generiert am: ${suiteResult.environment.timestamp.toLocaleString('de-DE')}</p>
        <p>Umgebung: ${suiteResult.environment.platform} | Node ${suiteResult.environment.nodeVersion}</p>
        ${suiteResult.environment.commit ? `<p>Commit: ${suiteResult.environment.commit}</p>` : ''}
    </div>

    <div class="summary">
        <div class="metric">
            <h3>Gesamt</h3>
            <div style="font-size: 2em; font-weight: bold;">${summary.total}</div>
        </div>
        <div class="metric pass">
            <h3>Bestanden</h3>
            <div style="font-size: 2em; font-weight: bold;">${summary.passed}</div>
        </div>
        <div class="metric fail">
            <h3>Fehlgeschlagen</h3>
            <div style="font-size: 2em; font-weight: bold;">${summary.failed}</div>
        </div>
        <div class="metric skip">
            <h3>Übersprungen</h3>
            <div style="font-size: 2em; font-weight: bold;">${summary.skipped}</div>
        </div>
        <div class="metric">
            <h3>Erfolgsrate</h3>
            <div style="font-size: 2em; font-weight: bold;">${passRate}%</div>
        </div>
        <div class="metric">
            <h3>Dauer</h3>
            <div style="font-size: 2em; font-weight: bold;">${summary.duration}ms</div>
        </div>
    </div>

    ${summary.coverage ? `
    <div class="summary">
        <h2>Coverage</h2>
        <div class="metric"><h4>Statements</h4><div>${summary.coverage.statements}%</div></div>
        <div class="metric"><h4>Branches</h4><div>${summary.coverage.branches}%</div></div>
        <div class="metric"><h4>Functions</h4><div>${summary.coverage.functions}%</div></div>
        <div class="metric"><h4>Lines</h4><div>${summary.coverage.lines}%</div></div>
    </div>
    ` : ''}

    <div class="tests">
        <h2>Test-Ergebnisse</h2>
        ${suiteResult.results.map(test => `
            <div class="test-item test-${test.status}">
                <h3>${test.name}</h3>
                <div class="duration">Dauer: ${test.duration}ms | Kategorie: ${test.category}</div>
                ${test.error ? `<div class="error">${test.error}</div>` : ''}
                ${test.metadata ? `<pre>${JSON.stringify(test.metadata, null, 2)}</pre>` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>`;
  }

  /**
   * Generiert JSON-Bericht
   */
  private generateJsonReport(suiteResult: TestSuiteResult): string {
    return JSON.stringify({
      ...suiteResult,
      generatedAt: new Date().toISOString(),
      config: this.config,
    }, null, 2);
  }

  /**
   * Generiert XML-Bericht (JUnit-kompatibel)
   */
  private generateXmlReport(suiteResult: TestSuiteResult): string {
    const { summary } = suiteResult;

    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="${suiteResult.suiteName}" tests="${summary.total}" failures="${summary.failed}" skipped="${summary.skipped}" time="${summary.duration / 1000}">
    <testsuite name="${suiteResult.suiteName}" tests="${summary.total}" failures="${summary.failed}" skipped="${summary.skipped}" time="${summary.duration / 1000}">
        ${suiteResult.results.map(test => `
        <testcase name="${test.name}" classname="${test.category}" time="${test.duration / 1000}">
            ${test.error ? `<failure message="${test.error}">${test.error}</failure>` : ''}
            ${test.status === 'skipped' ? '<skipped/>' : ''}
        </testcase>`).join('')}
    </testsuite>
</testsuites>`;
  }

  /**
   * Generiert Markdown-Bericht
   */
  private generateMarkdownReport(suiteResult: TestSuiteResult): string {
    const { summary } = suiteResult;
    const passRate = summary.total > 0 ? (summary.passed / summary.total * 100).toFixed(2) : '0.00';

    return `# Test-Bericht: ${suiteResult.suiteName}

## Übersicht

- **Generiert am:** ${suiteResult.environment.timestamp.toLocaleString('de-DE')}
- **Umgebung:** ${suiteResult.environment.platform} | Node ${suiteResult.environment.nodeVersion}
${suiteResult.environment.commit ? `- **Commit:** ${suiteResult.environment.commit}\n` : ''}

## Zusammenfassung

| Metrik | Wert |
|--------|------|
| Gesamt Tests | ${summary.total} |
| Bestanden | ${summary.passed} ✅ |
| Fehlgeschlagen | ${summary.failed} ❌ |
| Übersprungen | ${summary.skipped} ⏭️ |
| Ausstehend | ${summary.pending} ⏳ |
| Erfolgsrate | ${passRate}% |
| Gesamtdauer | ${summary.duration}ms |

${summary.coverage ? `
## Coverage

| Typ | Prozent |
|-----|---------|
| Statements | ${summary.coverage.statements}% |
| Branches | ${summary.coverage.branches}% |
| Functions | ${summary.coverage.functions}% |
| Lines | ${summary.coverage.lines}% |
` : ''}

## Test-Ergebnisse

${suiteResult.results.map(test => `
### ${test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⏭️'} ${test.name}

- **Dauer:** ${test.duration}ms
- **Kategorie:** ${test.category}
- **Zeitstempel:** ${test.timestamp.toLocaleString('de-DE')}
${test.error ? `\n**Fehler:**\n\`\`\`\n${test.error}\n\`\`\`\n` : ''}
${test.metadata ? `\n**Metadaten:**\n\`\`\`json\n${JSON.stringify(test.metadata, null, 2)}\n\`\`\`\n` : ''}
`).join('')}

---
*Bericht generiert von Test-Suite v2*
`;
  }

  /**
   * Generiert Zusammenfassungsbericht für mehrere Suites
   */
  private async generateSummaryReport(suiteResults: TestSuiteResult[]): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `test-summary-${timestamp}.md`;
    const filePath = path.join(this.config.outputDir, fileName);

    const totalSummary = suiteResults.reduce(
      (acc, suite) => ({
        total: acc.total + suite.summary.total,
        passed: acc.passed + suite.summary.passed,
        failed: acc.failed + suite.summary.failed,
        skipped: acc.skipped + suite.summary.skipped,
        pending: acc.pending + suite.summary.pending,
        duration: acc.duration + suite.summary.duration,
      }),
      { total: 0, passed: 0, failed: 0, skipped: 0, pending: 0, duration: 0 }
    );

    const overallPassRate = totalSummary.total > 0
      ? (totalSummary.passed / totalSummary.total * 100).toFixed(2)
      : '0.00';

    const content = `# Test-Suite v2 - Zusammenfassungsbericht

## Gesamtübersicht

- **Generiert am:** ${new Date().toLocaleString('de-DE')}
- **Anzahl Suites:** ${suiteResults.length}
- **Gesamtdauer:** ${totalSummary.duration}ms

## Gesamtergebnisse

| Metrik | Wert |
|--------|------|
| Gesamt Tests | ${totalSummary.total} |
| Bestanden | ${totalSummary.passed} ✅ |
| Fehlgeschlagen | ${totalSummary.failed} ❌ |
| Übersprungen | ${totalSummary.skipped} ⏭️ |
| Ausstehend | ${totalSummary.pending} ⏳ |
| Erfolgsrate | ${overallPassRate}% |

## Suite-Ergebnisse

${suiteResults.map(suite => {
  const passRate = suite.summary.total > 0
    ? (suite.summary.passed / suite.summary.total * 100).toFixed(2)
    : '0.00';

  return `### ${suite.suiteName}

- **Tests:** ${suite.summary.total}
- **Bestanden:** ${suite.summary.passed} (${passRate}%)
- **Fehlgeschlagen:** ${suite.summary.failed}
- **Dauer:** ${suite.summary.duration}ms
- **Umgebung:** ${suite.environment.platform} | Node ${suite.environment.nodeVersion}

**Status:** ${suite.summary.failed === 0 ? '✅ Alle Tests bestanden' : `❌ ${suite.summary.failed} Tests fehlgeschlagen`}
`;
}).join('\n')}

## Empfehlungen

${totalSummary.failed > 0 ? `- **Kritisch:** ${totalSummary.failed} Tests sind fehlgeschlagen und müssen behoben werden` : '- **Erfolgreich:** Alle Tests sind bestanden'}
${totalSummary.skipped > 0 ? `- **Hinweis:** ${totalSummary.skipped} Tests wurden übersprungen` : ''}
${overallPassRate < 80 ? `- **Warnung:** Erfolgsrate unter 80% - Qualitätsverbesserung empfohlen` : ''}

---
*Automatisch generiert von Test-Suite v2*
`;

    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * Sammelt Test-Ergebnisse aus verschiedenen Quellen
   */
  static async collectTestResults(): Promise<TestSuiteResult[]> {
    const logger = getTestLogger();

    // Hier würden die tatsächlichen Test-Ergebnisse aus verschiedenen Quellen gesammelt
    // Für diese Demo erstellen wir Beispieldaten

    const mockResults: TestSuiteResult[] = [
      {
        suiteName: 'unit-tests',
        results: [
          {
            testId: 'logger-1',
            name: 'Logger sollte Nachrichten korrekt formatieren',
            status: 'passed',
            duration: 45,
            category: 'unit',
            timestamp: new Date(),
          },
          {
            testId: 'database-1',
            name: 'Datenbank sollte erfolgreich verbinden',
            status: 'passed',
            duration: 120,
            category: 'unit',
            timestamp: new Date(),
          },
        ],
        summary: {
          total: 2,
          passed: 2,
          failed: 0,
          skipped: 0,
          pending: 0,
          duration: 165,
          coverage: {
            statements: 85,
            branches: 80,
            functions: 90,
            lines: 85,
          },
        },
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          timestamp: new Date(),
        },
      },
      {
        suiteName: 'integration-tests',
        results: [
          {
            testId: 'auth-flow-1',
            name: 'Vollständiger Authentifizierungs-Flow',
            status: 'passed',
            duration: 250,
            category: 'integration',
            timestamp: new Date(),
          },
          {
            testId: 'api-validation-1',
            name: 'API Input-Validierung',
            status: 'failed',
            duration: 180,
            error: 'ValidationError: Email format invalid',
            category: 'integration',
            timestamp: new Date(),
          },
        ],
        summary: {
          total: 2,
          passed: 1,
          failed: 1,
          skipped: 0,
          pending: 0,
          duration: 430,
          coverage: {
            statements: 75,
            branches: 70,
            functions: 80,
            lines: 75,
          },
        },
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          timestamp: new Date(),
        },
      },
    ];

    logger.info(`${mockResults.length} Test-Suites gesammelt`);
    return mockResults;
  }
}

/**
 * CLI-Funktion zum Ausführen der Berichts-Generierung
 */
async function main() {
  const logger = getTestLogger();
  logger.info('Starte Berichts-Generierung...');

  try {
    // Sammle Test-Ergebnisse
    const testResults = await TestReportGenerator.collectTestResults();

    // Generiere Berichte
    const generator = new TestReportGenerator({
      outputDir: './reports',
      formats: ['html', 'json', 'markdown'],
      includeCoverage: true,
      includePerformance: true,
    });

    const generatedFiles: string[] = [];

    for (const result of testResults) {
      const files = await generator.generateReport(result);
      generatedFiles.push(...files);
    }

    logger.info(`Berichte erfolgreich generiert: ${generatedFiles.join(', ')}`);

    // Zeige Zusammenfassung
    console.log('\n📊 Berichts-Zusammenfassung:');
    console.log(`📁 Generierte Dateien: ${generatedFiles.length}`);
    console.log(`📂 Output-Verzeichnis: ./reports`);
    console.log('\n📋 Dateien:');
    generatedFiles.forEach(file => {
      console.log(`  ✅ ${path.relative(process.cwd(), file)}`);
    });

  } catch (error) {
    logger.error('Fehler bei der Berichts-Generierung', error);
    process.exit(1);
  }
}

// Führe aus, wenn direkt aufgerufen
if (require.main === module) {
  main();
}

export { TestReportGenerator, TestResult, TestSuiteResult, ReportConfig };