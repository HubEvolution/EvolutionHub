#!/usr/bin/env node
/*
  Resend Quick Check Script
  - Lists domains with verification/DNS records
  - Attempts to list recent emails (best-effort; may not be supported on all accounts)

  Usage:
    node scripts/resend-check.mjs domains
    node scripts/resend-check.mjs emails --limit 20

  Requires:
    RESEND_API_KEY in your environment
*/

import 'dotenv/config';
import process from 'node:process';
import { Resend } from 'resend';

const API_KEY = process.env.RESEND_API_KEY;
const RESEND_API_BASE = 'https://api.resend.com';

if (!API_KEY) {
  console.error('[resend-check] ERROR: RESEND_API_KEY is not set in your environment.');
  console.error('  Export it first, e.g.\n    export RESEND_API_KEY=\"re_XXXXXXXXXXXXXXXXXXXXXXXX\"\n');
  process.exit(1);
}

const resend = new Resend(API_KEY);

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      args[k] = v ?? true;
    } else {
      args._.push(a);
    }
  }
  return args;
}

async function restGet(path) {
  const res = await fetch(`${RESEND_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${path}: ${text}`);
  }
  return res.json();
}

function printDivider(title) {
  console.log('\n' + '='.repeat(20) + ` ${title} ` + '='.repeat(20));
}

function fmt(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  try { return JSON.stringify(val); } catch { return String(val); }
}

async function listDomains() {
  printDivider('Domains');
  let domainsData;
  // Try SDK first
  try {
    const res = await resend.domains.list();
    domainsData = res?.data ?? res; // normalize
  } catch (e) {
    console.warn('[resend-check] SDK list() failed, falling back to REST /domains:', e?.message || e);
    const rest = await restGet('/domains');
    domainsData = rest?.data ?? rest; // normalize
  }

  if (!Array.isArray(domainsData)) {
    console.log('No domains returned. Raw:', domainsData);
    return;
  }

  for (const d of domainsData) {
    const id = d.id || d.domain_id || d.uuid || 'unknown-id';
    console.log(`\n- name: ${fmt(d.name)}\n  id: ${fmt(id)}\n  status: ${fmt(d.status)}\n  region: ${fmt(d.region)}\n  created_at: ${fmt(d.created_at || d.createdAt)}\n  records:`);

    // Fetch detailed DNS records per domain (best-effort)
    try {
      let detail;
      try {
        // SDK detail
        if (resend.domains?.get) {
          const res = await resend.domains.get({ id });
          detail = res?.data ?? res;
        } else {
          throw new Error('SDK get() not available');
        }
      } catch (e) {
        const rest = await restGet(`/domains/${id}`);
        detail = rest?.data ?? rest;
      }

      const records = detail?.records || detail?.dns || [];
      if (Array.isArray(records) && records.length) {
        for (const r of records) {
          const name = r.name || r.host || '';
          const type = r.type || '';
          const value = r.value || r.txt_value || '';
          const status = r.status || r.verified || '';
          console.log(`    - ${type}\t${name}\t${value}\tstatus:${fmt(status)}`);
        }
      } else {
        console.log('    (no records available in detail response)');
      }
    } catch (e) {
      console.warn(`  Could not fetch domain details for ${d.name}:`, e?.message || e);
    }
  }
}

async function listEmails(limit = 20) {
  printDivider('Emails (best-effort)');
  // The SDK may not expose a list endpoint; try REST first.
  try {
    const rest = await restGet(`/emails?limit=${encodeURIComponent(limit)}`);
    const items = rest?.data ?? rest?.items ?? rest;
    if (!Array.isArray(items)) {
      console.log('No email list available. Raw:', rest);
      return;
    }
    for (const e of items) {
      console.log(`\n- id: ${fmt(e.id)}\n  from: ${fmt(e.from)}\n  to: ${fmt(e.to)}\n  subject: ${fmt(e.subject)}\n  created_at: ${fmt(e.created_at || e.createdAt)}\n  status: ${fmt(e.status)}\n  last_event: ${fmt(e.last_event || e.event)}`);
    }
    return;
  } catch (e) {
    console.warn('[resend-check] REST /emails failed:', e?.message || e);
  }

  // Fallback: If you have specific message IDs, you can query via SDK get()
  console.log('Tip: Provide a message ID to inspect a specific email:');
  console.log('  node scripts/resend-check.mjs email --id <message_id>');
}

async function getEmailById(id) {
  printDivider(`Email ${id}`);
  if (!id) {
    console.error('Missing --id parameter');
    process.exit(1);
  }
  try {
    const res = await resend.emails.get(id);
    console.log(JSON.stringify(res, null, 2));
  } catch (e) {
    console.error('emails.get failed:', e?.message || e);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const cmd = args._[0];
  if (!cmd || ['-h', '--help', 'help'].includes(cmd)) {
    console.log('Usage:\n  node scripts/resend-check.mjs domains\n  node scripts/resend-check.mjs emails [--limit=20]\n  node scripts/resend-check.mjs email --id <message_id>');
    process.exit(0);
  }

  try {
    if (cmd === 'domains') {
      await listDomains();
    } else if (cmd === 'emails') {
      const lim = Number(args.limit ?? 20) || 20;
      await listEmails(lim);
    } else if (cmd === 'email') {
      await getEmailById(args.id);
    } else {
      console.error(`Unknown command: ${cmd}`);
      process.exit(1);
    }
  } catch (e) {
    console.error('[resend-check] Unhandled error:', e?.message || e);
    process.exit(1);
  }
}

main();
