#!/usr/bin/env node
// Small MCP client to drive the local gsc-extended stdio server and run read-only analyses.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const GSC_SERVER_CMD = 'node';
const GSC_SERVER_ARGS = ['scripts/mcp/gsc-extended.mjs'];

function parseArgs(argv) {
  const args = {};
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
      args[key] = val;
    } else if (!args._) {
      args._ = [a];
    } else {
      args._.push(a);
    }
    i++;
  }
  return args;
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const opts = parseArgs(rest);

  // Ensure GSC creds are present when spawning the server
  const creds =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    '/Users/lucas/Downloads/EvolutionHub_Bundle_v1.7_full/evolution-hub/secrets/google/gsc-service-account.json';
  const transport = new StdioClientTransport({
    command: GSC_SERVER_CMD,
    args: GSC_SERVER_ARGS,
    env: { ...process.env, GOOGLE_APPLICATION_CREDENTIALS: creds },
  });

  const client = new Client({ name: 'gsc-analysis-client', version: '0.1.0' });
  await client.connect(transport);

  if (!cmd || cmd === 'list_sites') {
    const res = await client.listTools(); // ensure ready
    const sites = await callTool(client, 'list_sites', {});
    console.log(JSON.stringify(JSON.parse(sites.text), null, 2));
    return;
  }

  if (cmd === 'inspect_sitemap_sample') {
    const { siteUrl, sitemapUrl } = opts;
    const sampleSize = opts.sampleSize ? Number(opts.sampleSize) : 100;
    if (!siteUrl || !sitemapUrl) throw new Error('Missing --siteUrl or --sitemapUrl');
    const out = await callTool(client, 'inspect_sitemap_sample', {
      siteUrl,
      sitemapUrl,
      sampleSize,
    });
    console.log(JSON.stringify(JSON.parse(out.text), null, 2));
    return;
  }

  if (cmd === 'inspect_urls') {
    const { siteUrl } = opts;
    const urls = (opts.urls || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!siteUrl || urls.length === 0) throw new Error('Missing --siteUrl or --urls');
    const out = await callTool(client, 'inspect_urls', { siteUrl, urls });
    console.log(JSON.stringify(JSON.parse(out.text), null, 2));
    return;
  }

  if (cmd === 'search_analytics_pages') {
    const { siteUrl, startDate, endDate } = opts;
    const rowLimit = opts.rowLimit ? Number(opts.rowLimit) : 1000;
    if (!siteUrl || !startDate || !endDate)
      throw new Error('Missing --siteUrl/--startDate/--endDate');
    const out = await callTool(client, 'search_analytics', {
      siteUrl,
      startDate,
      endDate,
      dimensions: 'page',
      rowLimit,
    });
    console.log(JSON.stringify(JSON.parse(out.text), null, 2));
    return;
  }

  throw new Error(`Unknown command: ${cmd}`);
}

async function callTool(client, name, args) {
  const result = await client.callTool({ name, arguments: args });
  const part = result.content?.find((p) => p.type === 'text');
  if (!part?.text) return { text: JSON.stringify(result, null, 2) };
  return { text: part.text };
}

main().catch((e) => {
  console.error('gsc-run-analysis error:', e?.message || e);
  process.exit(1);
});
