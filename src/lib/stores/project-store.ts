import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  ProjectCard,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectFilters,
} from '@/types/dashboard';

interface ProjectState {
  projects: ProjectCard[];
  loading: boolean;
  error: string | null;
  filters: ProjectFilters;
  selectedProject: ProjectCard | null;
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
  setProjects: (projects: ProjectCard[]) => void;
  setSelectedProject: (project: ProjectCard | null) => void;
  setFilters: (filters: ProjectFilters) => void;
  clearError: () => void;

  // Utility functions
  getFilteredProjects: () => ProjectCard[];
  getProjectById: (id: string) => ProjectCard | undefined;
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
          const response = await fetch('/api/projects', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();

          if (result.success) {
            set({ projects: result.data, loading: false });
          } else {
            throw new Error(result.error?.message || 'Failed to fetch projects');
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
          const response = await fetch(`/api/projects/${id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();

          if (result.success) {
            set((state) => ({
              selectedProject: result.data,
              projects: state.projects.map((p) => (p.id === id ? result.data : p)),
              loading: false,
            }));
          } else {
            throw new Error(result.error?.message || 'Failed to fetch project');
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

          const result = await response.json();

          if (result.success) {
            set((state) => ({
              projects: [result.data, ...state.projects],
              loading: false,
            }));
          } else {
            throw new Error(result.error?.message || 'Failed to create project');
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

          const result = await response.json();

          if (result.success) {
            set((state) => ({
              projects: state.projects.map((p) => (p.id === data.id ? result.data : p)),
              selectedProject:
                state.selectedProject?.id === data.id ? result.data : state.selectedProject,
              loading: false,
            }));
          } else {
            throw new Error(result.error?.message || 'Failed to update project');
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

          const result = await response.json();

          if (result.success) {
            set((state) => ({
              projects: state.projects.filter((p) => p.id !== id),
              selectedProject: state.selectedProject?.id === id ? null : state.selectedProject,
              loading: false,
            }));
          } else {
            throw new Error(result.error?.message || 'Failed to delete project');
          }
        } catch (error) {
          console.error('Error deleting project:', error);
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          });
        }
      },

      setProjects: (projects: ProjectCard[]) => {
        set({ projects });
      },

      setSelectedProject: (project: ProjectCard | null) => {
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

        if (filters.priority) {
          filtered = filtered.filter((p) => p.priority === filters.priority);
        }

        if (filters.search) {
          const search = filters.search.toLowerCase();
          filtered = filtered.filter(
            (p) =>
              p.title.toLowerCase().includes(search) || p.description.toLowerCase().includes(search)
          );
        }

        if (filters.tags && filters.tags.length > 0) {
          filtered = filtered.filter((p) => p.tags?.some((tag) => filters.tags?.includes(tag)));
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
