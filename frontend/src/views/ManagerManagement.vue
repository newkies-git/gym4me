<template>
  <div class="container mgt-wrapper">
    <div class="header">
      <h2>{{ t('managerMgt.pageTitle') }}</h2>
    </div>

    <div class="glass" style="padding: 2rem; margin-top: 2rem;">
      <h3>{{ t('managerMgt.promoteTitle') }}</h3>
      <div class="field" style="margin-top: 1rem;">
        <input v-model="targetEmail" type="email" :placeholder="t('managerMgt.emailPlaceholder')" />
      </div>
      <button class="btn btn-primary" @click="handlePromote">{{ t('managerMgt.promoteBtn') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { promoteToManager } from '../services/firebaseService'
import { useUIStore } from '../stores/uiStore'

const ui = useUIStore()
const targetEmail = ref('')
const { t } = useI18n()

async function handlePromote() {
  if (!targetEmail.value) return
  try {
    await promoteToManager(targetEmail.value)
    ui.showToast(t('managerMgt.promoteSuccess', { email: targetEmail.value }), 'success')
    targetEmail.value = ''
  } catch (e: any) {
    ui.showToast(t('managerMgt.promoteFailed') + ': ' + e.message, 'error')
  }
}
</script>

<style scoped>
.mgt-wrapper { padding: 2rem 0; }
</style>
