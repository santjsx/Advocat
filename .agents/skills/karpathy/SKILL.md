---
name: karpathy
description: >-
  Andrej Karpathy coding guidelines for disciplined, minimal, surgical code changes, simplicity, and goal-driven execution.
---

# Karpathy-Inspired Coding Guidelines

Behavioral guidelines to reduce common LLM coding mistakes, derived from Andrej Karpathy's observations.

## 1. Think Before Coding
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them.
- If a simpler approach exists, say so.

## 2. Simplicity First
- Minimum code that solves the problem. Nothing speculative.
- No abstractions for single-use code.
- If you write 200 lines and it could be 50, rewrite it.

## 3. Surgical Changes
- Touch only what you must. Match existing style.
- Don't refactor things that aren't broken.
- Clean up only your own orphans.

## 4. Goal-Driven Execution
- Define verifiable success criteria. Loop until verified.
