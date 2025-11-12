# PageSpeed Insights (PSI) + GSC MCP Integration

This guide enables cooperative workflows between the GSC MCP server and PageSpeed Insights without adding new dependencies.

What you get
- PSI audit script: `scripts/psi-sitemap-audit.mjs` (Node 18+, no deps)
- Optional MCP server alias `psi` using `mcp-server-fetch` for ad-hoc PSI calls
- Instructions to obtain and configure a `PAGESPEED_API_KEY`

Prerequisites
- Node 18+ (global `fetch` is required by the script)
- A Google Cloud project with the PageSpeed Insights API enabled

Get a PageSpeed API key
1) Go to Google Cloud Console → APIs & Services → Enabled APIs & services → Enable APIs and Services.
2) Search “PageSpeed Insights API” and enable it.
3) Go to APIs & Services → Credentials → Create Credentials → API key.
4) Optionally restrict the key (HTTP referrers or IPs) based on your usage.
5) Save the key and export it in your shell:

   export PAGESPEED_API_KEY="<your-key>"

Or place it in your local `.env` (never commit secrets):

   PAGESPEED_API_KEY=<your-key>

PSI audit script
- Run against a sitemap (samples N URLs) or a file of URLs. Prints a compact table and optional JSON.

Examples
- Audit 20 pages from a sitemap on mobile for performance + seo:

  node scripts/psi-sitemap-audit.mjs --sitemap https://example.com/sitemap.xml --sample 20 --strategy mobile --categories performance,seo --concurrency 4

- Audit a static list on desktop, output JSON:

  node scripts/psi-sitemap-audit.mjs --urls urls.txt --strategy desktop --json

GSC + PSI workflow
1) Use GSC to source URLs (e.g., from sitemaps or top pages by clicks/impressions).
2) Feed those URLs into PSI via the script to produce performance/SEO scores.
3) Iterate on pages with low scores; re-run PSI to validate improvements.

MCP usage
- A general-purpose MCP server `fetch` is available and can call PSI:

  GET https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url={url}&strategy={mobile|desktop}&category=performance&category=seo&key=$PAGESPEED_API_KEY

- Optionally add a `psi` alias in your MCP config to make PSI calls more discoverable (same command as `fetch`).

Notes
- Do not commit API keys. Keep secrets in local env or secret managers.
- PSI scores are 0–1; the script prints percentages (0–100).
- For larger estates, consider scheduling audits and storing results externally.

