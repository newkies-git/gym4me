---
name: page-flow-analyzer
description: Analyze a single Vue 3 + TypeScript page and reconstruct popup/modal flow (click -> open -> state -> mount -> emit close -> parent reset).
---

# Page Flow Analyzer

Use this skill when the user wants to understand **modal/popup/dialog flow** in a **single Vue page**.

## When to Use

- "How does this modal open and close?"
- "Trace popup flow in this page"
- "Which button opens this dialog?"
- "Analyze click -> open -> close flow"

## Scope

- **Target:** One Vue page + directly related child modal components
- **Do NOT:** Full project analysis, performance, CSS, backend

## Core Output

Reconstruct the interaction chain:

```
[Button Click] -> [openModal()] -> [showModal = true] -> [Modal mounted]
  -> [emit('close')] -> [parent handler] -> [showModal = false]
```

## Patterns

- **Open:** `@click`, `ref`/`reactive` visibility state, `v-if`/`v-show`/`v-model`
- **Close:** `emit('close')`, `emit('update:modelValue', false)`, `@close`
- **Modal names:** `*Modal.vue`, `*Popup.vue`, `*Dialog.vue`, `*Drawer.vue`

## Output Format

1. Summary
2. Flow graph (plain text)
3. Evidence table (Step, Type, Code reference, Confidence: resolved/inferred/unresolved)
4. Unresolved items

## Full Documentation

See **page-flow-analyzer.md** in this folder for complete workflow, heuristics, and examples.
