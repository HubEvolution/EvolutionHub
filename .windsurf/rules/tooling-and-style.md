---
trigger: always_on
priority: 80
---

# Tooling & Style Rules

- Use the strict TypeScript configuration from `tsconfig.json`: ESNext modules, React JSX runtime, and aliases like `@/*`, `@api/*`, `@components/*`.
- Respect compiler gates `strict`, `noUnusedLocals`, `noUnusedParameters`, and `preserveSymlinks`; the project compiles in bundler resolution mode (`tsconfig.json`).
- Follow ESLint policies from `eslint.config.js`: forbid `~/*` imports, warn on `any` and `_`-prefixed unused vars only, allow intentional empty `catch`, and enforce React hook rules.
- Honor the targeted `no-console` rollout for specific API files listed at the bottom of `eslint.config.js`; do not expand without deliberate config changes.
- Format code via Prettier (`.prettierrc.json`) with 2-space indent, single quotes, 100 char width, Astro plugin, and `semi: true`.
- Keep components and stores in PascalCase filenames and shared utilities camelCase as codified in `AGENTS.md`.
- Ensure presence of `.prettierignore`, `.markdownlint.jsonc`, `.lintstagedrc.json`, and `eslint.config.dev.js`.
