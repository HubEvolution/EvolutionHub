# GitHub Agent Installation Check

This document describes the GitHub Agent verification script and how to use it.

## Overview

The `check-github-agent.ts` script verifies that the GitHub Copilot Agent is correctly installed and configured in the repository. It performs several checks to ensure all necessary files are present and properly formatted.

## Usage

### Run the Check

```bash
npm run agent:check
```

### What It Checks

The script performs the following validations:

1. **Agents Directory**: Verifies that `.github/agents/` exists and contains agent configuration files
2. **Agent Configuration File**: Validates that `.github/agents/evolutionhub-agent.md` exists and has:
   - Valid YAML frontmatter
   - Required `name` field
   - Required `description` field
   - Sufficient instruction content
3. **Copilot Instructions**: Checks that `.github/copilot-instructions.md` exists and contains key sections:
   - Repo snapshot
   - Environment
   - Project layout
4. **Root AGENTS.md**: Verifies that `AGENTS.md` exists at the repository root and contains:
   - Priority rules
   - General principles

## Expected Output

### Success

When all checks pass, you'll see:

```
🔍 Checking GitHub Copilot Agent installation...

✅ Agents Directory: .github/agents directory is valid
   Found 1 agent file(s): evolutionhub-agent.md

✅ Agent Configuration File: Agent file is valid
   Name: evolutionhub-agent, Description: Repo-spezifischer Coding-Agent...

✅ Copilot Instructions: Copilot instructions file is valid

✅ Root AGENTS.md: Root AGENTS.md file is valid

────────────────────────────────────────────────────────────
✅ All checks passed! GitHub Agent is correctly installed.
```

The script exits with code 0.

### Failure

If any check fails, you'll see error messages indicating what needs to be fixed:

```
🔍 Checking GitHub Copilot Agent installation...

❌ Agent Configuration File: Agent file missing YAML frontmatter
   File must start with YAML frontmatter (---)

────────────────────────────────────────────────────────────
❌ Some checks failed. Please fix the issues above.
```

The script exits with code 1.

## Agent File Format

The agent configuration file must follow this structure:

```markdown
---
name: agent-name
description: Agent description
# tools:                    # Optional
#   - read
#   - edit
#   - search
---

Agent instructions go here...
```

### Required Fields

- `name`: The agent's identifier (used by GitHub)
- `description`: A clear description of the agent's purpose

### Optional Fields

- `tools`: List of specific tools the agent can use (if omitted, all tools are available)

## Related Files

- **Script**: `scripts/check-github-agent.ts` - The verification script
- **Agent Config**: `.github/agents/evolutionhub-agent.md` - The agent definition
- **Copilot Instructions**: `.github/copilot-instructions.md` - Onboarding instructions for Copilot
- **Root AGENTS**: `AGENTS.md` - Repository-wide agent rules

## CI/CD Integration

This check can be integrated into CI/CD pipelines to ensure agent configuration remains valid:

```yaml
- name: Check GitHub Agent Installation
  run: npm run agent:check
```

## Troubleshooting

### "Agent file not found"

Ensure `.github/agents/evolutionhub-agent.md` exists.

### "Agent file missing YAML frontmatter"

The file must start with `---` on the first line, followed by YAML metadata, and close with another `---`.

### "Agent name not found in frontmatter"

Add a `name:` field in the YAML frontmatter.

### "Agent instructions appear to be too short or missing"

Ensure there is substantial content after the YAML frontmatter (at least 50 characters).

## Maintenance

When updating the agent configuration:

1. Edit `.github/agents/evolutionhub-agent.md`
2. Run `npm run agent:check` to verify the changes
3. Commit the changes if all checks pass

## See Also

- [GitHub Copilot Agent Documentation](https://docs.github.com/en/copilot/customizing-copilot/creating-custom-agents)
- [AGENTS.md](../AGENTS.md) - Repository agent rules
- [Copilot Instructions](.github/copilot-instructions.md) - Onboarding guide
