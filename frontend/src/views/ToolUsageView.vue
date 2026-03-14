<template>
  <div class="tool-usage-wrapper container">
    <div class="header page-header flex-between">
      <div>
        <h2>{{ t('toolUsage.title') }}</h2>
        <p class="sm-text">{{ t('toolUsage.subtitle') }}</p>
      </div>
      <button v-if="auth.isTrainer" class="btn btn-primary" @click="isAddModalOpen = true">
        + {{ t('toolUsage.addTool') }}
      </button>
    </div>

    <!-- Category Filter -->
    <div class="filter-bar glass" style="margin: 1.5rem 0; padding: 1rem; display: flex; gap: 0.5rem; overflow-x: auto;">
        <button 
            v-for="cat in categories" 
            :key="cat" 
            class="badge-btn" 
            :class="{ active: selectedCategory === cat }"
            @click="selectedCategory = cat"
        >
            {{ cat }}
        </button>
    </div>

    <div v-if="loading" class="empty-state">{{ t('common.loading') }}</div>
    <div v-else-if="filteredTools.length === 0" class="empty-state">
        {{ t('toolUsage.noTools') }}
    </div>
    <div v-else class="tool-grid">
      <div v-for="tool in filteredTools" :key="tool.id" class="tool-card glass">
        <div class="media-container">
          <video v-if="tool.mediaType === 'VIDEO'" :src="tool.mediaUrl" controls class="tool-media"></video>
          <img v-else :src="tool.mediaUrl" class="tool-media" :alt="tool.title" />
          <div v-if="tool.isPrivate" class="private-badge">🔒 Private</div>
        </div>
        <div class="tool-info">
          <span class="category-tag">{{ tool.category }}</span>
          <h3>{{ tool.title }}</h3>
          <p class="description">{{ tool.description }}</p>
          <div class="tool-footer sm-text">
            <span>By: {{ tool.trainerEmail }}</span>
            <span v-if="tool.targetTraineeEmail">For: {{ tool.targetTraineeEmail }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Tool Modal -->
    <BaseModal v-model:isOpen="isAddModalOpen" :title="t('toolUsage.addTool')" max-width="500px">
        <div class="field">
            <label>{{ t('toolUsage.titleLabel') }}</label>
            <input type="text" v-model="newTool.title" :placeholder="t('toolUsage.titlePlaceholder')">
        </div>
        <div class="field">
            <label>{{ t('toolUsage.categoryLabel') }}</label>
            <input type="text" v-model="newTool.category" placeholder="e.g., Chest, Legs">
        </div>
        <div class="field">
            <label>{{ t('toolUsage.mediaUrlLabel') }}</label>
            <input type="text" v-model="newTool.mediaUrl" placeholder="https://...">
        </div>
        <div class="field">
            <label>{{ t('toolUsage.mediaTypeLabel') }}</label>
            <select v-model="newTool.mediaType">
                <option value="IMAGE">Image</option>
                <option value="VIDEO">Video</option>
            </select>
        </div>
        <div class="field">
            <label>{{ t('toolUsage.descriptionLabel') }}</label>
            <textarea v-model="newTool.description" rows="3"></textarea>
        </div>
        <div class="field-row">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                <input type="checkbox" v-model="newTool.isPrivate">
                {{ t('toolUsage.makePrivate') }}
            </label>
        </div>
        <div v-if="newTool.isPrivate" class="field" style="margin-top: 1rem;">
            <label>{{ t('toolUsage.targetTraineeLabel') }}</label>
            <input type="email" v-model="newTool.targetTraineeEmail" placeholder="trainee@example.com">
        </div>

        <template #footer>
            <button class="btn btn-ghost" @click="isAddModalOpen = false">{{ t('common.cancel') }}</button>
            <button class="btn btn-primary" @click="handleSave" :disabled="saving">{{ saving ? t('common.processing') : t('common.save') }}</button>
        </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { getTools, addTool } from '../services/toolService'
import type { ToolUsage } from '../types'
import BaseModal from '../components/ui/BaseModal.vue'
import { useUIStore } from '../stores/uiStore'

const { t } = useI18n()
const auth = useAuthStore()
const ui = useUIStore()

const loading = ref(true)
const tools = ref<ToolUsage[]>([])
const selectedCategory = ref('All')

const categories = computed(() => {
    const cats = new Set(['All'])
    tools.value.forEach(t => cats.add(t.category))
    return Array.from(cats)
})

const filteredTools = computed(() => {
    if (selectedCategory.value === 'All') return tools.value
    return tools.value.filter(t => t.category === selectedCategory.value)
})

const fetchTools = async () => {
    if (!auth.user) return
    loading.value = true
    try {
        tools.value = await getTools(auth.user)
    } finally {
        loading.value = false
    }
}

onMounted(fetchTools)

// Add Tool logic
const isAddModalOpen = ref(false)
const saving = ref(false)
const newTool = ref<Partial<ToolUsage>>({
    title: '',
    description: '',
    category: '',
    mediaUrl: '',
    mediaType: 'IMAGE',
    isPrivate: false,
    targetTraineeEmail: ''
})

const handleSave = async () => {
    if (!newTool.value.title || !newTool.value.mediaUrl) return
    saving.value = true
    try {
        await addTool({
            ...newTool.value,
            trainerEmail: auth.user?.email
        })
        isAddModalOpen.value = false
        fetchTools()
        ui.showToast(t('common.saveSuccess' as any) || 'Saved', 'success')
    } catch (e: any) {
        ui.showToast(e.message, 'error')
    } finally {
        saving.value = false
    }
}
</script>

<style scoped>
.tool-usage-wrapper { padding: 6rem 1rem 2rem 1rem; }
.tool-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
}

@media (min-width: 641px) {
  .tool-grid {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
}

.tool-card {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: transform 0.2s;
}
.tool-card:hover { transform: translateY(-4px); }
.media-container {
    height: 200px;
    background: #000;
    position: relative;
}
.tool-media {
    width: 100%;
    height: 100%;
    object-fit: contain;
}
.private-badge {
    position: absolute; top: 0.5rem; right: 0.5rem;
    background: rgba(0,0,0,0.6); color: white;
    padding: 0.2rem 0.6rem; border-radius: 1rem; font-size: 0.7rem;
}
.tool-info { padding: 1.25rem; flex: 1; display: flex; flex-direction: column; }
.category-tag {
    font-size: 0.7rem; color: var(--primary); font-weight: 700;
    text-transform: uppercase; margin-bottom: 0.5rem;
}
.description { font-size: 0.9rem; color: var(--text-muted); flex: 1; margin: 0.5rem 0 1rem; }
.tool-footer { border-top: 1px solid var(--border); padding-top: 0.75rem; display: flex; flex-direction: column; gap: 0.2rem; }

.badge-btn {
    padding: 0.4rem 1rem; border-radius: 2rem; background: var(--bg-dark);
    border: 1px solid var(--border); color: var(--text-muted); transition: 0.2s; white-space: nowrap;
}
.badge-btn.active { background: var(--primary); border-color: var(--primary); }

.field { margin-bottom: 1.25rem; }
.field label { display: block; margin-bottom: 0.4rem; color: var(--text-muted); font-size: 0.85rem; }
.field input, .field textarea, .field select {
    width: 100%; padding: 0.75rem; background: #fafafa;
    border: 1px solid var(--border); border-radius: 0.5rem; color: var(--text-main);
}
</style>
