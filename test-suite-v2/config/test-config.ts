/**
 * Zentrale Konfigurationsdatei für die Test-Suite v2
 * Definiert alle testbezogenen Einstellungen und Umgebungsvariablen
 */

export interface TestConfig {
  environment: {
    baseUrl: string;
    apiUrl: string;
    databaseUrl: string;
    jwtSecret: string;
    nodeEnv: string;
  };
  timeouts: {
    api: number;
    page: number;
    element: number;
    test: number;
  };
  retries: {
    unit: number;
    integration: number;
    e2e: number;
  };
  coverage: {
    enabled: boolean;
    thresholds: {
      global: number;
      unit: number;
      integration: number;
      e2e: number;
    };
    exclude: string[];
  };
  reporting: {
    enabled: boolean;
    formats: string[];
    outputDir: string;
    includeScreenshots: boolean;
    includeVideos: boolean;
  };
  testData: {
    users: {
      admin: UserData;
      regular: UserData;
      premium: UserData;
    };
    projects: ProjectData[];
    newsletters: NewsletterData[];
  };
  parallel: {
    enabled: boolean;
    workers: number;
  };
}

export interface UserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'premium';
  verified: boolean;
}

export interface ProjectData {
  name: string;
  description: string;
  status: 'active' | 'completed' | 'archived';
  tags: string[];
}

export interface NewsletterData {
  email: string;
  subscribed: boolean;
  preferences: {
    frequency: 'daily' | 'weekly' | 'monthly';
    categories: string[];
  };
}

/**
 * Lädt die Test-Konfiguration basierend auf der Umgebung
 */
export function loadTestConfig(): TestConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';

  return {
    environment: {
      baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
      apiUrl: process.env.TEST_API_URL || 'http://localhost:3000/api',
      databaseUrl: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db',
      jwtSecret: process.env.TEST_JWT_SECRET || 'test-jwt-secret-key',
      nodeEnv,
    },
    timeouts: {
      api: parseInt(process.env.TEST_API_TIMEOUT || '10000'),
      page: parseInt(process.env.TEST_PAGE_TIMEOUT || '30000'),
      element: parseInt(process.env.TEST_ELEMENT_TIMEOUT || '10000'),
      test: parseInt(process.env.TEST_TIMEOUT || '60000'),
    },
    retries: {
      unit: parseInt(process.env.TEST_UNIT_RETRIES || '0'),
      integration: parseInt(process.env.TEST_INTEGRATION_RETRIES || '2'),
      e2e: parseInt(process.env.TEST_E2E_RETRIES || '1'),
    },
    coverage: {
      enabled: process.env.TEST_COVERAGE_ENABLED !== 'false',
      thresholds: {
        global: parseInt(process.env.TEST_COVERAGE_GLOBAL || '80'),
        unit: parseInt(process.env.TEST_COVERAGE_UNIT || '85'),
        integration: parseInt(process.env.TEST_COVERAGE_INTEGRATION || '75'),
        e2e: parseInt(process.env.TEST_COVERAGE_E2E || '70'),
      },
      exclude: [
        'node_modules/**',
        'dist/**',
        'coverage/**',
        'reports/**',
        '**/*.config.{js,ts}',
        '**/*.d.ts',
        '**/test-data/**',
        '**/fixtures/**',
      ],
    },
    reporting: {
      enabled: process.env.TEST_REPORTING_ENABLED !== 'false',
      formats: (process.env.TEST_REPORT_FORMATS || 'html,json,text').split(','),
      outputDir: process.env.TEST_REPORT_DIR || './reports',
      includeScreenshots: process.env.TEST_INCLUDE_SCREENSHOTS === 'true',
      includeVideos: process.env.TEST_INCLUDE_VIDEOS === 'true',
    },
    testData: {
      users: {
        admin: {
          email: 'admin@test-suite.local',
          password: 'AdminPass123!',
          firstName: 'Test',
          lastName: 'Admin',
          role: 'admin',
          verified: true,
        },
        regular: {
          email: 'user@test-suite.local',
          password: 'UserPass123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'user',
          verified: true,
        },
        premium: {
          email: 'premium@test-suite.local',
          password: 'PremiumPass123!',
          firstName: 'Test',
          lastName: 'Premium',
          role: 'premium',
          verified: true,
        },
      },
      projects: [
        {
          name: 'Test Project Alpha',
          description: 'Ein umfassendes Testprojekt für die Validierung der Plattform',
          status: 'active',
          tags: ['testing', 'automation', 'quality-assurance'],
        },
        {
          name: 'Test Project Beta',
          description: 'Integrationstests für API-Endpunkte',
          status: 'completed',
          tags: ['api', 'integration', 'backend'],
        },
      ],
      newsletters: [
        {
          email: 'newsletter@test-suite.local',
          subscribed: true,
          preferences: {
            frequency: 'weekly',
            categories: ['technology', 'development'],
          },
        },
      ],
    },
    parallel: {
      enabled: process.env.TEST_PARALLEL_ENABLED !== 'false',
      workers: parseInt(process.env.TEST_PARALLEL_WORKERS || '4'),
    },
  };
}

/**
 * Validiert die Test-Konfiguration
 */
export function validateTestConfig(config: TestConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validierung der URLs
  try {
    new URL(config.environment.baseUrl);
  } catch {
    errors.push('Ungültige baseUrl in der Test-Konfiguration');
  }

  try {
    new URL(config.environment.apiUrl);
  } catch {
    errors.push('Ungültige apiUrl in der Test-Konfiguration');
  }

  // Validierung der Timeouts
  if (config.timeouts.api <= 0) {
    errors.push('API-Timeout muss größer als 0 sein');
  }

  if (config.timeouts.test <= 0) {
    errors.push('Test-Timeout muss größer als 0 sein');
  }

  // Validierung der Coverage-Thresholds
  if (config.coverage.thresholds.global < 0 || config.coverage.thresholds.global > 100) {
    errors.push('Globaler Coverage-Threshold muss zwischen 0 und 100 liegen');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Export der Standardkonfiguration
export const testConfig = loadTestConfig();

// Validierung beim Laden
const validation = validateTestConfig(testConfig);
if (!validation.valid) {
  console.error('Test-Konfiguration ist ungültig:', validation.errors);
  process.exit(1);
}