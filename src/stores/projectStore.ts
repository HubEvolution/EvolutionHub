import { create } from 'zustand';
import type { ProjectCard } from '../types/dashboard';

interface ProjectState {
  projects: ProjectCard[];
  loading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  createProject: () => Promise<void>;
  setProjects: (projects: ProjectCard[]) => void;
  addProject: (project: ProjectCard) => void;
  removeProject: (projectId: string) => void;
  updateProject: (projectId: string, updates: Partial<ProjectCard>) => void;
}

const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  loading: false,
  error: null,
  
  setProjects: (projects) => set({ projects }),
  
  addProject: (project) => set((state) => ({
    projects: [project, ...state.projects]
  })),
  
  removeProject: (projectId) => set((state) => ({
    projects: state.projects.filter(project => project.id !== projectId)
  })),
  
  updateProject: (projectId, updates) => set((state) => ({
    projects: state.projects.map(project => 
      project.id === projectId ? { ...project, ...updates } : project
    )
  })),
  
  fetchProjects: async () => {
    set({ loading: true, error: null });
    
    try {
      const response = await fetch('/api/dashboard/projects');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const projects: ProjectCard[] = await response.json();
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
        body: JSON.stringify({ action: 'create_project' }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const json: unknown = await response.json();
      
      // Nach erfolgreichem Erstellen das Projekt zur Liste hinzufügen
      if (json && typeof json === 'object' && 'projectId' in json) {
        const projectId = String((json as any).projectId);
        const newProject: ProjectCard = {
          id: projectId,
          title: 'New Project',
          description: 'A placeholder project.',
          progress: 0,
          status: 'active',
          members: [],
          lastUpdated: new Date().toISOString()
        };
        
        get().addProject(newProject);
        set({ loading: false });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ error: errorMessage, loading: false });
    }
  }
}));

export default useProjectStore;