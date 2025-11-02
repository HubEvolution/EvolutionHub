import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const file = 'reports/assistant-task.md';

if (!existsSync(file)) {
  console.error(`[hygiene:clipboard] ${file} not found. Run \`npm run hygiene:full\` first.`);
  process.exit(1);
}

const content = readFileSync(file, 'utf8');

if (process.platform === 'darwin') {
  const p = spawnSync('pbcopy', [], { input: content, encoding: 'utf8' });
  if (p.status === 0) {
    console.log(
      '[hygiene:clipboard] Copied assistant-task.md to clipboard. Paste it into the chat.'
    );
    process.exit(0);
  } else {
    console.error('[hygiene:clipboard] Failed to copy via pbcopy.');
    process.exit(1);
  }
} else {
  console.log(
    '[hygiene:clipboard] Non-macOS detected. Please open reports/assistant-task.md and paste its contents into the chat.'
  );
  process.exit(0);
}
