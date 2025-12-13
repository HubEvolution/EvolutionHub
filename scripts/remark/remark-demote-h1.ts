import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

/**
 * Remark plugin to demote H1 headings to H2 in blog content.
 * Ensures only one H1 per page (the BlogPost component renders the title as H1).
 * Applied only to files under /content/blog/ to avoid side‑effects.
 */
export const remarkDemoteH1: Plugin = () => {
  return (tree, file) => {
    // Apply only to blog markdown files
    if (!file.path?.includes('/content/blog/')) {
      return;
    }
    visit(tree, 'heading', (node) => {
      const heading = node as unknown as { depth?: number };
      if (heading.depth === 1) {
        heading.depth = 2;
      }
    });
  };
};
