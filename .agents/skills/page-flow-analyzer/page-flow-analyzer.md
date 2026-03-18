````md
---
name: page-flow-analyzer
description: Analyze a single Vue 3 + TypeScript page and reconstruct popup/modal flow such as click -> open handler -> state change -> modal mount -> emit close -> parent state reset.
---

# Page Flow Analyzer

## Purpose

Use this skill when the user wants to understand the flow inside a **single Vue page**, especially popup/modal behavior.

This skill is optimized for:

- Vue 3
- TypeScript
- `<script setup lang="ts">` or `<script lang="ts">`
- page-local flow analysis
- popup / modal / dialog / drawer interactions

This skill does **not** attempt full project-wide dependency analysis.  
It focuses on **one page file** and only the **directly related child modal components** needed to reconstruct the interaction flow.

---

## When to use this skill

Use this skill when the request is about any of the following:

- "How does this modal open and close?"
- "Trace popup flow in this page"
- "Which button opens this dialog?"
- "What is the close path for this modal?"
- "Show page flow for modal/popup/dialog"
- "Analyze click -> open -> close flow"
- "Find the state controlling this popup"
- "Map parent-child modal interaction for this page"

Do **not** use this skill for:

- full repository architecture review
- large-scale cross-project dependency graph generation
- performance profiling
- CSS/UI design review
- backend/API logic review unless directly required for modal flow

---

## Analysis scope

Strictly keep the scope small.

Primary target:

1. the current Vue page file
2. the modal/popup/dialog components directly imported or directly rendered by that page
3. only additional files that are necessary to resolve close/open interaction

Avoid broad exploration across the project unless it is absolutely required to resolve the flow.

---

## Supported patterns

This skill should prioritize these patterns first.

### Open path patterns

- `@click="openModal()"`
- `@click="flag = true"`
- `@click="onOpenXxx(...)"`

- `ref(false)` / `ref(true)` boolean modal flags
- `reactive({...})` state with open/visible flags
- modal rendered with:
  - `v-if`
  - `v-show`
  - `v-model`
  - `v-model:visible`
  - `:model-value`
  - `:open`
  - `:visible`

### Close path patterns

- child `emit('close')`
- child `emit('update:modelValue', false)`
- child `emit('update:visible', false)`
- parent listeners:
  - `@close="onClose"`
  - `@update:modelValue="..."`
  - `@update:visible="..."`

### Modal component naming hints

Treat these names as strong modal candidates:

- `*Modal.vue`
- `*Popup.vue`
- `*Dialog.vue`
- `*Drawer.vue`

Also treat components as modal candidates if they are rendered conditionally and have close-like emits.

---

## Core objective

Reconstruct the most likely interaction chain in a page, preferably in this shape:

```text
[Button Click]
  -> [openModal()]
  -> [showModal = true]
  -> [Modal Component mounted]
  -> [emit('close')]
  -> [parent close handler]
  -> [showModal = false]
```
````

The output should reflect actual code evidence, not guesswork.

---

## Required workflow

Follow this sequence.

### Step 1. Identify the page entry file

Determine which `.vue` file is the page being analyzed.

If the user already specified the file, use that file.
If the current editor context clearly indicates the page file, use it.
Do not expand to unrelated files.

### Step 2. Parse the page structure mentally

Inspect:

- `<template>`
- `<script setup lang="ts">` or `<script lang="ts">`

Extract:

- buttons / clickable UI elements
- event handlers
- modal candidate components
- state variables controlling visibility
- close listeners on child components

### Step 3. Find modal candidates

Within the page file, identify modal/popup/dialog/drawer components by:

- import name
- component tag name
- `v-if`, `v-show`, `v-model`, `:visible`, `:open` bindings
- emitted close/update events

### Step 4. Reconstruct open flow

For each modal candidate, determine:

1. what user action triggers it
2. which handler is executed
3. which state is mutated
4. how that state causes the modal to render or become visible

### Step 5. Reconstruct close flow

Open the child modal component only if needed.

Determine:

1. whether the child emits `close` or update events
2. which parent listener handles that event
3. which parent state is reset or changed
4. whether the modal unmounts or hides as a result

### Step 6. Produce structured output

Always produce:

1. concise summary
2. flow graph
3. evidence table
4. unresolved items if any

Do not output only raw observations.

---

## Output format

Always use the following structure.

### 1. Summary

Provide a short summary of the modal flow in the page.

Example:

```text
This page contains 2 modal flows. The primary flow is:
Search button click -> openSearchPopup() -> searchPopupVisible = true -> SearchPopup mounts -> child emits close -> handleCloseSearchPopup() -> searchPopupVisible = false.
```

### 2. Flow graph

Render the flow in plain text.

Use this style:

```text
Flow: SearchPopup

[Button @click="openSearchPopup"]
  -> [function openSearchPopup()]
  -> [state searchPopupVisible = true]
  -> [<SearchPopup v-if="searchPopupVisible">]
  -> [emit('close')]
  -> [parent @close="handleCloseSearchPopup"]
  -> [function handleCloseSearchPopup()]
  -> [state searchPopupVisible = false]
```

If there are multiple flows, separate them clearly.

### 3. Evidence table

Use a compact table with these columns:

- Step
- Type
- Code reference
- Confidence
- Notes

Confidence must be one of:

- `resolved`
- `inferred`
- `unresolved`

Example:

| Step | Type            | Code reference                              | Confidence | Notes                    |
| ---- | --------------- | ------------------------------------------- | ---------- | ------------------------ |
| 1    | trigger         | `@click="openSearchPopup"`                  | resolved   | Button click starts flow |
| 2    | handler         | `function openSearchPopup()`                | resolved   | Direct handler           |
| 3    | state           | `searchPopupVisible.value = true`           | resolved   | Opens popup              |
| 4    | mount           | `<SearchPopup v-if="searchPopupVisible" />` | resolved   | Conditional render       |
| 5    | child event     | `emit('close')`                             | resolved   | Child close emit         |
| 6    | parent listener | `@close="handleCloseSearchPopup"`           | resolved   | Parent catches close     |
| 7    | reset           | `searchPopupVisible.value = false`          | resolved   | Popup closed             |

### 4. Unresolved items

Always include this section if there is ambiguity.

Example:

```text
Unresolved:
- `modalStore.open('user')` is detected, but the actual mounted component is not directly visible in this page.
- `<component :is="currentModal">` prevents static resolution of the final modal component.
```

---

## Analysis rules

### Rule 1. Prefer evidence over assumptions

Only mark a relationship as `resolved` if it is directly supported by code.

Examples of resolved:

- `@click="openModal"`
- `openModal()` sets `showModal.value = true`
- `<UserModal v-if="showModal" />`
- child contains `emit('close')`
- parent contains `@close="handleClose"`
- `handleClose()` sets `showModal.value = false`

### Rule 2. Use `inferred` conservatively

Use `inferred` only when the connection is highly likely but indirect.

Examples:

- component name strongly suggests modal behavior
- visible state naming strongly implies control of a child component
- event naming convention strongly indicates close behavior

### Rule 3. Call out unresolved dynamics explicitly

Mark `unresolved` for patterns like:

- `<component :is="...">`
- registry-based modal systems
- indirect store-driven resolution
- composables that hide mount logic
- async logic whose final branch is unclear
- event bus communication
- router-driven modal state
- slot-driven hidden interactions

### Rule 4. Stay page-local

Do not scan the whole project.
Only inspect the minimal set of files needed to reconstruct the page flow.

### Rule 5. Focus on interaction flow, not implementation noise

Ignore unrelated logic unless it changes open/close flow.

Do not over-explain:

- API payload schemas
- styling
- unrelated computed values
- unrelated watchers
- generic imports

### Rule 6. Prefer modal semantics over generic component structure

This skill is not a generic component tree analyzer.
Its purpose is to explain user interaction flow around popup/modal/dialog visibility and closure.

---

## Heuristics

Use these heuristics in order.

### A. Find trigger points

Search the page template for:

- `@click`
- `@dblclick`
- `@keydown.enter`
- `@keyup.enter`

Prioritize click-based modal opens.

### B. Find visibility state

Search script for likely state names:

- `showModal`
- `isModalOpen`
- `visible`
- `dialogVisible`
- `popupOpen`
- `isOpen`
- `open`
- `showXxx`
- `xxxVisible`

### C. Find rendering condition

Search template for modal tags with:

- `v-if`
- `v-show`
- `v-model`
- `:visible`
- `:open`
- `:model-value`

### D. Find close contracts

Search child component for:

- `defineEmits`
- `emit('close')`
- `emit('cancel')`
- `emit('update:modelValue', false)`
- `emit('update:visible', false)`

Search parent for:

- `@close`
- `@cancel`
- `@update:modelValue`
- `@update:visible`

### E. Prefer direct flows

When multiple possible flows exist, prefer the shortest direct flow supported by code.

---

## Special handling patterns

### Pattern: inline state mutation

Example:

```vue
<button @click="showModal = true">Open</button>
<MyModal v-if="showModal" @close="showModal = false" />
```

Output this directly without inventing function names.

### Pattern: v-model modal control

Example:

```vue
<MyModal v-model="showModal" />
```

Interpret as:

- parent state controls modal visibility
- child likely closes through `update:modelValue`

Mark the child close contract as `inferred` unless confirmed in child code.

### Pattern: store-based flow

Example:

```ts
modalStore.open("userDetail");
```

If the actual rendered component is not directly visible in the page, do not force resolution.

Output:

```text
[Button Click]
  -> [modalStore.open('userDetail')]  resolved
  -> [actual mounted modal component] unresolved
```

### Pattern: dynamic component

Example:

```vue
<component :is="currentModalComponent" />
```

Treat final component mapping as unresolved unless the page contains an immediately traceable assignment.

### Pattern: async open logic

Example:

```ts
async function openModal() {
  await fetchData();
  showModal.value = true;
}
```

This is still resolved if state mutation is explicit.

Represent as:

```text
[Button Click]
  -> [openModal()]
  -> [await fetchData()]
  -> [showModal = true]
  -> [Modal mounted]
```

---

## Preferred response style

Be precise and compact.

Good:

- clear
- sequential
- code-grounded
- explicit about uncertainty

Avoid:

- vague summaries
- unbounded speculation
- whole-project commentary
- plugin/architecture advice unless the user asks

---

## Default response template

Use this template unless the user requests another format.

```text
Summary
- This page contains {N} modal flow(s).
- Primary flow: ...

Flow
{plain text flow graph}

Evidence
{table}

Unresolved
{only if needed}
```

---

## Examples

### Example 1

Input pattern:

```vue
<script setup lang="ts">
import { ref } from "vue";
import UserModal from "./UserModal.vue";

const showUserModal = ref(false);

function openUserModal() {
  showUserModal.value = true;
}

function handleCloseUserModal() {
  showUserModal.value = false;
}
</script>

<template>
  <button @click="openUserModal">Open</button>
  <UserModal v-if="showUserModal" @close="handleCloseUserModal" />
</template>
```

Child:

```vue
<script setup lang="ts">
const emit = defineEmits<{
  close: [];
}>();

function onClose() {
  emit("close");
}
</script>
```

Expected output:

```text
Summary
- This page contains 1 modal flow.
- Primary flow: button click -> openUserModal() -> showUserModal = true -> UserModal mounts -> emit('close') -> handleCloseUserModal() -> showUserModal = false.

Flow: UserModal
[Button @click="openUserModal"]
  -> [function openUserModal()]
  -> [state showUserModal = true]
  -> [<UserModal v-if="showUserModal">]
  -> [emit('close')]
  -> [parent @close="handleCloseUserModal"]
  -> [function handleCloseUserModal()]
  -> [state showUserModal = false]
```

### Example 2

Input pattern:

```vue
<button @click="visible = true">Open</button>
<MyDialog v-model:visible="visible" />
```

Expected output:

```text
Summary
- This page contains 1 dialog flow.

Flow: MyDialog
[Button @click="visible = true"]
  -> [state visible = true]
  -> [<MyDialog v-model:visible="visible">]
  -> [child update:visible(false)] inferred
  -> [state visible = false] inferred
```

---

## Success criteria

A good analysis must:

- identify the trigger
- identify the open path
- identify the visibility state
- identify the mounted modal/dialog component
- identify the close signal where possible
- identify the parent close handling where possible
- distinguish confirmed vs inferred vs unresolved relationships

If those conditions are not met, say exactly what could and could not be resolved.

---

## Final instruction

When using this skill, behave like a **single-page modal flow investigator**.

Do not try to be a full-project analyzer.
Do not broaden the scope unnecessarily.
Reconstruct the smallest reliable interaction graph from the code that is directly relevant to the page.
````