/**
 * Project Service Interface und Implementierung
 * 
 * Verantwortlich für alle projektbezogenen Operationen wie Projekterstellung, -aktualisierung,
 * -löschung und Task-Management. Kapselt Datenbankzugriffe und Geschäftslogik.
 */

import type { BaseService, ServiceDependencies } from './types';
import type { Project, Task, CreateProject, UpdateProject, CreateTask, UpdateTask } from '@/lib/db/types';

/**
 * Interface für den Project Service
 */
export interface ProjectService extends BaseService {
  /**
   * Erstellt ein neues Projekt
   * 
   * @param userId ID des Projektbesitzers
   * @param data Projektdaten
   * @returns Das erstellte Projekt
   */
  createProject(userId: string, data: CreateProject): Promise<Project>;

  /**
   * Holt ein Projekt anhand seiner ID
   * 
   * @param projectId ID des Projekts
   * @param options Optionale Parameter wie `includeComments` und `includeActivity`
   * @returns Das Projekt oder null, falls nicht gefunden
   */
  getProjectById(projectId: string, options?: {
    includeComments?: boolean;
    includeActivity?: boolean;
  }): Promise<Project | null>;

  /**
   * Holt alle Projekte eines Benutzers
   * 
   * @param userId ID des Benutzers
   * @param options Optionale Parameter wie Paginierung und Sortierung
   * @returns Eine Liste von Projekten
   */
  getUserProjects(userId: string, options?: {
    limit?: number;
    offset?: number;
    sortBy?: 'created_at' | 'updated_at' | 'title' | 'status';
    sortOrder?: 'asc' | 'desc';
    status?: 'active' | 'archived' | 'completed';
  }): Promise<Project[]>;

  /**
   * Aktualisiert ein Projekt
   * 
   * @param projectId ID des zu aktualisierenden Projekts
   * @param userId ID des anfragenden Benutzers (für Berechtigungsprüfung)
   * @param data Zu aktualisierende Daten
   * @returns Das aktualisierte Projekt
   */
  updateProject(projectId: string, userId: string, data: UpdateProject): Promise<Project>;

  /**
   * Löscht ein Projekt
   * 
   * @param projectId ID des zu löschenden Projekts
   * @param userId ID des anfragenden Benutzers (für Berechtigungsprüfung)
   * @returns true, wenn erfolgreich
   */
  deleteProject(projectId: string, userId: string): Promise<boolean>;

  /**
   * Erstellt eine neue Aufgabe für ein Projekt
   * 
   * @param projectId ID des Projekts
   * @param userId ID des anfragenden Benutzers
   * @param data Aufgabendaten
   * @returns Die erstellte Aufgabe
   */
  createTask(projectId: string, userId: string, data: CreateTask): Promise<Task>;

  /**
   * Holt alle Aufgaben eines Projekts
   * 
   * @param projectId ID des Projekts
   * @param options Optionale Parameter wie Filter und Sortierung
   * @returns Eine Liste von Aufgaben
   */
  getProjectTasks(projectId: string, options?: {
    status?: 'pending' | 'in_progress' | 'completed' | 'all';
    sortBy?: 'created_at' | 'title' | 'status';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Task[]>;

  /**
   * Aktualisiert eine Aufgabe
   * 
   * @param taskId ID der zu aktualisierenden Aufgabe
   * @param userId ID des anfragenden Benutzers (für Berechtigungsprüfung)
   * @param data Zu aktualisierende Daten
   * @returns Die aktualisierte Aufgabe
   */
  updateTask(taskId: string, userId: string, data: UpdateTask): Promise<Task>;

  /**
   * Löscht eine Aufgabe
   * 
   * @param taskId ID der zu löschenden Aufgabe
   * @param userId ID des anfragenden Benutzers (für Berechtigungsprüfung)
   * @returns true, wenn erfolgreich
   */
  deleteTask(taskId: string, userId: string): Promise<boolean>;

  /**
   * Berechnet den Fortschritt eines Projekts basierend auf den erledigten Aufgaben
   * 
   * @param projectId ID des Projekts
   * @returns Fortschrittswert (0-100)
   */
  calculateProjectProgress(projectId: string): Promise<number>;
}

/**
 * Factory-Funktion zur Erstellung einer ProjectService-Instanz
 * 
 * @param deps Abhängigkeiten für den Service
 * @returns Eine neue ProjectService-Instanz
 */
export function createProjectService(_deps: ServiceDependencies): ProjectService {
  // Diese Funktion wird später die tatsächliche Implementierung zurückgeben
  // Derzeit nur ein Platzhalter für das Interface-Design
  return {} as ProjectService;
}
