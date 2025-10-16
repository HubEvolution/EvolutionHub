import { describe, it, beforeEach, expect, vi } from 'vitest';
import useQuickActionStore, { selectQuickActions } from '@/stores/quickActionStore';

const setupActions = () => {
  useQuickActionStore
    .getState()
    .setActions([
      { id: 'qa1', title: 'Docs', description: 'Open docs', icon: '📘', action: 'view_docs' },
    ]);
};

describe('quickActionStore', () => {
  beforeEach(() => {
    useQuickActionStore.setState({ actions: [], loading: false, error: null } as any);
  });

  it('executeAction success updates status to success', async () => {
    setupActions();

    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }) as unknown as Response
    );

    await useQuickActionStore.getState().executeAction('view_docs');

    const actions = selectQuickActions(useQuickActionStore.getState());
    const item = actions.find((a) => a.id === 'qa1');
    expect(item?.status).toBe('success');
  });

  it('executeAction redirect navigates to URL', async () => {
    setupActions();

    // Provide a configurable window.location mock for jsdom
    const originalLocation = window.location;
    const locationMock: any = {
      ...originalLocation,
      href: originalLocation.href,
      assign: vi.fn((url: string) => {
        locationMock.href = url;
      }),
      replace: vi.fn((url: string) => {
        locationMock.href = url;
      }),
    };
    Object.defineProperty(window, 'location', {
      value: locationMock,
      writable: true,
      configurable: true,
    });

    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ redirect: '/docs' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }) as unknown as Response
    );

    await useQuickActionStore.getState().executeAction('view_docs');

    expect(window.location.href).toBe('/docs');

    // Restore original location; keep configurable to appease jsdom teardown
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: false,
      configurable: true,
    });
  });

  it('executeAction server error sets error and status error', async () => {
    setupActions();

    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('fail', { status: 500 }) as unknown as Response
    );

    await useQuickActionStore.getState().executeAction('view_docs');

    const state = useQuickActionStore.getState();
    expect(state.error).toBeTruthy();
    const item = state.actions.find((a) => a.id === 'qa1');
    expect(item?.status).toBe('error');
  });
});
