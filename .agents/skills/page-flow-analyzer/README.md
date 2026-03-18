````md
# page-flow-analyzer

`page-flow-analyzer` is a Cursor skill for analyzing **a single Vue 3 + TypeScript page** and reconstructing **popup / modal / dialog / drawer interaction flow**.

It is designed for page-local investigation such as:

- which button opens a modal
- which state controls visibility
- how the modal mounts
- how the child emits close
- how the parent resets state

This skill is intentionally narrow.  
It is **not** a full-project dependency analyzer.

---

## 1. What this skill does

Given one Vue page, this skill reconstructs flows like:

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

Typical use cases:

- "Analyze modal flow in this page"
- "Which button opens this dialog?"
- "Trace popup open/close path"
- "Show parent-child close interaction"
- "Find the state controlling this modal"

---

## 2. Recommended target stack

This skill is optimized for:

- Vue 3
- TypeScript
- `<script setup lang="ts">`
- `<script lang="ts">`

It also works reasonably well with:

- `ref(...)`
- `reactive(...)`
- `v-if`
- `v-show`
- `v-model`
- `v-model:visible`
- `@close`
- `emit('close')`
- `emit('update:modelValue', false)`
- `emit('update:visible', false)`

---

## 3. Folder structure

Recommended layout:

```text
.cursor/
  skills/
    page-flow-analyzer/
      SKILL.md
      examples.md
      checklist.md
      README.md
```

Minimum required file:

- `SKILL.md`

Recommended supporting files:

- `examples.md`
- `checklist.md`
- `README.md`

---

## 4. Installation

Copy the `page-flow-analyzer` folder into:

```text
.cursor/skills/page-flow-analyzer/
```

Verify the following files exist:

```text
.cursor/skills/page-flow-analyzer/SKILL.md
.cursor/skills/page-flow-analyzer/examples.md
.cursor/skills/page-flow-analyzer/checklist.md
.cursor/skills/page-flow-analyzer/README.md
```

Once the skill is present, Cursor Agent can use it when the task matches the skill description.

---

## 5. How to use in Cursor

Open the target Vue page and ask Cursor Agent with a direct request.

Recommended prompts:

```text
Analyze the modal flow in this page.
```

```text
Trace popup open and close flow for this Vue file.
```

```text
Show which button opens the dialog and how it closes.
```

```text
Reconstruct the page flow for all modal components in this file.
```

```text
Focus only on this page and directly related modal components.
```

For best results, specify scope explicitly:

```text
Use the page-flow-analyzer skill.
Analyze only this page and directly related child modal files.
Output summary, flow, evidence table, and unresolved items.
```

---

## 6. Recommended operating model

This skill works best when the analysis is kept narrow.

Preferred scope:

1. current page file
2. directly imported modal/popup/dialog/drawer child components
3. only extra files needed to confirm open/close interaction

Do not use it as a whole-project reviewer.

---

## 7. Expected output structure

A good response should look like this:

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

Evidence
| Step | Type | Code reference | Confidence | Notes |
|---|---|---|---|---|
| 1 | trigger | `@click="openUserModal"` | resolved | Button click starts flow |
| 2 | handler | `function openUserModal()` | resolved | Direct handler |
| 3 | state | `showUserModal.value = true` | resolved | Opens modal |
| 4 | mount | `<UserModal v-if="showUserModal" />` | resolved | Conditional render |
| 5 | child event | `emit('close')` | resolved | Close emit found in child |
| 6 | parent listener | `@close="handleCloseUserModal"` | resolved | Parent catches close |
| 7 | reset | `showUserModal.value = false` | resolved | Parent closes modal |
```

---

## 8. Confidence levels

This skill uses 3 confidence states.

### `resolved`

Use when the code directly proves the relation.

Examples:

- `@click="openModal"`
- `openModal()` sets `visible.value = true`
- `<MyModal v-if="visible" />`
- `emit('close')`
- `@close="handleClose"`
- `handleClose()` sets `visible.value = false`

### `inferred`

Use when the relation is very likely but not directly proven.

Examples:

- `v-model` likely implies `update:modelValue`
- component naming strongly implies modal behavior
- child close contract follows common conventions but is not opened yet

### `unresolved`

Use when page-local analysis cannot prove the final relation.

Examples:

- `modalStore.open('userDetail')`
- `<component :is="currentModal">`
- layout-level modal registry
- event bus based communication

---

## 9. Best practices

To get stable results, keep code patterns predictable.

Recommended page patterns:

```vue
<button @click="openUserModal">Open</button>
<UserModal v-if="showUserModal" @close="handleCloseUserModal" />
```

```ts
const showUserModal = ref(false);

function openUserModal() {
  showUserModal.value = true;
}

function handleCloseUserModal() {
  showUserModal.value = false;
}
```

Recommended child modal pattern:

```ts
const emit = defineEmits<{
  close: [];
}>();

function close() {
  emit("close");
}
```

The more explicit the page-level open/close logic is, the more reliable the analysis becomes.

---

## 10. Known limitations

This skill is intentionally pragmatic, not exhaustive.

Accuracy drops when the page uses:

- global modal registries
- dynamic component rendering
- event bus communication
- deeply hidden composables
- indirect state mutation through stores
- runtime-only modal mapping
- slot-driven close interactions not visible in the parent page

Example:

```ts
modalStore.open("userDetail");
```

This is usually analyzable only as:

```text
[Button Click]
  -> [modalStore.open('userDetail')] resolved
  -> [actual mounted modal component] unresolved
```

That is acceptable behavior.
The skill should prefer explicit uncertainty over false precision.

---

## 11. When not to use this skill

Do not use this skill for:

- repository-wide architecture mapping
- global component relationship graphs
- performance diagnosis
- styling review
- business logic review unrelated to popup flow
- backend tracing

For those tasks, use a different workflow.

---

## 12. Example prompts

### Basic page analysis

```text
Use the page-flow-analyzer skill and analyze the modal flow in this page.
```

### Strictly page-local analysis

```text
Use page-flow-analyzer.
Do not scan the whole project.
Analyze only this Vue page and directly related child modal files.
```

### Multiple modal flow analysis

```text
Use page-flow-analyzer.
Find all modal, popup, dialog, and drawer flows in this page.
Separate each flow clearly.
```

### Open/close path focus

```text
Use page-flow-analyzer.
Show trigger -> open handler -> state -> modal mount -> close emit -> parent handler -> state reset.
```

### Debugging-oriented prompt

```text
Use page-flow-analyzer.
I want to know exactly why this modal opens and what closes it.
Mark each connection as resolved, inferred, or unresolved.
```

---

## 13. Suggested team usage

This skill is especially useful for:

- onboarding into legacy Vue pages
- reviewing modal interaction before refactoring
- documenting current popup behavior
- identifying fragile close/open contracts
- verifying page-local modal behavior before migration

A practical team workflow is:

1. open the page
2. run the skill
3. review the flow output
4. refactor modal logic if needed
5. run the skill again to compare before/after behavior

---

## 14. Maintenance notes

Update `examples.md` when your codebase introduces new modal conventions.

Typical reasons to revise the skill:

- new dialog component conventions
- migration from `@close` to `v-model`
- migration to store-driven modal control
- custom wrapper components such as `BaseDialog` or `CommonPopup`
- introduction of drawer or sheet components with different naming

If your project has strong internal naming conventions, add them to `SKILL.md` so the agent can detect them more reliably.

---

## 15. Practical recommendation

This skill should remain **small, deterministic, and page-local**.

Do not turn it into a full static analyzer unless there is a clear need.
Its value comes from quickly reconstructing the most reliable modal interaction graph from one page with minimal noise.

```

다음 단계로는 이 skill에 맞춰서 실제 Cursor에서 바로 붙여 넣어 테스트할 수 있는 **분석용 프롬프트 템플릿 10개**를 만드는 것이 가장 유용합니다.
```
