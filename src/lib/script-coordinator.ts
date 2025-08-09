/**
 * Script Coordinator - Centralized Script Management System
 * 
 * Eliminates event listener conflicts and provides prioritized script initialization.
 * Ensures scripts load in correct order without interference.
 */

// Script Priority Levels
export const SCRIPT_PRIORITIES = {
  CRITICAL: 0,    // Essential functionality (Header, Navigation)
  HIGH: 1,        // Important features (Scroll effects, Theme)
  MEDIUM: 2,      // Nice-to-have (Analytics, Animations)
  LOW: 3,         // Optional (Settings page specific)
  BACKGROUND: 4   // Background tasks (Cleanup, etc.)
} as const;

// Script Initialization Status
type ScriptStatus = 'pending' | 'initializing' | 'ready' | 'error';

interface ScriptModule {
  id: string;
  priority: number;
  status?: ScriptStatus; // Optional - wird intern vom Coordinator verwaltet
  init: () => Promise<void> | void;
  cleanup?: () => void;
  dependencies?: string[];
  pageFilter?: (pathname: string) => boolean;
}

class ScriptCoordinator {
  private modules = new Map<string, ScriptModule>();
  private initPromises = new Map<string, Promise<void>>();
  private readyModules = new Set<string>();
  private isPageReady = false;
  private pendingInitializations: string[] = [];

  /**
   * Register a script module
   */
  register(module: ScriptModule): void {
    module.status = 'pending';
    this.modules.set(module.id, module);
    
    console.log(`[ScriptCoordinator] Registered module: ${module.id}`, {
      priority: module.priority,
      hasDependencies: !!(module.dependencies && module.dependencies.length > 0),
      dependencies: module.dependencies || [],
      hasPageFilter: !!module.pageFilter,
      pageFilter: module.pageFilter ? module.pageFilter.toString() : 'none',
      hasCleanup: !!module.cleanup,
      timestamp: new Date().toISOString()
    });
    
    // Auto-initialize if page is already ready
    if (this.isPageReady) {
      this.initializeModule(module.id);
    }
  }

  /**
   * Initialize all registered modules in priority order
   */
  async initializeAll(): Promise<void> {
    console.log('[ScriptCoordinator] Starting initialization of all modules');
    
    // Get current page path for filtering
    const currentPath = window.location.pathname;
    
    // Filter modules based on page requirements
    const applicableModules = Array.from(this.modules.entries())
      .filter(([id, module]) => {
        if (module.pageFilter) {
          return module.pageFilter(currentPath);
        }
        return true; // No filter = applies to all pages
      })
      .sort(([, a], [, b]) => a.priority - b.priority);

    console.log(`[ScriptCoordinator] Found ${applicableModules.length} applicable modules for path: ${currentPath}`);

    // Initialize modules in priority order
    for (const [moduleId, module] of applicableModules) {
      await this.initializeModule(moduleId);
    }

    this.isPageReady = true;
    console.log('[ScriptCoordinator] All modules initialized successfully');
  }

  /**
   * Initialize a specific module with dependency resolution
   */
  private async initializeModule(moduleId: string): Promise<void> {
    const module = this.modules.get(moduleId);
    if (!module) {
      console.warn(`[ScriptCoordinator] Module not found: ${moduleId}`);
      return;
    }

    // Skip if already ready or initializing
    if (this.readyModules.has(moduleId) || this.initPromises.has(moduleId)) {
      return this.initPromises.get(moduleId) || Promise.resolve();
    }

    console.log(`[ScriptCoordinator] Initializing module: ${moduleId}`);
    module.status = 'initializing';

    // Check dependencies first
    if (module.dependencies) {
      for (const depId of module.dependencies) {
        if (!this.readyModules.has(depId)) {
          console.log(`[ScriptCoordinator] Waiting for dependency: ${depId} (required by ${moduleId})`);
          await this.initializeModule(depId);
        }
      }
    }

    // Initialize the module
    const initPromise = this.safeInitialize(module);
    this.initPromises.set(moduleId, initPromise);

    try {
      await initPromise;
      module.status = 'ready';
      this.readyModules.add(moduleId);
      console.log(`[ScriptCoordinator] Module ready: ${moduleId}`);
    } catch (error) {
      module.status = 'error';
      console.error(`[ScriptCoordinator] Module initialization failed: ${moduleId}`, error);
    }
  }

  /**
   * Safe module initialization with error handling
   */
  private async safeInitialize(module: ScriptModule): Promise<void> {
    console.log(`[ScriptCoordinator] Starting initialization of module: ${module.id}`);
    
    try {
      console.log(`[ScriptCoordinator] Calling init() for module: ${module.id}`);
      const result = module.init();
      
      if (result instanceof Promise) {
        console.log(`[ScriptCoordinator] Module ${module.id} returned Promise, awaiting...`);
        await result;
        console.log(`[ScriptCoordinator] Promise resolved for module: ${module.id}`);
      } else {
        console.log(`[ScriptCoordinator] Module ${module.id} returned synchronously`);
      }
      
      console.log(`[ScriptCoordinator] ✅ Module ${module.id} initialized successfully`);
    } catch (error) {
      console.error(`[ScriptCoordinator] ❌ Error initializing ${module.id}:`, error);
      console.error(`[ScriptCoordinator] Error details:`, {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        moduleId: module.id,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Cleanup all modules (for page transitions)
   */
  cleanup(): void {
    console.log('[ScriptCoordinator] Cleaning up all modules');
    
    for (const [moduleId, module] of this.modules.entries()) {
      if (module.cleanup && this.readyModules.has(moduleId)) {
        try {
          module.cleanup();
          console.log(`[ScriptCoordinator] Cleaned up module: ${moduleId}`);
        } catch (error) {
          console.error(`[ScriptCoordinator] Cleanup error for ${moduleId}:`, error);
        }
      }
    }

    // Reset state
    this.readyModules.clear();
    this.initPromises.clear();
    this.isPageReady = false;
  }

  /**
   * Get module status for debugging
   */
  getStatus(): Record<string, ScriptStatus> {
    const status: Record<string, ScriptStatus> = {};
    for (const [id, module] of this.modules.entries()) {
      status[id] = module.status;
    }
    return status;
  }

  /**
   * Check if all critical modules are ready
   */
  areCriticalModulesReady(): boolean {
    for (const [id, module] of this.modules.entries()) {
      if (module.priority === SCRIPT_PRIORITIES.CRITICAL && !this.readyModules.has(id)) {
        return false;
      }
    }
    return true;
  }
}

// Global coordinator instance
const coordinator = new ScriptCoordinator();

// Unified Event Handler for Astro Page Loads
let isInitialLoad = true;

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[ScriptCoordinator] DOM Content Loaded');
  await coordinator.initializeAll();
});

document.addEventListener('astro:page-load', async () => {
  if (isInitialLoad) {
    isInitialLoad = false;
    return; // Skip on initial load (already handled by DOMContentLoaded)
  }
  
  console.log('[ScriptCoordinator] Astro page transition detected');
  coordinator.cleanup();
  await coordinator.initializeAll();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  coordinator.cleanup();
});

// Export for use in other modules
export default coordinator;
export type { ScriptModule };
