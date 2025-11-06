import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  ProjectCard,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectFilters,
} from '@/types/dashboard';

type ApiErrorPayload = {
  type: string;
  message: string;
  details?: unknown;
};

type ApiResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: ApiErrorPayload;
    };

type ProjectCardWithMeta = ProjectCard & {
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string | null;
  tags?: string[];
};

function assertApiResult<T>(value: unknown): asserts value is ApiResult<T> {
  if (typeof value !== 'object' || value === null || !('success' in value)) {
    throw new Error('Invalid API response structure');
  }

  const successFlag = (value as { success?: unknown }).success;

  if (successFlag === true) {
    if (!('data' in value)) {
      throw new Error('Success response missing data field');
    }
    return;
  }

  if (successFlag === false) {
    const errorPayload = (value as { error?: unknown }).error;
    if (
      !errorPayload ||
      typeof errorPayload !== 'object' ||
      typeof (errorPayload as { message?: unknown }).message !== 'string'
    ) {
      throw new Error('Error response missing error payload');
    }
    return;
  }

  throw new Error('API response has invalid success flag');
}

interface ProjectState {
  projects: ProjectCardWithMeta[];
  loading: boolean;
  error: string | null;
  filters: ProjectFilters;
  selectedProject: ProjectCardWithMeta | null;
}

interface ProjectActions {
  // Data fetching
  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<void>;

  // CRUD operations
  createProject: (data: CreateProjectRequest) => Promise<void>;
  updateProject: (data: UpdateProjectRequest) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // State management
  setProjects: (projects: ProjectCardWithMeta[]) => void;
  setSelectedProject: (project: ProjectCardWithMeta | null) => void;
  setFilters: (filters: ProjectFilters) => void;
  clearError: () => void;

  // Utility functions
  getFilteredProjects: () => ProjectCardWithMeta[];
  getProjectById: (id: string) => ProjectCardWithMeta | undefined;
}

type ProjectStore = ProjectState & ProjectActions;

const initialState: ProjectState = {
  projects: [],
  loading: false,
  error: null,
  filters: {},
  selectedProject: null,
};

export const useProjectStore = create<ProjectStore>()(
  devtools(
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
          assertApiResult<ProjectCardWithMeta[]>(json);

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

      fetchProject: async (id: string) => {
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
          assertApiResult<ProjectCardWithMeta>(json);

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

      createProject: async (data: CreateProjectRequest) => {
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
          assertApiResult<ProjectCardWithMeta>(json);

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

      updateProject: async (data: UpdateProjectRequest) => {
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
          assertApiResult<ProjectCardWithMeta>(json);

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

      deleteProject: async (id: string) => {
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
          assertApiResult<{ id: string }>(json);

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

      setProjects: (projects: ProjectCardWithMeta[]) => {
        set({ projects });
      },

      setSelectedProject: (project: ProjectCardWithMeta | null) => {
        set({ selectedProject: project });
      },

      setFilters: (filters: ProjectFilters) => {
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

      getProjectById: (id: string) => {
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
function getCsrfToken(): string {
  const token = document.cookie
    .split('; ')
    .find((row) => row.startsWith('csrf_token='))
    ?.split('=')[1];

  return token || '';
}
