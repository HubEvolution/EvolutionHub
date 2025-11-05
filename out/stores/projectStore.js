"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectSelectedProjectId = exports.selectLoadingState = exports.selectProjectById = exports.selectProjects = void 0;
const zustand_1 = require("zustand");
const parseJson = async (response) => {
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Unexpected response type');
    }
    return (await response.json());
};
const createFallbackProject = (id) => ({
    id,
    title: 'New Project',
    description: 'A placeholder project.',
    progress: 0,
    status: 'active',
    members: [],
    lastUpdated: new Date().toISOString(),
});
const useProjectStore = (0, zustand_1.create)((set, get) => ({
    projects: [],
    loading: false,
    error: null,
    selectedProjectId: null,
    setProjects: (projects) => set({ projects }),
    addProject: (project) => set((state) => ({
        projects: [project, ...state.projects],
    })),
    removeProject: (projectId) => set((state) => ({
        projects: state.projects.filter((project) => project.id !== projectId),
        selectedProjectId: state.selectedProjectId === projectId ? null : state.selectedProjectId,
    })),
    updateProject: (projectId, updates) => set((state) => ({
        projects: state.projects.map((project) => project.id === projectId
            ? { ...project, ...updates, lastUpdated: new Date().toISOString() }
            : project),
    })),
    selectProject: (projectId) => set({ selectedProjectId: projectId }),
    fetchProjects: async () => {
        set({ loading: true, error: null });
        try {
            const response = await fetch('/api/dashboard/projects', {
                credentials: 'same-origin',
            });
            const projects = await parseJson(response);
            set({ projects, loading: false });
        }
        catch (error) {
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
            const json = await parseJson(response);
            if (!json.projectId) {
                throw new Error('Missing project identifier in response');
            }
            const newProject = {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            set({ error: errorMessage, loading: false });
        }
    },
}));
exports.default = useProjectStore;
const selectProjects = (state) => state.projects;
exports.selectProjects = selectProjects;
const selectProjectById = (projectId) => (state) => state.projects.find((project) => project.id === projectId) ?? null;
exports.selectProjectById = selectProjectById;
const selectLoadingState = (state) => ({
    loading: state.loading,
    error: state.error,
});
exports.selectLoadingState = selectLoadingState;
const selectSelectedProjectId = (state) => state.selectedProjectId;
exports.selectSelectedProjectId = selectSelectedProjectId;
