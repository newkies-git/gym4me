<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-content glass" :style="{ maxWidth: maxWidth }">
      <div v-if="title" class="modal-header">
        <ModalTitle :title="title" />
        <button class="close-btn" @click="close">&times;</button>
      </div>
      <div class="modal-body">
        <slot></slot>
      </div>
      <div v-if="$slots.footer" class="modal-footer">
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import ModalTitle from './ModalTitle.vue'

const props = withDefaults(defineProps<{
  isOpen: boolean;
  title?: string;
  maxWidth?: string;
}>(), {
  maxWidth: '400px'
})

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void
  (e: 'close'): void
}>()

const close = () => {
  emit('update:isOpen', false)
  emit('close')
}

// Prevent body scrolling when modal is open
watch(() => props.isOpen, (val) => {
  if (val) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.modal-content {
  padding: 1.75rem 1.75rem 1.25rem 1.75rem;
  border-radius: 1rem;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.9rem;
  margin-bottom: 1.25rem;
  border-bottom: 1px solid var(--border);
}

.modal-header h3 {
  margin: 0;
}

.close-btn {
  background: rgba(148, 163, 184, 0.16);
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 0.85rem;
  cursor: pointer;
  padding: 0.25rem 0.55rem;
  line-height: 1;
  border-radius: 999px;
  transition: color 0.2s;
}

.close-btn:hover {
  color: var(--primary);
  background: rgba(129, 140, 248, 0.16);
  border-color: var(--primary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.25rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
