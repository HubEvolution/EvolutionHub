#!/usr/bin/env tsx
/**
 * Script to verify GitHub Copilot Agent installation and configuration
 *
 * This script checks:
 * - Agent file exists and is properly formatted
 * - YAML frontmatter is valid
 * - Agent instructions are present
 * - Related configuration files exist
 *
 * @module scripts/check-github-agent
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CheckResult {
  passed: boolean;
  message: string;
  details?: string;
}

interface AgentMetadata {
  name?: string;
  description?: string;
  tools?: string[];
}

/**
 * Parse YAML frontmatter from markdown content
 */
function parseFrontmatter(content: string): AgentMetadata | null {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return null;
  }

  const frontmatter = frontmatterMatch[1];
  const metadata: AgentMetadata = {};

  // Simple YAML parser for our use case
  const lines = frontmatter.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue; // Skip comments

    const match = trimmed.match(/^(\w+):\s*['"]?(.+?)['"]?$/);
    if (match) {
      const [, key, value] = match;
      if (key === 'name' || key === 'description') {
        metadata[key] = value;
      }
    }
  }

  return metadata;
}

/**
 * Check if GitHub Agent file exists and is valid
 */
function checkAgentFile(): CheckResult {
  const agentPath = path.join(__dirname, '..', '.github', 'agents', 'evolutionhub-agent.md');

  if (!fs.existsSync(agentPath)) {
    return {
      passed: false,
      message: 'Agent file not found',
      details: `Expected file at: ${agentPath}`,
    };
  }

  try {
    const content = fs.readFileSync(agentPath, 'utf-8');

    if (content.length === 0) {
      return {
        passed: false,
        message: 'Agent file is empty',
      };
    }

    // Check for frontmatter
    if (!content.startsWith('---\n')) {
      return {
        passed: false,
        message: 'Agent file missing YAML frontmatter',
        details: 'File must start with YAML frontmatter (---)',
      };
    }

    const metadata = parseFrontmatter(content);
    if (!metadata) {
      return {
        passed: false,
        message: 'Failed to parse frontmatter',
      };
    }

    if (!metadata.name) {
      return {
        passed: false,
        message: 'Agent name not found in frontmatter',
        details: 'name field is required',
      };
    }

    if (!metadata.description) {
      return {
        passed: false,
        message: 'Agent description not found in frontmatter',
        details: 'description field is required',
      };
    }

    // Check for instructions after frontmatter
    const contentAfterFrontmatter = content.split('---\n').slice(2).join('---\n').trim();
    if (contentAfterFrontmatter.length < 50) {
      return {
        passed: false,
        message: 'Agent instructions appear to be too short or missing',
        details: 'Instructions should provide clear guidance for the agent',
      };
    }

    return {
      passed: true,
      message: 'Agent file is valid',
      details: `Name: ${metadata.name}, Description: ${metadata.description}`,
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Error reading agent file',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if Copilot instructions file exists
 */
function checkCopilotInstructions(): CheckResult {
  const instructionsPath = path.join(__dirname, '..', '.github', 'copilot-instructions.md');

  if (!fs.existsSync(instructionsPath)) {
    return {
      passed: false,
      message: 'Copilot instructions file not found',
      details: `Expected file at: ${instructionsPath}`,
    };
  }

  try {
    const content = fs.readFileSync(instructionsPath, 'utf-8');

    if (content.length === 0) {
      return {
        passed: false,
        message: 'Copilot instructions file is empty',
      };
    }

    // Check for key sections
    const hasRepoSnapshot = content.includes('## Repo snapshot');
    const hasEnvironmentSection = content.includes('## Environment');
    const hasProjectLayout = content.includes('## Project layout');

    if (!hasRepoSnapshot || !hasEnvironmentSection || !hasProjectLayout) {
      return {
        passed: false,
        message: 'Copilot instructions missing required sections',
        details: `Missing: ${[
          !hasRepoSnapshot && 'Repo snapshot',
          !hasEnvironmentSection && 'Environment',
          !hasProjectLayout && 'Project layout',
        ]
          .filter(Boolean)
          .join(', ')}`,
      };
    }

    return {
      passed: true,
      message: 'Copilot instructions file is valid',
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Error reading Copilot instructions file',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if AGENTS.md exists at repository root
 */
function checkRootAgentsFile(): CheckResult {
  const agentsPath = path.join(__dirname, '..', 'AGENTS.md');

  if (!fs.existsSync(agentsPath)) {
    return {
      passed: false,
      message: 'Root AGENTS.md file not found',
      details: `Expected file at: ${agentsPath}`,
    };
  }

  try {
    const content = fs.readFileSync(agentsPath, 'utf-8');

    if (content.length === 0) {
      return {
        passed: false,
        message: 'Root AGENTS.md file is empty',
      };
    }

    // Check for key sections
    const hasPrioritySection = content.includes('## Priorität') || content.includes('## Priority');
    const hasPrinciplesSection =
      content.includes('## Allgemeine Prinzipien') || content.includes('## General Principles');

    if (!hasPrioritySection || !hasPrinciplesSection) {
      return {
        passed: false,
        message: 'Root AGENTS.md missing required sections',
        details: 'Should include priority rules and general principles',
      };
    }

    return {
      passed: true,
      message: 'Root AGENTS.md file is valid',
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Error reading root AGENTS.md file',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if .github/agents directory exists and is properly structured
 */
function checkAgentsDirectory(): CheckResult {
  const agentsDir = path.join(__dirname, '..', '.github', 'agents');

  if (!fs.existsSync(agentsDir)) {
    return {
      passed: false,
      message: '.github/agents directory not found',
      details: `Expected directory at: ${agentsDir}`,
    };
  }

  try {
    const stats = fs.statSync(agentsDir);
    if (!stats.isDirectory()) {
      return {
        passed: false,
        message: '.github/agents exists but is not a directory',
      };
    }

    const files = fs.readdirSync(agentsDir);
    const mdFiles = files.filter((f) => f.endsWith('.md'));

    if (mdFiles.length === 0) {
      return {
        passed: false,
        message: 'No agent files found in .github/agents',
        details: 'Directory exists but contains no .md files',
      };
    }

    return {
      passed: true,
      message: '.github/agents directory is valid',
      details: `Found ${mdFiles.length} agent file(s): ${mdFiles.join(', ')}`,
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Error checking .github/agents directory',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Main function to run all checks
 */
function main(): void {
  console.log('🔍 Checking GitHub Copilot Agent installation...\n');

  const checks: Array<{ name: string; check: () => CheckResult }> = [
    { name: 'Agents Directory', check: checkAgentsDirectory },
    { name: 'Agent Configuration File', check: checkAgentFile },
    { name: 'Copilot Instructions', check: checkCopilotInstructions },
    { name: 'Root AGENTS.md', check: checkRootAgentsFile },
  ];

  let allPassed = true;
  const results: Array<{ name: string; result: CheckResult }> = [];

  for (const { name, check } of checks) {
    const result = check();
    results.push({ name, result });

    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${name}: ${result.message}`);
    if (result.details) {
      console.log(`   ${result.details}`);
    }
    console.log();

    if (!result.passed) {
      allPassed = false;
    }
  }

  console.log('─'.repeat(60));
  if (allPassed) {
    console.log('✅ All checks passed! GitHub Agent is correctly installed.');
    process.exit(0);
  } else {
    console.log('❌ Some checks failed. Please fix the issues above.');
    process.exit(1);
  }
}

// Run the script
main();
