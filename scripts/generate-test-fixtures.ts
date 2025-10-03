#!/usr/bin/env tsx
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
const outDir = join(root, 'tests', 'fixtures');
mkdirSync(outDir, { recursive: true });

// 1x1 transparent PNG (base64)
const pngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9YvJk8UAAAAASUVORK5CYII=';
const png = Buffer.from(pngBase64, 'base64');
writeFileSync(join(outDir, 'tiny.png'), png);

// Minimal PDF with header/footer (sufficient for most simple validations)
const pdfContent = `%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\n%%EOF\n`;
writeFileSync(join(outDir, 'tiny.pdf'), pdfContent, { encoding: 'binary' });

// Plain text and markdown
writeFileSync(join(outDir, 'note.txt'), 'Some helpful notes for testing.');
writeFileSync(join(outDir, 'note.md'), '# Test\n\nThis is a tiny markdown file.');

console.log('Fixtures written to:', outDir);
console.log(' - tiny.png');
console.log(' - tiny.pdf');
console.log(' - note.txt');
console.log(' - note.md');
