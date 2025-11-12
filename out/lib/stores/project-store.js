'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.useProjectStore = void 0;
const zustand_1 = require('zustand');
const middleware_1 = require('zustand/middleware');
function assertApiResult(value) {
  if (typeof value !== 'object' || value === null || !('success' in value)) {
    throw new Error('Invalid API response structure');
  }
  const successFlag = value.success;
  if (successFlag === true) {
    if (!('data' in value)) {
      throw new Error('Success response missing data field');
    }
    return;
  }
  if (successFlag === false) {
    const errorPayload = value.error;
    if (
      !errorPayload ||
      typeof errorPayload !== 'object' ||
      typeof errorPayload.message !== 'string'
    ) {
      throw new Error('Error response missing error payload');
    }
    return;
  }
  throw new Error('API response has invalid success flag');
}
const initialState = {
  projects: [],
  loading: false,
  error: null,
  filters: {},
  selectedProject: null,
};
exports.useProjectStore = (0, zustand_1.create)()(
  (0, middleware_1.devtools)(
    (set, get) => ({
      ...initialState,
      fetchProjects: async () => {
        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/dashboard/projects', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const json = await response.json();
          assertApiResult(json);
          if (json.success) {
            set({ projects: json.data, loading: false });
          } else {
            throw new Error(json.error.message || 'Failed to fetch projects');
          }
        } catch (error) {
          console.error('Error fetching projects:', error);
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          });
        }
      },
      fetchProject: async (id) => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`/api/dashboard/projects/${id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const json = await response.json();
          assertApiResult(json);
          if (json.success) {
            set((state) => ({
              selectedProject: json.data,
              projects: state.projects.map((p) => (p.id === id ? json.data : p)),
              loading: false,
            }));
          } else {
            throw new Error(json.error.message || 'Failed to fetch project');
          }
        } catch (error) {
          console.error('Error fetching project:', error);
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          });
        }
      },
      createProject: async (data) => {
        set({ loading: true, error: null });
        try {
          const csrfToken = getCsrfToken();
          const response = await fetch('/api/projects', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfToken,
            },
            body: JSON.stringify(data),
          });
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const json = await response.json();
          assertApiResult(json);
          if (json.success) {
            set((state) => ({
              projects: [json.data, ...state.projects],
              loading: false,
            }));
          } else {
            throw new Error(json.error.message || 'Failed to create project');
          }
        } catch (error) {
          console.error('Error creating project:', error);
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          });
        }
      },
      updateProject: async (data) => {
        set({ loading: true, error: null });
        try {
          const csrfToken = getCsrfToken();
          const response = await fetch(`/api/projects/${data.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfToken,
            },
            body: JSON.stringify(data),
          });
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const json = await response.json();
          assertApiResult(json);
          if (json.success) {
            set((state) => ({
              projects: state.projects.map((p) => (p.id === data.id ? json.data : p)),
              selectedProject:
                state.selectedProject?.id === data.id ? json.data : state.selectedProject,
              loading: false,
            }));
          } else {
            throw new Error(json.error.message || 'Failed to update project');
          }
        } catch (error) {
          console.error('Error updating project:', error);
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          });
        }
      },
      deleteProject: async (id) => {
        set({ loading: true, error: null });
        try {
          const csrfToken = getCsrfToken();
          const response = await fetch(`/api/projects/${id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfToken,
            },
          });
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const json = await response.json();
          assertApiResult(json);
          if (json.success) {
            set((state) => ({
              projects: state.projects.filter((p) => p.id !== id),
              selectedProject: state.selectedProject?.id === id ? null : state.selectedProject,
              loading: false,
            }));
          } else {
            throw new Error(json.error.message || 'Failed to delete project');
          }
        } catch (error) {
          console.error('Error deleting project:', error);
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          });
        }
      },
      setProjects: (projects) => {
        set({ projects });
      },
      setSelectedProject: (project) => {
        set({ selectedProject: project });
      },
      setFilters: (filters) => {
        set({ filters });
      },
      clearError: () => {
        set({ error: null });
      },
      getFilteredProjects: () => {
        const { projects, filters } = get();
        let filtered = projects;
        if (filters.status) {
          filtered = filtered.filter((p) => p.status === filters.status);
        }
        if (filters.search) {
          const search = filters.search.toLowerCase();
          filtered = filtered.filter(
            (p) =>
              p.title.toLowerCase().includes(search) || p.description.toLowerCase().includes(search)
          );
        }
        return filtered;
      },
      getProjectById: (id) => {
        const { projects } = get();
        return projects.find((p) => p.id === id);
      },
    }),
    {
      name: 'project-store',
    }
  )
);
// Helper function to get CSRF token
function getCsrfToken() {
  const token = document.cookie
    .split('; ')
    .find((row) => row.startsWith('csrf_token='))
    ?.split('=')[1];
  return token || '';
}
