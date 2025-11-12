/**
 * Testdaten-Management-System für Test-Suite v2
 * Verwaltet Testdaten, Fixtures und Mock-Daten für alle Testtypen
 */

import { testConfig } from '../config/test-config.js';
import { getTestLogger } from '../utils/logger.js';
import * as fs from 'fs';
import * as path from 'path';
import { faker } from '@faker-js/faker';

export interface TestDataSet {
  id: string;
  name: string;
  description: string;
  category: 'unit' | 'integration' | 'e2e' | 'performance';
  data: Record<string, any>;
  metadata: {
    created: Date;
    version: string;
    tags: string[];
    dependencies: string[];
  };
}

export interface DataFactory<T> {
  create: (overrides?: Partial<T>) => T;
  createMany: (count: number, overrides?: Partial<T>[]) => T[];
  reset: () => void;
}

export interface MockDataTemplate {
  name: string;
  template: (context?: any) => any;
  variations: Record<string, any>;
}

/**
 * Hauptklasse für Testdaten-Management
 */
export class TestDataManager {
  private dataSets: Map<string, TestDataSet> = new Map();
  private factories: Map<string, DataFactory<any>> = new Map();
  private templates: Map<string, MockDataTemplate> = new Map();
  private logger = getTestLogger();

  constructor() {
    this.initializeBaseDataSets();
    this.initializeFactories();
    this.initializeTemplates();
  }

  /**
   * Lädt ein DataSet
   */
  loadDataSet(id: string): TestDataSet | null {
    return this.dataSets.get(id) || null;
  }

  /**
   * Speichert ein DataSet
   */
  saveDataSet(dataSet: TestDataSet): void {
    this.dataSets.set(dataSet.id, dataSet);
    this.logger.debug(`DataSet gespeichert: ${dataSet.id}`);
  }

  /**
   * Erstellt ein neues DataSet
   */
  createDataSet(
    id: string,
    name: string,
    category: TestDataSet['category'],
    data: Record<string, any>,
    options: {
      description?: string;
      tags?: string[];
      dependencies?: string[];
    } = {}
  ): TestDataSet {
    const dataSet: TestDataSet = {
      id,
      name,
      description: options.description || '',
      category,
      data,
      metadata: {
        created: new Date(),
        version: '1.0.0',
        tags: options.tags || [],
        dependencies: options.dependencies || [],
      },
    };

    this.saveDataSet(dataSet);
    return dataSet;
  }

  /**
   * Holt eine Factory für einen bestimmten Datentyp
   */
  getFactory<T>(type: string): DataFactory<T> | null {
    return this.factories.get(type) || null;
  }

  /**
   * Registriert eine neue Factory
   */
  registerFactory<T>(type: string, factory: DataFactory<T>): void {
    this.factories.set(type, factory);
    this.logger.debug(`Factory registriert: ${type}`);
  }

  /**
   * Generiert Testdaten basierend auf einem Template
   */
  generateFromTemplate(templateName: string, context?: any): any {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template nicht gefunden: ${templateName}`);
    }

    return template.template(context);
  }

  /**
   * Holt alle verfügbaren Templates
   */
  getAvailableTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Exportiert alle DataSets in eine Datei
   */
  exportDataSets(filePath: string): void {
    const data = {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      dataSets: Array.from(this.dataSets.values()),
    };

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    this.logger.info(`DataSets exportiert nach: ${filePath}`);
  }

  /**
   * Importiert DataSets aus einer Datei
   */
  importDataSets(filePath: string): void {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Datei nicht gefunden: ${filePath}`);
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    for (const dataSet of data.dataSets) {
      this.saveDataSet(dataSet);
    }

    this.logger.info(`DataSets importiert aus: ${filePath}`);
  }

  /**
   * Initialisiert Basis-DataSets
   */
  private initializeBaseDataSets(): void {
    // Auth DataSet
    this.createDataSet(
      'auth-basic',
      'Basis-Authentifizierungsdaten',
      'unit',
      {
        users: testConfig.testData.users,
        sessions: [
          {
            id: 'session-1',
            userId: 1,
            token: 'mock-jwt-token-admin',
            expiresAt: new Date(Date.now() + 3600000), // 1 Stunde
          },
        ],
      },
      {
        description: 'Basisdaten für Authentifizierungs-Tests',
        tags: ['auth', 'users', 'sessions'],
      }
    );

    // Dashboard DataSet
    this.createDataSet(
      'dashboard-stats',
      'Dashboard-Statistiken',
      'integration',
      {
        stats: {
          users: { total: 1250, active: 890, new: 45 },
          projects: { total: 340, active: 280, completed: 60 },
          revenue: { total: 45000, monthly: 5200 },
          performance: { avgResponseTime: 245, uptime: 99.9 },
        },
        activities: [
          {
            id: 1,
            type: 'user_registered',
            message: 'Neuer Benutzer registriert',
            timestamp: new Date().toISOString(),
            user: 'john.doe@example.com',
          },
        ],
      },
      {
        description: 'Statistiken und Aktivitäten für Dashboard-Tests',
        tags: ['dashboard', 'stats', 'activities'],
      }
    );

    // Newsletter DataSet
    this.createDataSet(
      'newsletter-basic',
      'Newsletter-Abonnements',
      'integration',
      {
        subscriptions: testConfig.testData.newsletters,
        campaigns: [
          {
            id: 1,
            name: 'Willkommensserie',
            status: 'active',
            sent: 1250,
            opened: 890,
            clicked: 234,
          },
        ],
      },
      {
        description: 'Newsletter-Abonnements und Kampagnen',
        tags: ['newsletter', 'subscriptions', 'campaigns'],
      }
    );

    // Performance Test DataSet
    this.createDataSet(
      'performance-load',
      'Lasttest-Daten',
      'performance',
      {
        userLoad: Array.from({ length: 1000 }, (_, i) => ({
          id: i + 1,
          email: `perf-user-${i}@test-suite.local`,
          name: faker.person.fullName(),
          lastLogin: faker.date.recent(),
        })),
        concurrentSessions: 50,
        requestPatterns: [
          { endpoint: '/api/auth/login', weight: 0.3 },
          { endpoint: '/api/dashboard/stats', weight: 0.4 },
          { endpoint: '/api/user/profile', weight: 0.2 },
          { endpoint: '/api/newsletter/subscribe', weight: 0.1 },
        ],
      },
      {
        description: 'Daten für Performance- und Lasttests',
        tags: ['performance', 'load-testing', 'stress-test'],
      }
    );

    this.logger.info('Basis-DataSets initialisiert');
  }

  /**
   * Initialisiert Daten-Factories
   */
  private initializeFactories(): void {
    // User Factory
    this.registerFactory('user', {
      create: (overrides = {}) => ({
        id: faker.number.int({ min: 1, max: 10000 }),
        email: faker.internet.email(),
        password: faker.internet.password(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        role: faker.helpers.arrayElement(['user', 'premium', 'admin']),
        verified: faker.datatype.boolean(),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        ...overrides,
      }),

      createMany: (count: number, overrides: any[] = []) => {
        return Array.from({ length: count }, (_, i) =>
          this.getFactory('user')!.create(overrides[i] || {})
        );
      },

      reset: () => {
        faker.seed(12345); // Konsistente Seeds für reproduzierbare Tests
      },
    });

    // Project Factory
    this.registerFactory('project', {
      create: (overrides = {}) => ({
        id: faker.number.int({ min: 1, max: 10000 }),
        name: faker.company.name() + ' Project',
        description: faker.lorem.sentences(2),
        status: faker.helpers.arrayElement(['active', 'completed', 'archived']),
        userId: faker.number.int({ min: 1, max: 1000 }),
        tags: faker.helpers.arrayElements(['web', 'mobile', 'api', 'testing', 'automation'], {
          min: 1,
          max: 3,
        }),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        deadline: faker.date.future(),
        budget: faker.number.int({ min: 1000, max: 100000 }),
        ...overrides,
      }),

      createMany: (count: number, overrides: any[] = []) => {
        return Array.from({ length: count }, (_, i) =>
          this.getFactory('project')!.create(overrides[i] || {})
        );
      },

      reset: () => {
        faker.seed(54321);
      },
    });

    // Newsletter Subscription Factory
    this.registerFactory('newsletter', {
      create: (overrides = {}) => ({
        id: faker.number.int({ min: 1, max: 10000 }),
        email: faker.internet.email(),
        subscribed: faker.datatype.boolean(),
        preferences: {
          frequency: faker.helpers.arrayElement(['daily', 'weekly', 'monthly']),
          categories: faker.helpers.arrayElements(
            ['technology', 'business', 'design', 'marketing'],
            { min: 1, max: 3 }
          ),
        },
        subscribedAt: faker.date.past(),
        unsubscribedAt: faker.datatype.boolean() ? faker.date.recent() : null,
        ...overrides,
      }),

      createMany: (count: number, overrides: any[] = []) => {
        return Array.from({ length: count }, (_, i) =>
          this.getFactory('newsletter')!.create(overrides[i] || {})
        );
      },

      reset: () => {
        faker.seed(98765);
      },
    });

    this.logger.info('Daten-Factories initialisiert');
  }

  /**
   * Initialisiert Mock-Templates
   */
  private initializeTemplates(): void {
    // API Response Template
    this.templates.set('api-response', {
      name: 'API Response',
      template: (context: any = {}) => ({
        success: context.success !== false,
        data: context.data || null,
        message: context.message || 'Operation erfolgreich',
        timestamp: new Date().toISOString(),
        requestId: faker.string.uuid(),
        ...context,
      }),
      variations: {
        success: { success: true, message: 'Erfolgreich abgeschlossen' },
        error: { success: false, message: 'Ein Fehler ist aufgetreten', error: 'GENERIC_ERROR' },
        validation: { success: false, message: 'Validierung fehlgeschlagen', errors: [] },
      },
    });

    // User Profile Template
    this.templates.set('user-profile', {
      name: 'User Profile',
      template: (context: any = {}) => ({
        id: context.id || faker.number.int(),
        email: context.email || faker.internet.email(),
        firstName: context.firstName || faker.person.firstName(),
        lastName: context.lastName || faker.person.lastName(),
        avatar: context.avatar || faker.image.avatar(),
        role: context.role || 'user',
        verified: context.verified !== false,
        preferences: {
          theme: context.theme || 'light',
          language: context.language || 'de',
          notifications: context.notifications !== false,
          ...context.preferences,
        },
        stats: {
          projectsCount: context.projectsCount || faker.number.int({ min: 0, max: 50 }),
          completedTasks: context.completedTasks || faker.number.int({ min: 0, max: 100 }),
          joinedAt: context.joinedAt || faker.date.past(),
          ...context.stats,
        },
        ...context,
      }),
      variations: {
        admin: { role: 'admin', verified: true },
        premium: { role: 'premium', verified: true },
        unverified: { verified: false },
      },
    });

    // Error Response Template
    this.templates.set('error-response', {
      name: 'Error Response',
      template: (context: any = {}) => ({
        success: false,
        error: {
          code: context.code || 'INTERNAL_ERROR',
          message: context.message || 'Ein unerwarteter Fehler ist aufgetreten',
          details: context.details || null,
          timestamp: new Date().toISOString(),
          requestId: faker.string.uuid(),
        },
        ...context,
      }),
      variations: {
        notFound: { code: 'NOT_FOUND', message: 'Ressource nicht gefunden' },
        unauthorized: { code: 'UNAUTHORIZED', message: 'Nicht autorisiert' },
        validation: { code: 'VALIDATION_ERROR', message: 'Validierung fehlgeschlagen' },
        server: { code: 'INTERNAL_SERVER_ERROR', message: 'Interner Server-Fehler' },
      },
    });

    this.logger.info('Mock-Templates initialisiert');
  }
}

/**
 * Globale Instanz des TestDataManagers
 */
let globalDataManager: TestDataManager | null = null;

/**
 * Holt die globale TestDataManager-Instanz
 */
export function getTestDataManager(): TestDataManager {
  if (!globalDataManager) {
    globalDataManager = new TestDataManager();
  }
  return globalDataManager;
}

/**
 * Hilfsfunktionen für häufige Testdaten-Operationen
 */
export const testDataHelpers = {
  /**
   * Erstellt einen zufälligen Benutzer
   */
  createRandomUser: (overrides: any = {}) => {
    return getTestDataManager().getFactory('user')?.create(overrides);
  },

  /**
   * Erstellt mehrere zufällige Benutzer
   */
  createRandomUsers: (count: number, overrides: any[] = []) => {
    return getTestDataManager().getFactory('user')?.createMany(count, overrides);
  },

  /**
   * Erstellt ein zufälliges Projekt
   */
  createRandomProject: (overrides: any = {}) => {
    return getTestDataManager().getFactory('project')?.create(overrides);
  },

  /**
   * Erstellt mehrere zufällige Projekte
   */
  createRandomProjects: (count: number, overrides: any[] = []) => {
    return getTestDataManager().getFactory('project')?.createMany(count, overrides);
  },

  /**
   * Generiert eine erfolgreiche API-Response
   */
  generateSuccessResponse: (data: any = null, message: string = 'Erfolgreich') => {
    return getTestDataManager().generateFromTemplate('api-response', {
      success: true,
      data,
      message,
    });
  },

  /**
   * Generiert eine Fehler-API-Response
   */
  generateErrorResponse: (code: string = 'ERROR', message: string = 'Fehler') => {
    return getTestDataManager().generateFromTemplate('error-response', {
      code,
      message,
    });
  },

  /**
   * Generiert ein zufälliges User-Profil
   */
  generateUserProfile: (overrides: any = {}) => {
    return getTestDataManager().generateFromTemplate('user-profile', overrides);
  },

  /**
   * Lädt Testdaten aus einem DataSet
   */
  loadTestData: (dataSetId: string) => {
    return getTestDataManager().loadDataSet(dataSetId);
  },

  /**
   * Exportiert alle Testdaten
   */
  exportAllData: (filePath: string = './test-data-export.json') => {
    getTestDataManager().exportDataSets(filePath);
  },

  /**
   * Importiert Testdaten
   */
  importTestData: (filePath: string) => {
    getTestDataManager().importDataSets(filePath);
  },
};

/**
 * Testdaten-Validator
 */
export class TestDataValidator {
  static validateUser(user: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!user.email || !user.email.includes('@')) {
      errors.push('Ungültige Email-Adresse');
    }

    if (!user.firstName || user.firstName.length < 2) {
      errors.push('Vorname muss mindestens 2 Zeichen haben');
    }

    if (!user.lastName || user.lastName.length < 2) {
      errors.push('Nachname muss mindestens 2 Zeichen haben');
    }

    if (!['user', 'premium', 'admin'].includes(user.role)) {
      errors.push('Ungültige Benutzerrolle');
    }

    return { valid: errors.length === 0, errors };
  }

  static validateProject(project: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!project.name || project.name.length < 3) {
      errors.push('Projektname muss mindestens 3 Zeichen haben');
    }

    if (!project.description || project.description.length < 10) {
      errors.push('Projektbeschreibung muss mindestens 10 Zeichen haben');
    }

    if (!['active', 'completed', 'archived'].includes(project.status)) {
      errors.push('Ungültiger Projektstatus');
    }

    if (!Array.isArray(project.tags)) {
      errors.push('Tags müssen ein Array sein');
    }

    return { valid: errors.length === 0, errors };
  }

  static validateNewsletter(subscription: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!subscription.email || !subscription.email.includes('@')) {
      errors.push('Ungültige Email-Adresse');
    }

    if (typeof subscription.subscribed !== 'boolean') {
      errors.push('Subscribed muss ein Boolean sein');
    }

    if (!subscription.preferences || typeof subscription.preferences !== 'object') {
      errors.push('Preferences müssen ein Objekt sein');
    }

    return { valid: errors.length === 0, errors };
  }
}
