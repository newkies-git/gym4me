<template>
  <div class="container mgt-wrapper">
    <div class="header">
      <h2>Manager Management (Site Admin)</h2>
    </div>

    <div class="glass" style="padding: 2rem; margin-top: 2rem;">
      <h3>Promote User to Manager</h3>
      <div class="field" style="margin-top: 1rem;">
        <input v-model="targetEmail" type="email" placeholder="user@example.com" />
      </div>
      <button class="btn btn-primary" @click="handlePromote">Promote to Manager</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { promoteToManager } from '../services/firebaseService'
import { useUIStore } from '../stores/uiStore'

const ui = useUIStore()
const targetEmail = ref('')

async function handlePromote() {
  if (!targetEmail.value) return
  try {
    await promoteToManager(targetEmail.value)
    ui.showToast(`${targetEmail.value} has been promoted to Manager!`, 'success')
    targetEmail.value = ''
  } catch (e: any) {
    ui.showToast('Promotion failed: ' + e.message, 'error')
  }
}
</script>

<style scoped>
.mgt-wrapper { padding: 2rem 0; }
</style>
