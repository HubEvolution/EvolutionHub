// Minimal Cloudflare MCP server (stdio) using Genkit + @genkit-ai/mcp
// Tools are read-only by default to stay safe; extend cautiously.

import { genkit, z } from 'genkit';
import { GenkitMcpServer } from '@genkit-ai/mcp/lib/server.js';

const ai = genkit({ name: 'cloudflare-mcp', promptDir: null });

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

function token() {
  const t = process.env.CF_API_TOKEN;
  if (!t) throw new Error('Missing CF_API_TOKEN env var');
  return t;
}

async function cfFetch(path, init = {}) {
  const url = path.startsWith('http') ? path : `${CF_API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token()}`,
    ...(init.headers || {}),
  };
  const resp = await fetch(url, { ...init, headers });
  const text = await resp.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!resp.ok || (json && json.success === false)) {
    const errors = json?.errors || [];
    const message = errors[0]?.message || resp.statusText || 'Request failed';
    throw new Error(`Cloudflare API error: ${message}`);
  }
  return json;
}

ai.defineTool(
  {
    name: 'cf_list_zones',
    description: 'List Cloudflare zones (optionally filter by name substring).',
    inputSchema: z.object({ name: z.string().optional() }).optional(),
  },
  async (input) => {
    const params = new URLSearchParams();
    if (input?.name) params.set('name', input.name);
    const data = await cfFetch(`/zones${params.toString() ? `?${params}` : ''}`);
    // Return minimal fields to avoid overly large payloads
    const zones = (data.result || []).map((z) => ({
      id: z.id,
      name: z.name,
      status: z.status,
      paused: z.paused,
    }));
    return { zones };
  }
);

ai.defineTool(
  {
    name: 'cf_find_zone',
    description: 'Find a zone by exact name and return its id and metadata.',
    inputSchema: z.object({ name: z.string() }),
  },
  async ({ name }) => {
    const data = await cfFetch(`/zones?name=${encodeURIComponent(name)}`);
    const zone = (data.result || [])[0] || null;
    if (!zone) return { found: false };
    return {
      found: true,
      zone: { id: zone.id, name: zone.name, status: zone.status, paused: zone.paused },
    };
  }
);

ai.defineTool(
  {
    name: 'cf_get_zone_settings',
    description: 'Get settings for a specific zone id.',
    inputSchema: z.object({ zone_id: z.string() }),
  },
  async ({ zone_id }) => {
    const data = await cfFetch(`/zones/${encodeURIComponent(zone_id)}/settings`);
    // Trim settings to key/value pairs
    const settings = (data.result || []).map((s) => ({
      id: s.id,
      value: s.value,
      editable: s.editable,
    }));
    return { zone_id, settings };
  }
);

ai.defineTool(
  {
    name: 'cf_list_dns_records',
    description: 'List DNS records for a zone. Optionally filter by name or type.',
    inputSchema: z
      .object({
        zone_id: z.string(),
        name: z.string().optional(),
        type: z.string().optional(),
      })
      .strict(),
  },
  async ({ zone_id, name, type }) => {
    const params = new URLSearchParams();
    if (name) params.set('name', name);
    if (type) params.set('type', type);
    const data = await cfFetch(
      `/zones/${encodeURIComponent(zone_id)}/dns_records${params.toString() ? `?${params}` : ''}`
    );
    const records = (data.result || []).map((r) => ({
      id: r.id,
      type: r.type,
      name: r.name,
      content: r.content,
      proxied: r.proxied,
    }));
    return { zone_id, count: records.length, records };
  }
);

// Start the MCP stdio server
const server = new GenkitMcpServer(ai, { name: 'cloudflare-mcp', version: '0.1.0' });
server.start().catch((err) => {
  // Avoid leaking secrets; only log generic error
  console.error('[cloudflare-mcp] failed to start:', err?.message || String(err));
  process.exit(1);
});
