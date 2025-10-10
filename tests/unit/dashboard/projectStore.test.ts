import { describe, it, beforeEach, expect, vi } from 'vitest';
import useProjectStore from '@/stores/projectStore';

const resetStore = () => {
  useProjectStore.setState({
    projects: [],
    loading: false,
    error: null,
    selectedProjectId: null,
    // noop functions will be overwritten by implementation
    fetchProjects: useProjectStore.getState().fetchProjects,
    createProject: useProjectStore.getState().createProject,
    setProjects: useProjectStore.getState().setProjects,
    addProject: useProjectStore.getState().addProject,
    removeProject: useProjectStore.getState().removeProject,
    updateProject: useProjectStore.getState().updateProject,
    selectProject: useProjectStore.getState().selectProject,
  } as any);
};

describe('projectStore', () => {
  beforeEach(() => {
    resetStore();
  });

  it('fetchProjects success sets projects and clears loading', async () => {
    const payload = [
      {
        id: 'p1',
        title: 'Test Project',
        description: 'Desc',
        progress: 10,
        status: 'active',
        members: [],
        lastUpdated: new Date().toISOString(),
      },
    ];

    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }) as unknown as Response
    );

    await useProjectStore.getState().fetchProjects();

    const state = useProjectStore.getState();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.projects.length).toBe(1);
    expect(state.projects[0].id).toBe('p1');
  });

  it('fetchProjects error sets error and clears loading', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('fail', { status: 500 }) as unknown as Response
    );

    await useProjectStore.getState().fetchProjects();

    const state = useProjectStore.getState();
    expect(state.loading).toBe(false);
    expect(state.error).toBeTruthy();
    expect(state.projects.length).toBe(0);
  });

  it('createProject success adds project and selects it', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ projectId: 'p-123', title: 'New Project' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }) as unknown as Response
    );

    await useProjectStore.getState().createProject();

    const state = useProjectStore.getState();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.projects[0]?.id).toBe('p-123');
    expect(state.selectedProjectId).toBe('p-123');
  });

  it('createProject handles server error', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('fail', { status: 500 }) as unknown as Response
    );

    await useProjectStore.getState().createProject();

    const state = useProjectStore.getState();
    expect(state.loading).toBe(false);
    expect(state.error).toBeTruthy();
  });
});
