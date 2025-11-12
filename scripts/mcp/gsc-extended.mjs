#!/usr/bin/env node
// Extended Google Search Console MCP server (stdio)
// Builds on mcp-server-gsc's SearchConsoleService but adds convenience tools.

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { SearchConsoleService } from '../../node_modules/mcp-server-gsc/dist/search-console.js';

const server = new Server(
  { name: 'gsc-mcp-extended', version: '0.1.0' },
  { capabilities: { resources: {}, tools: {}, prompts: {} } }
);

const GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('GOOGLE_APPLICATION_CREDENTIALS environment variable is required');
  process.exit(1);
}

// Schemas (Zod) for validation
const GSCBaseSchema = z.object({
  siteUrl: z
    .string()
    .describe(
      'The site URL as defined in Search Console. Example: sc-domain:example.com or http://www.example.com/'
    ),
});

const DateRangeSchema = z.object({
  startDate: z.string().describe('Start date in YYYY-MM-DD format'),
  endDate: z.string().describe('End date in YYYY-MM-DD format'),
});

const SearchAnalyticsCommon = GSCBaseSchema.merge(DateRangeSchema).extend({
  rowLimit: z.number().default(1000).describe('Maximum rows to return'),
});

const SearchAnalyticsSchema = SearchAnalyticsCommon.extend({
  dimensions: z
    .string()
    .transform((v) => v.split(','))
    .optional(),
  type: z.enum(['web', 'image', 'video', 'news']).optional(),
  aggregationType: z.enum(['auto', 'byNewsShowcasePanel', 'byProperty', 'byPage']).optional(),
});

const IndexInspectSchema = GSCBaseSchema.extend({
  inspectionUrl: z
    .string()
    .describe('Fully-qualified URL to inspect; must be under the property specified in siteUrl'),
  languageCode: z.string().optional().default('en-US'),
});

const SubmitOrDeleteSitemapSchema = z.object({
  feedpath: z.string().describe('The URL of the sitemap, e.g. http://www.example.com/sitemap.xml'),
  siteUrl: z.string().describe("The site's URL, including protocol. E.g. http://www.example.com/"),
});

// JSON Schema helper (manual to avoid extra deps)
function jsonSchemaFromZodObject(fields) {
  return {
    type: 'object',
    properties: fields,
    additionalProperties: false,
    required: Object.keys(fields),
  };
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_sites',
        description: 'List all Search Console sites',
        inputSchema: { type: 'object' },
      },
      {
        name: 'search_analytics',
        description: 'Generic Search Analytics query (dimensions, type, aggregation, rowLimit)',
        inputSchema: jsonSchemaFromZodObject({
          siteUrl: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          dimensions: { type: 'string' },
          type: { type: 'string' },
          aggregationType: { type: 'string' },
          rowLimit: { type: 'number' },
        }),
      },
      {
        name: 'search_analytics_pages',
        description: 'Convenience: Search Analytics aggregated by page',
        inputSchema: jsonSchemaFromZodObject({
          siteUrl: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          rowLimit: { type: 'number' },
        }),
      },
      {
        name: 'search_analytics_queries',
        description: 'Convenience: Search Analytics aggregated by query',
        inputSchema: jsonSchemaFromZodObject({
          siteUrl: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          rowLimit: { type: 'number' },
        }),
      },
      {
        name: 'search_analytics_countries',
        description: 'Convenience: Search Analytics aggregated by country',
        inputSchema: jsonSchemaFromZodObject({
          siteUrl: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          rowLimit: { type: 'number' },
        }),
      },
      {
        name: 'search_analytics_devices',
        description: 'Convenience: Search Analytics aggregated by device',
        inputSchema: jsonSchemaFromZodObject({
          siteUrl: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          rowLimit: { type: 'number' },
        }),
      },
      {
        name: 'index_inspect',
        description: 'Inspect a URL (index status, coverage) for a property',
        inputSchema: jsonSchemaFromZodObject({
          siteUrl: { type: 'string' },
          inspectionUrl: { type: 'string' },
          languageCode: { type: 'string' },
        }),
      },
      {
        name: 'list_sitemaps',
        description: 'List sitemaps for a property',
        inputSchema: jsonSchemaFromZodObject({
          siteUrl: { type: 'string' },
          sitemapIndex: { type: 'string' },
        }),
      },
      {
        name: 'get_sitemap',
        description: 'Get a specific sitemap',
        inputSchema: jsonSchemaFromZodObject({
          siteUrl: { type: 'string' },
          feedpath: { type: 'string' },
        }),
      },
      {
        name: 'submit_sitemap',
        description: 'Submit a sitemap for a property',
        inputSchema: jsonSchemaFromZodObject({
          siteUrl: { type: 'string' },
          feedpath: { type: 'string' },
        }),
      },
      {
        name: 'delete_sitemap',
        description: 'Delete a sitemap for a property',
        inputSchema: jsonSchemaFromZodObject({
          siteUrl: { type: 'string' },
          feedpath: { type: 'string' },
        }),
      },
      {
        name: 'inspect_urls',
        description: 'Inspect multiple URLs and summarize coverage/verdict states',
        inputSchema: {
          type: 'object',
          properties: {
            siteUrl: { type: 'string' },
            urls: { type: 'array', items: { type: 'string' } },
            languageCode: { type: 'string' },
          },
          additionalProperties: false,
          required: ['siteUrl', 'urls'],
        },
      },
      {
        name: 'inspect_sitemap_sample',
        description: 'Fetch a sitemap URL, sample N entries, inspect each and summarize results',
        inputSchema: {
          type: 'object',
          properties: {
            siteUrl: { type: 'string' },
            sitemapUrl: { type: 'string' },
            sampleSize: { type: 'number' },
            languageCode: { type: 'string' },
          },
          additionalProperties: false,
          required: ['siteUrl', 'sitemapUrl'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = request.params.name;
  const args = request.params.arguments || {};
  const svc = new SearchConsoleService(GOOGLE_APPLICATION_CREDENTIALS);

  try {
    switch (name) {
      case 'list_sites': {
        const response = await svc.listSites();
        return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
      }

      case 'search_analytics': {
        const parsed = SearchAnalyticsSchema.parse(args);
        const { siteUrl, startDate, endDate, dimensions, type, aggregationType, rowLimit } = parsed;
        const body = {
          startDate,
          endDate,
          dimensions,
          searchType: type,
          aggregationType,
          rowLimit,
        };
        const response = await svc.searchAnalytics(siteUrl, body);
        return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
      }

      case 'search_analytics_pages':
      case 'search_analytics_queries':
      case 'search_analytics_countries':
      case 'search_analytics_devices': {
        const parsed = SearchAnalyticsCommon.parse(args);
        const map = {
          search_analytics_pages: 'page',
          search_analytics_queries: 'query',
          search_analytics_countries: 'country',
          search_analytics_devices: 'device',
        };
        const dim = map[name];
        const { siteUrl, startDate, endDate, rowLimit } = parsed;
        const body = { startDate, endDate, dimensions: [dim], rowLimit };
        const response = await svc.searchAnalytics(siteUrl, body);
        return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
      }

      case 'index_inspect': {
        const parsed = IndexInspectSchema.parse(args);
        const requestBody = {
          siteUrl: parsed.siteUrl,
          inspectionUrl: parsed.inspectionUrl,
          languageCode: parsed.languageCode,
        };
        const response = await svc.indexInspect(requestBody);
        return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
      }

      case 'list_sitemaps': {
        const { siteUrl, sitemapIndex } = z
          .object({ siteUrl: z.string(), sitemapIndex: z.string().optional() })
          .parse(args);
        const response = await svc.listSitemaps({ siteUrl, sitemapIndex });
        return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
      }

      case 'get_sitemap': {
        const { siteUrl, feedpath } = z
          .object({ siteUrl: z.string(), feedpath: z.string() })
          .parse(args);
        const response = await svc.getSitemap({ siteUrl, feedpath });
        return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
      }

      case 'submit_sitemap': {
        const parsed = SubmitOrDeleteSitemapSchema.parse(args);
        const response = await svc.submitSitemap({
          siteUrl: parsed.siteUrl,
          feedpath: parsed.feedpath,
        });
        return { content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }] };
      }

      case 'delete_sitemap': {
        const parsed = SubmitOrDeleteSitemapSchema.parse(args);
        const webmasters = await svc.getWebmasters();
        const resp = await webmasters.sitemaps.delete({
          siteUrl: parsed.siteUrl,
          feedpath: parsed.feedpath,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(resp.data ?? { status: 'ok' }, null, 2) }],
        };
      }

      case 'inspect_urls': {
        const parsed = z
          .object({
            siteUrl: z.string(),
            urls: z.array(z.string()).min(1).max(500),
            languageCode: z.string().optional().default('en-US'),
          })
          .parse(args);

        const results = [];
        for (const u of parsed.urls) {
          try {
            const res = await svc.indexInspect({
              siteUrl: parsed.siteUrl,
              inspectionUrl: u,
              languageCode: parsed.languageCode,
            });
            results.push({ url: u, ok: true, data: res.data });
          } catch (e) {
            results.push({ url: u, ok: false, error: e instanceof Error ? e.message : String(e) });
          }
        }

        const summary = summarizeInspection(results);
        return { content: [{ type: 'text', text: JSON.stringify({ summary, results }, null, 2) }] };
      }

      case 'inspect_sitemap_sample': {
        const parsed = z
          .object({
            siteUrl: z.string(),
            sitemapUrl: z.string().url(),
            sampleSize: z.number().int().positive().max(1000).optional().default(100),
            languageCode: z.string().optional().default('en-US'),
          })
          .parse(args);

        const xml = await fetch(parsed.sitemapUrl).then((r) => r.text());
        const urls = extractSitemapLocs(xml).slice(0, parsed.sampleSize);
        const results = [];
        for (const u of urls) {
          try {
            const res = await svc.indexInspect({
              siteUrl: parsed.siteUrl,
              inspectionUrl: u,
              languageCode: parsed.languageCode,
            });
            results.push({ url: u, ok: true, data: res.data });
          } catch (e) {
            results.push({ url: u, ok: false, error: e instanceof Error ? e.message : String(e) });
          }
        }
        const summary = summarizeInspection(results);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ sampled: urls.length, summary, results }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`gsc-mcp-extended error: ${msg}`);
  }
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GSC MCP Extended running on stdio');
}

run().catch((e) => {
  console.error('Fatal error in gsc-extended:', e);
  process.exit(1);
});

// Helpers
function extractSitemapLocs(xml) {
  const out = [];
  const re = /<loc>([^<]+)<\/loc>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const loc = m[1].trim();
    if (loc) out.push(loc);
  }
  return out;
}

function summarizeInspection(results) {
  const counts = {
    verdict: {},
    coverageState: {},
    indexingState: {},
    pageFetchState: {},
    robotsTxtState: {},
    ok: 0,
    failed: 0,
  };
  for (const r of results) {
    if (!r.ok) {
      counts.failed++;
      continue;
    }
    counts.ok++;
    const s = r.data?.inspectionResult?.indexStatusResult || {};
    inc(counts.verdict, s.verdict);
    inc(counts.coverageState, s.coverageState);
    inc(counts.indexingState, s.indexingState);
    inc(counts.pageFetchState, s.pageFetchState);
    inc(counts.robotsTxtState, s.robotsTxtState);
  }
  return counts;
}

function inc(map, key) {
  const k = key || 'UNKNOWN';
  map[k] = (map[k] || 0) + 1;
}
