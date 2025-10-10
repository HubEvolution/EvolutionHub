import { create } from 'zustand';
import type { ProjectCard } from '../types/dashboard';

interface ProjectState {
  projects: ProjectCard[];
  loading: boolean;
  error: string | null;
  selectedProjectId: string | null;
  fetchProjects: () => Promise<void>;
  createProject: () => Promise<void>;
  setProjects: (projects: ProjectCard[]) => void;
  addProject: (project: ProjectCard) => void;
  removeProject: (projectId: string) => void;
  updateProject: (projectId: string, updates: Partial<ProjectCard>) => void;
  selectProject: (projectId: string | null) => void;
}

type CreateProjectResponse = {
  projectId: string;
  title?: string;
  description?: string;
};

type ProjectsResponse = ProjectCard[];

const parseJson = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Unexpected response type');
  }
  return (await response.json()) as T;
};

const createFallbackProject = (id: string): ProjectCard => ({
  id,
  title: 'New Project',
  description: 'A placeholder project.',
  progress: 0,
  status: 'active',
  members: [],
  lastUpdated: new Date().toISOString(),
});

const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  loading: false,
  error: null,
  selectedProjectId: null,

  setProjects: (projects) => set({ projects }),

  addProject: (project) =>
    set((state) => ({
      projects: [project, ...state.projects],
    })),

  removeProject: (projectId) =>
    set((state) => ({
      projects: state.projects.filter((project) => project.id !== projectId),
      selectedProjectId: state.selectedProjectId === projectId ? null : state.selectedProjectId,
    })),

  updateProject: (projectId, updates) =>
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === projectId ? { ...project, ...updates, lastUpdated: new Date().toISOString() } : project
      ),
    })),

  selectProject: (projectId) => set({ selectedProjectId: projectId }),

  fetchProjects: async () => {
    set({ loading: true, error: null });

    try {
      const response = await fetch('/api/dashboard/projects', {
        credentials: 'same-origin',
      });

      const projects = await parseJson<ProjectsResponse>(response);
      set({ projects, loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ error: errorMessage, loading: false });
    }
  },

  createProject: async () => {
    set({ loading: true, error: null });

    try {
      const response = await fetch('/api/dashboard/perform-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'create_project' }),
      });

      const json = await parseJson<CreateProjectResponse>(response);

      if (!json.projectId) {
        throw new Error('Missing project identifier in response');
      }

      const newProject: ProjectCard = {
        ...createFallbackProject(json.projectId),
        ...(json.title ? { title: json.title } : {}),
        ...(json.description ? { description: json.description } : {}),
      };

      const existingProject = get().projects.find((project) => project.id === json.projectId);
      if (existingProject) {
        set({ loading: false });
        return;
      }

      get().addProject(newProject);
      set({ loading: false, selectedProjectId: json.projectId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ error: errorMessage, loading: false });
    }
  },
}));

export default useProjectStore;
export const selectProjects = (state: ProjectState) => state.projects;
export const selectProjectById = (projectId: string) => (state: ProjectState) =>
  state.projects.find((project) => project.id === projectId) ?? null;
export const selectLoadingState = (state: ProjectState) => ({ loading: state.loading, error: state.error });
export const selectSelectedProjectId = (state: ProjectState) => state.selectedProjectId;
