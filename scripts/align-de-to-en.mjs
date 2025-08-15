#!/usr/bin/env node
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function logMove(from, to, existed) {
  if (existed) {
    console.log(`Moved ${from} -> ${to}`);
  } else {
    console.log(`Skipped ${from} (not present)`);
  }
}

try {
  const dePath = resolve('src/locales/de.json');
  const backupPath = resolve('src/locales/de.backup.json');

  const raw = readFileSync(dePath, 'utf8');
  const de = JSON.parse(raw);

  // Backup original
  copyFileSync(dePath, backupPath);
  console.log(`Backup written: ${backupPath}`);

  de.common = de.common || {};
  de.pages = de.pages || {};

  // 1) Move auth-related pages.* to common.* (to match EN structure)
  const authKeys = ['login', 'register', 'forgotPassword', 'resetPassword'];
  for (const k of authKeys) {
    if (de.pages[k]) {
      de.common[k] = de.pages[k];
      delete de.pages[k];
      logMove(`pages.${k}`, `common.${k}`, true);
    } else {
      logMove(`pages.${k}`, `common.${k}`, false);
    }
  }

  // 2) Move pages.faq to top-level faq and also populate common.faq (EN has both)
  if (de.pages.faq) {
    de.faq = de.faq || {};
    // Merge minimal structure if faq already existed (shouldn't in current DE)
    const faqFromPages = de.pages.faq;
    de.faq = Object.assign({}, faqFromPages, de.faq);
    de.common.faq = clone(faqFromPages);
    delete de.pages.faq;
    logMove('pages.faq', 'faq and common.faq', true);
  } else {
    logMove('pages.faq', 'faq and common.faq', false);
  }

  // Ensure we have a top-level faq container before moving the legal pages under it
  de.faq = de.faq || {};

  // 3) Move legal pages under faq.* (to mirror EN's faq.impressum/datenschutz/agb)
  const legalKeys = ['impressum', 'datenschutz', 'agb'];
  for (const k of legalKeys) {
    if (de.pages[k]) {
      de.faq[k] = de.pages[k];
      delete de.pages[k];
      logMove(`pages.${k}`, `faq.${k}`, true);
    } else {
      logMove(`pages.${k}`, `faq.${k}`, false);
    }
  }

  // 4) Keep pages.home, pages.pricing, pages.kontakt as-is; no action needed

  // Write back
  writeFileSync(dePath, JSON.stringify(de, null, 2) + '\n', 'utf8');
  console.log(`Updated ${dePath}`);
  console.log('Done.');
} catch (err) {
  console.error('Failed to align de.json:', err);
  process.exit(1);
}
