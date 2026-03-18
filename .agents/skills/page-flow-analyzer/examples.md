````md
# page-flow-analyzer Examples

This file contains practical examples for the `page-flow-analyzer` skill.

Use these examples to keep analysis output consistent and grounded in code.

---

## Example 1. Basic open/close flow with `v-if`

### Page

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
````

### Child

```vue
<script setup lang="ts">
const emit = defineEmits<{
  close: [];
}>();

function onClose() {
  emit("close");
}
</script>

<template>
  <button @click="onClose">Close</button>
</template>
```

### Expected analysis

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

## Example 2. Inline state mutation

### Page

```vue
<script setup lang="ts">
import { ref } from "vue";
import SearchPopup from "./SearchPopup.vue";

const popupVisible = ref(false);
</script>

<template>
  <button @click="popupVisible = true">Search</button>

  <SearchPopup v-if="popupVisible" @close="popupVisible = false" />
</template>
```

### Expected analysis

```text
Summary
- This page contains 1 popup flow.
- Primary flow: button click -> popupVisible = true -> SearchPopup mounts -> parent receives close -> popupVisible = false.

Flow: SearchPopup
[Button @click="popupVisible = true"]
  -> [state popupVisible = true]
  -> [<SearchPopup v-if="popupVisible">]
  -> [event @close]
  -> [state popupVisible = false]

Evidence
| Step | Type | Code reference | Confidence | Notes |
|---|---|---|---|---|
| 1 | trigger | `@click="popupVisible = true"` | resolved | Inline open |
| 2 | state | `popupVisible = true` | resolved | Visibility state changes |
| 3 | mount | `<SearchPopup v-if="popupVisible" />` | resolved | Popup mount condition |
| 4 | listener | `@close="popupVisible = false"` | resolved | Inline close handling |
| 5 | reset | `popupVisible = false` | resolved | Popup hidden on close |
```

---

## Example 3. `v-model` pattern

### Page

```vue
<script setup lang="ts">
import { ref } from "vue";
import ConfirmDialog from "./ConfirmDialog.vue";

const visible = ref(false);
</script>

<template>
  <button @click="visible = true">Delete</button>
  <ConfirmDialog v-model="visible" />
</template>
```

### Expected analysis

```text
Summary
- This page contains 1 dialog flow.
- Primary flow: button click -> visible = true -> ConfirmDialog becomes visible -> child likely emits update:modelValue -> visible = false.

Flow: ConfirmDialog
[Button @click="visible = true"]
  -> [state visible = true]
  -> [<ConfirmDialog v-model="visible">]
  -> [child update:modelValue(false)] inferred
  -> [state visible = false] inferred

Evidence
| Step | Type | Code reference | Confidence | Notes |
|---|---|---|---|---|
| 1 | trigger | `@click="visible = true"` | resolved | Inline open |
| 2 | state | `visible = true` | resolved | Dialog visibility state |
| 3 | mount/control | `<ConfirmDialog v-model="visible" />` | resolved | Parent controls dialog with v-model |
| 4 | child close contract | `update:modelValue(false)` | inferred | Typical v-model close contract unless child confirms |
| 5 | reset | `visible = false` | inferred | Parent state likely updated by child |
```

---

## Example 4. `v-model:visible` pattern

### Page

```vue
<script setup lang="ts">
import { ref } from "vue";
import AddressDialog from "./AddressDialog.vue";

const visible = ref(false);
</script>

<template>
  <button @click="visible = true">Find Address</button>
  <AddressDialog v-model:visible="visible" />
</template>
```

### Expected analysis

```text
Summary
- This page contains 1 dialog flow.
- Primary flow: button click -> visible = true -> AddressDialog becomes visible -> child likely emits update:visible -> visible = false.

Flow: AddressDialog
[Button @click="visible = true"]
  -> [state visible = true]
  -> [<AddressDialog v-model:visible="visible">]
  -> [child update:visible(false)] inferred
  -> [state visible = false] inferred
```

---

## Example 5. Async open handler

### Page

```vue
<script setup lang="ts">
import { ref } from "vue";
import PreviewModal from "./PreviewModal.vue";

const previewVisible = ref(false);

async function openPreview() {
  await loadPreviewData();
  previewVisible.value = true;
}
</script>

<template>
  <button @click="openPreview">Preview</button>
  <PreviewModal v-if="previewVisible" />
</template>
```

### Expected analysis

```text
Summary
- This page contains 1 modal flow.
- Primary flow: button click -> openPreview() -> await loadPreviewData() -> previewVisible = true -> PreviewModal mounts.

Flow: PreviewModal
[Button @click="openPreview"]
  -> [function openPreview()]
  -> [await loadPreviewData()]
  -> [state previewVisible = true]
  -> [<PreviewModal v-if="previewVisible">]

Evidence
| Step | Type | Code reference | Confidence | Notes |
|---|---|---|---|---|
| 1 | trigger | `@click="openPreview"` | resolved | Button click starts flow |
| 2 | handler | `async function openPreview()` | resolved | Async handler |
| 3 | async step | `await loadPreviewData()` | resolved | Pre-open async operation |
| 4 | state | `previewVisible.value = true` | resolved | Opens modal |
| 5 | mount | `<PreviewModal v-if="previewVisible" />` | resolved | Modal mount condition |
```

---

## Example 6. Store-based open, unresolved target

### Page

```vue
<script setup lang="ts">
const modalStore = useModalStore();

function openUserModal() {
  modalStore.open("userDetail");
}
</script>

<template>
  <button @click="openUserModal">Open</button>
</template>
```

### Expected analysis

```text
Summary
- This page contains a store-driven modal trigger.
- The open action is resolved, but the actual mounted modal component is not directly visible in this page.

Flow
[Button @click="openUserModal"]
  -> [function openUserModal()]
  -> [modalStore.open('userDetail')]
  -> [actual mounted modal component] unresolved

Evidence
| Step | Type | Code reference | Confidence | Notes |
|---|---|---|---|---|
| 1 | trigger | `@click="openUserModal"` | resolved | Button click starts flow |
| 2 | handler | `function openUserModal()` | resolved | Direct handler |
| 3 | store action | `modalStore.open('userDetail')` | resolved | Store-driven open |
| 4 | mount | actual mounted modal component | unresolved | Not visible in page-local scope |

Unresolved
- The page does not directly show which component is mounted for `userDetail`.
- A global modal registry or layout-level renderer may exist outside this page.
```

---

## Example 7. Dynamic component

### Page

```vue
<script setup lang="ts">
import { ref } from "vue";

const currentModal = ref("");
const visible = ref(false);

function openUserModal() {
  currentModal.value = "UserModal";
  visible.value = true;
}
</script>

<template>
  <button @click="openUserModal">Open</button>

  <component :is="currentModal" v-if="visible" />
</template>
```

### Expected analysis

```text
Summary
- This page contains a dynamic modal flow.
- The open state is resolved, but the final mounted component remains partially dynamic.

Flow
[Button @click="openUserModal"]
  -> [function openUserModal()]
  -> [state currentModal = 'UserModal']
  -> [state visible = true]
  -> [<component :is="currentModal" v-if="visible">]
  -> [final concrete component] inferred

Evidence
| Step | Type | Code reference | Confidence | Notes |
|---|---|---|---|---|
| 1 | trigger | `@click="openUserModal"` | resolved | Button click |
| 2 | handler | `function openUserModal()` | resolved | Direct handler |
| 3 | component selection | `currentModal.value = 'UserModal'` | resolved | Dynamic component name assigned |
| 4 | state | `visible.value = true` | resolved | Dynamic modal shown |
| 5 | mount | `<component :is="currentModal" v-if="visible" />` | resolved | Dynamic mount |
| 6 | final concrete component | `UserModal` | inferred | Based on runtime component resolution |

Unresolved
- Runtime registration and actual component binding are not fully visible in page-local code.
```

---

## Example 8. Child close event with explicit parent handler

### Page

```vue
<script setup lang="ts">
import { ref } from "vue";
import ProductDialog from "./ProductDialog.vue";

const dialogVisible = ref(false);

function openDialog() {
  dialogVisible.value = true;
}

function handleDialogClose() {
  resetSelection();
  dialogVisible.value = false;
}
</script>

<template>
  <button @click="openDialog">Select Product</button>

  <ProductDialog :visible="dialogVisible" @close="handleDialogClose" />
</template>
```

### Child

```vue
<script setup lang="ts">
const emit = defineEmits(["close"]);

function cancel() {
  emit("close");
}
</script>
```

### Expected analysis

```text
Summary
- This page contains 1 dialog flow.
- Primary flow: button click -> openDialog() -> dialogVisible = true -> ProductDialog visible -> emit('close') -> handleDialogClose() -> resetSelection() -> dialogVisible = false.

Flow: ProductDialog
[Button @click="openDialog"]
  -> [function openDialog()]
  -> [state dialogVisible = true]
  -> [<ProductDialog :visible="dialogVisible">]
  -> [emit('close')]
  -> [parent @close="handleDialogClose"]
  -> [function handleDialogClose()]
  -> [resetSelection()]
  -> [state dialogVisible = false]
```

---

## Example 9. Multiple modals in one page

### Page

```vue
<script setup lang="ts">
import { ref } from "vue";
import SearchModal from "./SearchModal.vue";
import DetailModal from "./DetailModal.vue";

const searchVisible = ref(false);
const detailVisible = ref(false);

function openSearch() {
  searchVisible.value = true;
}

function openDetail() {
  detailVisible.value = true;
}

function closeSearch() {
  searchVisible.value = false;
}

function closeDetail() {
  detailVisible.value = false;
}
</script>

<template>
  <button @click="openSearch">Search</button>
  <button @click="openDetail">Detail</button>

  <SearchModal v-if="searchVisible" @close="closeSearch" />
  <DetailModal v-if="detailVisible" @close="closeDetail" />
</template>
```

### Expected analysis

```text
Summary
- This page contains 2 modal flows.
- Flow 1: Search button -> openSearch() -> searchVisible = true -> SearchModal mounts -> closeSearch() -> searchVisible = false.
- Flow 2: Detail button -> openDetail() -> detailVisible = true -> DetailModal mounts -> closeDetail() -> detailVisible = false.

Flow: SearchModal
[Button @click="openSearch"]
  -> [function openSearch()]
  -> [state searchVisible = true]
  -> [<SearchModal v-if="searchVisible">]
  -> [parent @close="closeSearch"]
  -> [function closeSearch()]
  -> [state searchVisible = false]

Flow: DetailModal
[Button @click="openDetail"]
  -> [function openDetail()]
  -> [state detailVisible = true]
  -> [<DetailModal v-if="detailVisible">]
  -> [parent @close="closeDetail"]
  -> [function closeDetail()]
  -> [state detailVisible = false]
```

---

## Example 10. What not to do

Avoid output like this:

```text
This page probably uses some popup system and seems to open a modal from a button.
```

Reason:

- vague
- not evidence-based
- does not reconstruct the sequence
- does not distinguish resolved vs inferred vs unresolved

Prefer explicit and code-grounded output.

````