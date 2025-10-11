import { describe, it, expect } from 'vitest';

const BASE = process.env.TEST_BASE_URL || 'http://127.0.0.1:8787';

async function getJson(path: string) {
  const res = await fetch(`${BASE}${path}`);
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new Error(`Expected JSON from ${path}, got: ${text.slice(0, 200)}`);
  }
  return { status: res.status, json } as const;
}

// Use a known blog post slug as entityId; counts may be zero but shape should be valid
const ENTITY_TYPE = 'blog_post';
const ENTITY_ID = 'digital-detox-kreativitaet';

describe('Comments API (GET)', () => {
  it('GET /api/comments?debug=1 returns diagnostics', async () => {
    const { status, json } = await getJson('/api/comments?debug=1');
    expect(status).toBe(200);
    expect(json).toHaveProperty('success', true);
    expect(json).toHaveProperty('data');
    expect(json.data).toHaveProperty('diag');
    expect(json.data.diag).toHaveProperty('schema');
  });

  it('GET /api/comments/count?entityType&entityId (single) returns count', async () => {
    const { status, json } = await getJson(
      `/api/comments/count?entityType=${ENTITY_TYPE}&entityId=${ENTITY_ID}`
    );
    expect(status).toBe(200);
    expect(json).toHaveProperty('success', true);
    expect(json).toHaveProperty('data');
    // Either single { entityId, count } or { counts: { [id]: n } } depending on code path
    const d = json.data;
    if (d.counts) {
      expect(d.counts).toHaveProperty(ENTITY_ID);
      expect(typeof d.counts[ENTITY_ID]).toBe('number');
    } else {
      expect(d.entityId).toBe(ENTITY_ID);
      expect(typeof d.count).toBe('number');
    }
  });

  it('GET /api/comments/count?entityType&entityId=...&entityId=... (batch) returns map', async () => {
    const { status, json } = await getJson(
      `/api/comments/count?entityType=${ENTITY_TYPE}&entityId=${ENTITY_ID}&entityId=new-work-ist-eine-haltung`
    );
    expect(status).toBe(200);
    expect(json).toHaveProperty('success', true);
    expect(json).toHaveProperty('data');
    expect(json.data).toHaveProperty('counts');
    expect(typeof json.data.counts[ENTITY_ID]).toBe('number');
  });

  it('GET /api/comments?entityType&entityId returns list shape', async () => {
    const { status, json } = await getJson(
      `/api/comments?entityType=${ENTITY_TYPE}&entityId=${ENTITY_ID}&limit=5`
    );
    expect(status).toBe(200);
    expect(json).toHaveProperty('success', true);
    expect(json).toHaveProperty('data');
    expect(json.data).toHaveProperty('comments');
    expect(json.data).toHaveProperty('total');
    expect(json.data).toHaveProperty('hasMore');
    expect(Array.isArray(json.data.comments)).toBe(true);
  });
});
