---
name: simplify
description: Simplifies recent git history into a concise, decision-ready summary. Use when the user asks to simplify commits, summarize the last N commits (especially last 8 commits), or wants a high-level changelog with risks and next actions.
---

# Simplify

## Purpose

Turn recent commit history into a short, clear summary for fast review.

## When to use

Use this skill when the user asks for:
- "simplify the last 8 commits"
- a quick commit summary
- a concise changelog for leadership review

## Workflow

1. Gather recent commit history (default: last 8 commits unless user specifies otherwise).
2. Read enough diff context to understand intent, not just filenames.
3. Group changes by theme (feature, bug fix, infra, docs, tests).
4. Report risks/regressions and validation status.
5. End with clear recommended next steps.

## Required output format

Use this exact structure:

### Snapshot
- 2-4 bullets covering what changed overall.

### Commit Breakdown
- One bullet per commit: `<short_sha> - <plain-English impact>`.

### Risks / Watchouts
- List any correctness, security, data, migration, or operational risks.
- If none found, state "No major risks found."

### Validation
- Mention available signals (tests, lint, typecheck, build, smoke tests).
- If not run, say what still needs to be verified.

### Recommended Next Step
- 1-3 concrete actions.

## Quality bar

- Prefer plain language over git jargon.
- Focus on user impact and business impact, not implementation trivia.
- Keep concise by default; expand only when asked.
- Do not invent results (tests, metrics, risk status).
