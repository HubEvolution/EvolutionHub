'use strict';
/**
 * Script Coordinator - Centralized Script Management System
 *
 * Eliminates event listener conflicts and provides prioritized script initialization.
 * Ensures scripts load in correct order without interference.
 */
Object.defineProperty(exports, '__esModule', { value: true });
exports.SCRIPT_PRIORITIES = void 0;
// Script Priority Levels
exports.SCRIPT_PRIORITIES = {
  CRITICAL: 0, // Essential functionality (Header, Navigation)
  HIGH: 1, // Important features (Scroll effects, Theme)
  MEDIUM: 2, // Nice-to-have (Analytics, Animations)
  LOW: 3, // Optional (Settings page specific)
  BACKGROUND: 4, // Background tasks (Cleanup, etc.)
};
class ScriptCoordinator {
  constructor() {
    this.modules = new Map();
    this.initPromises = new Map();
    this.readyModules = new Set();
    this.isPageReady = false;
  }
  /**
   * Register a script module
   */
  register(module) {
    module.status = 'pending';
    this.modules.set(module.id, module);
    const { dlog } = getLoggers();
    dlog(`[ScriptCoordinator] Registered module: ${module.id}`, {
      priority: module.priority,
      hasDependencies: !!(module.dependencies && module.dependencies.length > 0),
      dependencies: module.dependencies || [],
      hasPageFilter: !!module.pageFilter,
      pageFilter: module.pageFilter ? module.pageFilter.toString() : 'none',
      hasCleanup: !!module.cleanup,
      timestamp: new Date().toISOString(),
    });
    // Auto-initialize if page is already ready
    if (this.isPageReady) {
      this.initializeModule(module.id);
    }
  }
  /**
   * Initialize all registered modules in priority order
   */
  async initializeAll() {
    const { dlog, dtrace } = getLoggers();
    dlog('[ScriptCoordinator] Starting initialization of all modules');
    // Get current page path for filtering
    const currentPath = window.location.pathname;
    // Filter modules based on page requirements
    const applicableModules = Array.from(this.modules.entries())
      .filter(([, module]) => {
        if (module.pageFilter) {
          return module.pageFilter(currentPath);
        }
        return true; // No filter = applies to all pages
      })
      .sort(([, a], [, b]) => a.priority - b.priority);
    dtrace(
      `[ScriptCoordinator] Found ${applicableModules.length} applicable modules for path: ${currentPath}`
    );
    // Initialize modules in priority order
    for (const [moduleId] of applicableModules) {
      await this.initializeModule(moduleId);
    }
    this.isPageReady = true;
    dlog('[ScriptCoordinator] All modules initialized successfully');
  }
  /**
   * Initialize a specific module with dependency resolution
   */
  async initializeModule(moduleId) {
    const { dlog } = getLoggers();
    const module = this.modules.get(moduleId);
    if (!module) {
      console.warn(`[ScriptCoordinator] Module not found: ${moduleId}`);
      return;
    }
    // Skip if already ready or initializing
    if (this.readyModules.has(moduleId) || this.initPromises.has(moduleId)) {
      return this.initPromises.get(moduleId) || Promise.resolve();
    }
    dlog(`[ScriptCoordinator] Initializing module: ${moduleId}`);
    module.status = 'initializing';
    // Check dependencies first
    if (module.dependencies) {
      for (const depId of module.dependencies) {
        if (!this.readyModules.has(depId)) {
          dlog(`[ScriptCoordinator] Waiting for dependency: ${depId} (required by ${moduleId})`);
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
      dlog(`[ScriptCoordinator] Module ready: ${moduleId}`);
    } catch (error) {
      module.status = 'error';
      console.error(`[ScriptCoordinator] Module initialization failed: ${moduleId}`, error);
    }
  }
  /**
   * Safe module initialization with error handling
   */
  async safeInitialize(module) {
    const { dlog, dtrace } = getLoggers();
    dlog(`[ScriptCoordinator] Starting initialization of module: ${module.id}`);
    try {
      dtrace(`[ScriptCoordinator] Calling init() for module: ${module.id}`);
      const result = module.init();
      if (result instanceof Promise) {
        dtrace(`[ScriptCoordinator] Module ${module.id} returned Promise, awaiting...`);
        await result;
        dtrace(`[ScriptCoordinator] Promise resolved for module: ${module.id}`);
      } else {
        dtrace(`[ScriptCoordinator] Module ${module.id} returned synchronously`);
      }
      dlog(`[ScriptCoordinator] ✅ Module ${module.id} initialized successfully`);
    } catch (error) {
      console.error(`[ScriptCoordinator] ❌ Error initializing ${module.id}:`, error);
      console.error(`[ScriptCoordinator] Error details:`, {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        moduleId: module.id,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }
  /**
   * Cleanup all modules (for page transitions)
   */
  cleanup() {
    const { dlog } = getLoggers();
    dlog('[ScriptCoordinator] Cleaning up all modules');
    for (const [moduleId, module] of this.modules.entries()) {
      if (module.cleanup && this.readyModules.has(moduleId)) {
        try {
          module.cleanup();
          dlog(`[ScriptCoordinator] Cleaned up module: ${moduleId}`);
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
  getStatus() {
    const status = {};
    for (const [id, module] of this.modules.entries()) {
      status[id] = module.status ?? 'pending';
    }
    return status;
  }
  /**
   * Check if all critical modules are ready
   */
  areCriticalModulesReady() {
    for (const [id, module] of this.modules.entries()) {
      if (module.priority === exports.SCRIPT_PRIORITIES.CRITICAL && !this.readyModules.has(id)) {
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
  const { dlog } = getLoggers();
  dlog('[ScriptCoordinator] DOM Content Loaded');
  await coordinator.initializeAll();
});
document.addEventListener('astro:page-load', async () => {
  if (isInitialLoad) {
    isInitialLoad = false;
    return; // Skip on initial load (already handled by DOMContentLoaded)
  }
  const { dlog } = getLoggers();
  dlog('[ScriptCoordinator] Astro page transition detected');
  coordinator.cleanup();
  await coordinator.initializeAll();
});
// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  coordinator.cleanup();
});
// Export for use in other modules
exports.default = coordinator;
// Debug flag helpers (client-only)
function getLoggers() {
  const isDev =
    typeof location !== 'undefined' &&
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
  const verbose = (() => {
    try {
      return (
        isDev &&
        (localStorage.getItem('debug.scriptCoordinator') === '1' ||
          new URLSearchParams(location.search).has('debugScripts'))
      );
    } catch {
      return false;
    }
  })();
  const trace = (() => {
    try {
      return isDev && localStorage.getItem('debug.scriptCoordinatorTrace') === '1';
    } catch {
      return false;
    }
  })();
  const dlog = (...args) => {
    if (verbose) console.debug(...args);
  };
  const dtrace = (...args) => {
    if (trace) console.debug(...args);
  };
  return { dlog, dtrace };
}
