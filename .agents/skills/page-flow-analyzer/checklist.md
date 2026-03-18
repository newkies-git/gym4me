```md
# page-flow-analyzer Checklist

Use this checklist every time the `page-flow-analyzer` skill is applied.

The goal is to keep the analysis narrow, consistent, and evidence-based.

---

## 1. Scope check

- [ ] Did I limit the analysis to a single page file?
- [ ] Did I avoid broad project-wide exploration?
- [ ] Did I open only directly related modal/popup/dialog child files when needed?
- [ ] Did I avoid unrelated files, stores, APIs, styles, and utilities unless essential to the flow?

If any answer is no, reduce scope.

---

## 2. Page entry identification

- [ ] Did I clearly identify the page being analyzed?
- [ ] Did I inspect both `<template>` and `<script setup lang="ts">` or `<script lang="ts">`?
- [ ] Did I identify direct modal candidate components in the page?

---

## 3. Trigger detection

- [ ] Did I find the actual user trigger?
- [ ] Did I inspect `@click` first?
- [ ] Did I also check `@keydown.enter`, `@keyup.enter`, or other direct UI triggers when relevant?
- [ ] Did I avoid inventing triggers not present in code?

Typical trigger evidence:

- `@click="openModal"`
- `@click="visible = true"`
- `@click="onOpenDialog(item)"`

---

## 4. Open path reconstruction

- [ ] Did I locate the handler function or inline mutation?
- [ ] Did I find the visibility state being changed?
- [ ] Did I connect that state to the modal render condition?
- [ ] Did I express the open path sequentially?

Open path should ideally include:

1. trigger
2. handler
3. state mutation
4. modal mount or visible binding

---

## 5. Modal mount/control detection

- [ ] Did I identify whether the component is controlled by `v-if`, `v-show`, `v-model`, `v-model:visible`, `:visible`, `:open`, or `:model-value`?
- [ ] Did I record the exact condition or binding used?
- [ ] Did I avoid claiming a mount path if the page only shows indirect store-based control?

---

## 6. Close path reconstruction

- [ ] Did I inspect the child component when required?
- [ ] Did I search for `defineEmits` or `emit(...)`?
- [ ] Did I check for `emit('close')`?
- [ ] Did I check for `emit('update:modelValue', false)` or `emit('update:visible', false)`?
- [ ] Did I find the parent listener?
- [ ] Did I find the parent state reset?

Close path should ideally include:

1. child emit or close signal
2. parent listener
3. parent handler
4. state reset or unmount

---

## 7. Confidence labeling

For every key relation, assign one of the following:

- [ ] `resolved`
- [ ] `inferred`
- [ ] `unresolved`

Rules:

- Use `resolved` only if code directly proves it.
- Use `inferred` only if the relation is strongly implied.
- Use `unresolved` if the final connection cannot be proven locally.

Typical resolved examples:

- `@click="openUserModal"`
- `openUserModal() { showModal.value = true }`
- `<UserModal v-if="showModal" />`
- `emit('close')`
- `@close="handleClose"`
- `handleClose() { showModal.value = false }`

Typical unresolved examples:

- `<component :is="currentModal" />`
- `modalStore.open('userDetail')` with no page-local renderer
- hidden registry-driven modal systems
- event bus flows not visible in page-local code

---

## 8. Output completeness

- [ ] Did I provide a concise summary?
- [ ] Did I provide at least one plain-text flow graph?
- [ ] Did I provide an evidence table?
- [ ] Did I include an unresolved section when needed?
- [ ] Did I separate multiple modal flows clearly?

A complete response should contain:

1. Summary
2. Flow
3. Evidence
4. Unresolved, only if necessary

---

## 9. Precision check

- [ ] Is every important claim tied to code evidence?
- [ ] Did I avoid broad speculation?
- [ ] Did I avoid turning this into architecture advice unless requested?
- [ ] Did I avoid unrelated commentary about coding style, API design, or UI design?
- [ ] Did I keep the explanation focused on modal/popup/dialog interaction flow?

---

## 10. Patterns to support first

Before considering advanced patterns, verify these basic ones first:

- [ ] `@click="fn()"`
- [ ] `@click="flag = true"`
- [ ] `ref(false)` / boolean visibility flags
- [ ] `v-if`
- [ ] `v-show`
- [ ] `v-model`
- [ ] `v-model:visible`
- [ ] `@close`
- [ ] `emit('close')`
- [ ] `emit('update:modelValue', false)`
- [ ] `emit('update:visible', false)`

If these are not covered first, restart from the page and simplify.

---

## 11. Multiple flow handling

If the page contains more than one modal/dialog/popup:

- [ ] Did I separate each flow by component name?
- [ ] Did I avoid mixing trigger paths from different components?
- [ ] Did I label each flow clearly?
- [ ] Did I summarize the count of flows?

---

## 12. Dynamic and indirect patterns

If dynamic patterns appear:

- [ ] Did I explicitly mark dynamic resolution as inferred or unresolved?
- [ ] Did I avoid pretending the concrete target is known when it is not?
- [ ] Did I describe exactly what blocks resolution?

Examples:
- dynamic component selection
- global modal registry
- store-driven mount outside the page
- composables hiding state transitions

---

## 13. Minimum quality bar

Do not finish the response unless all of the following are true:

- [ ] The trigger is identified
- [ ] The open path is identified or explicitly marked unresolved
- [ ] The modal control mechanism is identified
- [ ] The close path is identified or explicitly marked unresolved
- [ ] Confidence labels are used correctly
- [ ] The output is sequential and readable

If one of these fails, revise before responding.

---

## 14. Final self-check prompt

Before finalizing, ask internally:

- [ ] What exactly opens the modal?
- [ ] What exact state makes it visible?
- [ ] What exact component is rendered?
- [ ] How does the child signal close?
- [ ] How does the parent react?
- [ ] Which parts are proven, inferred, or unresolved?

If these cannot be answered clearly, the final response must say so explicitly.
````

원하시면 다음으로 `.cursor/skills/page-flow-analyzer/README.md` 형태의 짧은 설치/사용 가이드도 작성하겠습니다.
