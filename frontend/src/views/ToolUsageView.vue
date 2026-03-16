<template>
  <div class="tool-usage-wrapper container">
    <PageHeader
      :title="t('toolUsage.title')"
      :subtitle="t('toolUsage.subtitle')"
      :showBack="true"
      back-url="/home"
    />

    <div v-if="auth.isTrainer" class="tool-header-actions">
      <button class="btn btn-primary" @click="isAddModalOpen = true">
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
      <BaseCard v-for="tool in filteredTools" :key="tool.id" class="tool-card" :clickable="false">
        <div class="media-wrapper">
          <div class="media-container">
            <template v-if="toolMediaList(tool).length > 0">
              <video v-if="currentMedia(tool).type === 'VIDEO'" :src="currentMedia(tool).url" controls class="tool-media"></video>
              <img v-else :src="currentMedia(tool).url" class="tool-media" :alt="tool.title" />
            </template>
            <div v-else class="tool-media tool-media-placeholder">No media</div>
            <div v-if="tool.isPrivate" class="private-badge">🔒 Private</div>
            <template v-if="toolMediaList(tool).length > 1">
              <button
                type="button"
                class="media-nav media-prev"
                :aria-label="t('common.prev')"
                @click="setMediaIndex(tool.id, -1)"
              >
                ‹
              </button>
              <button
                type="button"
                class="media-nav media-next"
                :aria-label="t('common.next')"
                @click="setMediaIndex(tool.id, 1)"
              >
                ›
              </button>
              <span class="media-counter">{{ mediaIndexMap[tool.id] + 1 }} / {{ toolMediaList(tool).length }}</span>
            </template>
          </div>
        </div>
        <div class="tool-info">
          <div class="tool-category-row">
            <span class="category-tag">{{ tool.category }}</span>
            <button v-if="auth.isTrainer && canEditTool(tool)" type="button" class="btn btn-ghost btn-sm tool-edit-btn" @click="openEditModal(tool)">{{ t('toolUsage.editTool') }}</button>
          </div>
          <h3 class="tool-title">{{ tool.title }}</h3>
          <p class="tool-description">{{ tool.description }}</p>
          <div class="tool-footer sm-text">
            <div class="tool-meta-line">
              <span class="tool-registrant">{{ t('toolUsage.byLabel') }} {{ tool.trainerNickname || tool.trainerEmail }}</span>
              <span class="tool-meta-sep">·</span>
              <span class="tool-created">{{ t('toolUsage.registeredAt') }} {{ formatToolDate(tool.createdAt) }}</span>
            </div>
            <span v-if="tool.targetTraineeEmail" class="tool-for">{{ t('toolUsage.forLabel') }} {{ tool.targetTraineeEmail }}</span>
          </div>
        </div>
      </BaseCard>
    </div>

    <!-- Add Tool Modal -->
    <BaseModal v-model:isOpen="isAddModalOpen" :title="t('toolUsage.addTool')" max-width="560px">
        <div class="field">
            <label>{{ t('toolUsage.titleLabel') }}</label>
            <input type="text" v-model="form.title" :placeholder="t('toolUsage.titlePlaceholder')">
        </div>
        <div class="field">
            <label>{{ t('toolUsage.categoryLabel') }}</label>
            <input type="text" v-model="form.category" placeholder="e.g., Chest, Legs">
        </div>
        <div class="field">
            <label>{{ t('toolUsage.mediaUrlLabel') }} ({{ t('toolUsage.multipleAllowed') }})</label>
            <div v-for="(item, idx) in form.media" :key="'add-' + idx" class="media-row">
                <input type="text" v-model="item.url" :placeholder="'URL ' + (idx + 1)" class="media-url-input">
                <select v-model="item.type" class="media-type-select">
                    <option value="IMAGE">Image</option>
                    <option value="VIDEO">Video</option>
                </select>
                <button type="button" class="btn btn-ghost btn-sm media-remove" :disabled="form.media.length <= 1" @click="removeMedia(idx)">×</button>
            </div>
            <button type="button" class="btn btn-ghost btn-sm" style="margin-top: 0.5rem;" @click="addMediaRow">{{ t('toolUsage.addMedia') }}</button>
        </div>
        <div class="field">
            <label>{{ t('toolUsage.descriptionLabel') }}</label>
            <textarea v-model="form.description" rows="3"></textarea>
        </div>
        <div class="field-row">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                <input type="checkbox" v-model="form.isPrivate">
                {{ t('toolUsage.makePrivate') }}
            </label>
        </div>
        <div v-if="form.isPrivate" class="field" style="margin-top: 1rem;">
            <label>{{ t('toolUsage.targetTraineeLabel') }}</label>
            <input type="email" v-model="form.targetTraineeEmail" placeholder="trainee@example.com">
        </div>

        <template #footer>
            <button class="btn btn-ghost" @click="closeAddModal">{{ t('common.cancel') }}</button>
            <button class="btn btn-primary" @click="handleSave" :disabled="saving">{{ saving ? t('common.processing') : t('common.save') }}</button>
        </template>
    </BaseModal>

    <!-- Edit Tool Modal -->
    <BaseModal v-model:isOpen="isEditModalOpen" :title="t('toolUsage.editTool')" max-width="560px">
        <div class="field">
            <label>{{ t('toolUsage.titleLabel') }}</label>
            <input type="text" v-model="form.title">
        </div>
        <div class="field">
            <label>{{ t('toolUsage.categoryLabel') }}</label>
            <input type="text" v-model="form.category">
        </div>
        <div class="field">
            <label>{{ t('toolUsage.mediaUrlLabel') }} ({{ t('toolUsage.multipleAllowed') }})</label>
            <div v-for="(item, idx) in form.media" :key="'edit-' + idx" class="media-row">
                <input type="text" v-model="item.url" :placeholder="'URL ' + (idx + 1)" class="media-url-input">
                <select v-model="item.type" class="media-type-select">
                    <option value="IMAGE">Image</option>
                    <option value="VIDEO">Video</option>
                </select>
                <button type="button" class="btn btn-ghost btn-sm media-remove" :disabled="form.media.length <= 1" @click="removeMedia(idx)">×</button>
            </div>
            <button type="button" class="btn btn-ghost btn-sm" style="margin-top: 0.5rem;" @click="addMediaRow">{{ t('toolUsage.addMedia') }}</button>
        </div>
        <div class="field">
            <label>{{ t('toolUsage.descriptionLabel') }}</label>
            <textarea v-model="form.description" rows="3"></textarea>
        </div>
        <div class="field-row">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                <input type="checkbox" v-model="form.isPrivate">
                {{ t('toolUsage.makePrivate') }}
            </label>
        </div>
        <div v-if="form.isPrivate" class="field" style="margin-top: 1rem;">
            <label>{{ t('toolUsage.targetTraineeLabel') }}</label>
            <input type="email" v-model="form.targetTraineeEmail" placeholder="trainee@example.com">
        </div>

        <template #footer>
            <button class="btn btn-ghost" @click="isEditModalOpen = false">{{ t('common.cancel') }}</button>
            <button class="btn btn-primary" @click="handleUpdate" :disabled="saving">{{ saving ? t('common.processing') : t('common.save') }}</button>
        </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { getTools, addTool, updateTool } from '../services/toolService'
import type { ToolUsage, ToolMediaItem } from '../types'
import PageHeader from '../components/ui/PageHeader.vue'
import BaseModal from '../components/ui/BaseModal.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import { useUIStore } from '../stores/uiStore'

const { t } = useI18n()
const auth = useAuthStore()
const ui = useUIStore()

const loading = ref(true)
const tools = ref<ToolUsage[]>([])
const selectedCategory = ref('All')

const categories = computed(() => {
    const cats = new Set(['All'])
    tools.value.forEach(tool => cats.add(tool.category))
    return Array.from(cats)
})

const filteredTools = computed(() => tools.value.filter(tool => selectedCategory.value === 'All' || tool.category === selectedCategory.value))

function toolMediaList(tool: ToolUsage): ToolMediaItem[] {
    if (tool.media && tool.media.length > 0) return tool.media
    if (tool.mediaUrl) return [{ url: tool.mediaUrl, type: (tool.mediaType as 'VIDEO' | 'IMAGE') || 'IMAGE' }]
    return []
}

const mediaIndexMap = ref<Record<string, number>>({})
function currentMedia(tool: ToolUsage) {
    const list = toolMediaList(tool)
    const idx = Math.min(mediaIndexMap.value[tool.id] ?? 0, Math.max(0, list.length - 1))
    return list[idx] || { url: '', type: 'IMAGE' as const }
}
function setMediaIndex(toolId: string, delta: number) {
    const tool = tools.value.find(t => t.id === toolId)
    if (!tool) return
    const list = toolMediaList(tool)
    const cur = mediaIndexMap.value[toolId] ?? 0
    const next = (cur + delta + list.length) % list.length
    mediaIndexMap.value = { ...mediaIndexMap.value, [toolId]: next }
}

function canEditTool(tool: ToolUsage) {
    return auth.user?.email === tool.trainerEmail
}

function formatToolDate(createdAt: unknown): string {
    if (createdAt == null) return '—'
    let date: Date
    if (typeof (createdAt as any).toDate === 'function') {
        date = (createdAt as any).toDate()
    } else if (typeof (createdAt as any).toMillis === 'function') {
        date = new Date((createdAt as any).toMillis())
    } else if (typeof createdAt === 'number') {
        date = new Date(createdAt)
    } else {
        return '—'
    }
    return date.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

const fetchTools = async () => {
    if (!auth.user) return
    loading.value = true
    try {
        tools.value = await getTools(auth.user)
    } catch (e: any) {
        console.error('Failed to fetch tools:', e)
        ui.showToast(e?.message || t('toolUsage.loadFailed'), 'error')
        tools.value = []
    } finally {
        loading.value = false
    }
}

onMounted(fetchTools)

// Form state (shared for add & edit)
const form = ref<{
    title: string
    description: string
    category: string
    media: ToolMediaItem[]
    isPrivate: boolean
    targetTraineeEmail: string
}>({
    title: '',
    description: '',
    category: '',
    media: [{ url: '', type: 'IMAGE' }],
    isPrivate: false,
    targetTraineeEmail: ''
})

function resetForm() {
    form.value = {
        title: '',
        description: '',
        category: '',
        media: [{ url: '', type: 'IMAGE' }],
        isPrivate: false,
        targetTraineeEmail: ''
    }
}

function addMediaRow() {
    form.value.media.push({ url: '', type: 'IMAGE' })
}

function removeMedia(idx: number) {
    if (form.value.media.length <= 1) return
    form.value.media.splice(idx, 1)
}

const isAddModalOpen = ref(false)
watch(isAddModalOpen, (open) => { if (open) resetForm() })

const closeAddModal = () => { isAddModalOpen.value = false }

const editingId = ref<string | null>(null)
const isEditModalOpen = ref(false)

function openEditModal(tool: ToolUsage) {
    editingId.value = tool.id
    const list = toolMediaList(tool)
    form.value = {
        title: tool.title,
        description: tool.description ?? '',
        category: tool.category ?? '',
        media: list.length > 0 ? list.map(m => ({ ...m })) : [{ url: '', type: 'IMAGE' }],
        isPrivate: !!tool.isPrivate,
        targetTraineeEmail: tool.targetTraineeEmail ?? ''
    }
    isEditModalOpen.value = true
}

const saving = ref(false)

function formMediaFiltered(): ToolMediaItem[] {
    return form.value.media.filter(m => m.url?.trim()).map(m => ({ url: m.url.trim(), type: m.type }))
}

const handleSave = async () => {
    if (!auth.user?.email) {
        ui.showToast(t('common.loginRequired' as any) || '로그인이 필요합니다.', 'error')
        return
    }
    if (!form.value.title?.trim()) {
        ui.showToast(t('toolUsage.titleRequired'), 'error')
        return
    }
    const mediaList = formMediaFiltered()
    if (mediaList.length === 0) {
        ui.showToast(t('toolUsage.mediaRequired'), 'error')
        return
    }
    saving.value = true
    try {
        await addTool({
            title: form.value.title.trim(),
            description: form.value.description.trim(),
            category: form.value.category.trim(),
            media: mediaList,
            isPrivate: form.value.isPrivate,
            targetTraineeEmail: form.value.isPrivate ? form.value.targetTraineeEmail.trim() || undefined : undefined,
            trainerEmail: auth.user.email,
            trainerNickname: auth.user.nickname ?? undefined
        })
        isAddModalOpen.value = false
        resetForm()
        await fetchTools()
        ui.showToast(t('common.saveSuccess'), 'success')
    } catch (e: any) {
        ui.showToast(e?.message || t('common.saveFailed'), 'error')
    } finally {
        saving.value = false
    }
}

const handleUpdate = async () => {
    const id = editingId.value
    if (!id || !auth.user?.email) return
    if (!form.value.title?.trim()) {
        ui.showToast(t('toolUsage.titleRequired'), 'error')
        return
    }
    const mediaList = formMediaFiltered()
    if (mediaList.length === 0) {
        ui.showToast(t('toolUsage.mediaRequired'), 'error')
        return
    }
    saving.value = true
    try {
        await updateTool(id, {
            title: form.value.title.trim(),
            description: form.value.description.trim(),
            category: form.value.category.trim(),
            media: mediaList,
            isPrivate: form.value.isPrivate,
            targetTraineeEmail: form.value.isPrivate ? form.value.targetTraineeEmail.trim() || undefined : undefined,
            trainerEmail: auth.user.email,
            trainerNickname: auth.user.nickname ?? undefined
        })
        isEditModalOpen.value = false
        editingId.value = null
        await fetchTools()
        ui.showToast(t('common.updateSuccess'), 'success')
    } catch (e: any) {
        ui.showToast(e?.message || t('common.updateFailed'), 'error')
    } finally {
        saving.value = false
    }
}
</script>

<style scoped>
.tool-usage-wrapper { padding: 6rem 1rem 2rem 1rem; }
.tool-header-actions {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 1rem;
}
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
    border-radius: 0.75rem;
    transition: transform 0.2s, box-shadow 0.2s;
}
.tool-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(94, 53, 177, 0.12); }

/* 등록한 이미지 영역 */
.media-wrapper { position: relative; border-radius: 0.75rem 0.75rem 0 0; overflow: hidden; }
.media-container {
    height: 200px;
    background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
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
    padding: 0.25rem 0.6rem; border-radius: 1rem; font-size: 0.7rem;
}
.tool-info { padding: 1.25rem 1.25rem 1rem; flex: 1; display: flex; flex-direction: column; }

/* 카테고리 */
.category-tag {
    display: inline-block;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--primary);
    background: rgba(94, 53, 177, 0.1);
    padding: 0.25rem 0.6rem;
    border-radius: 100px;
    margin-bottom: 0.5rem;
    width: fit-content;
}

/* 카테고리줄: 카테고리 + 수정버튼(우측 끝) */
.tool-category-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    min-width: 0;
}
.tool-title {
    font-size: 1.125rem;
    font-weight: 700;
    line-height: 1.35;
    margin: 0 0 0.5rem 0;
    color: var(--text-primary, #1a1a1a);
}
.tool-edit-btn { flex-shrink: 0; }

.tool-description {
    font-size: 0.9rem;
    color: var(--text-muted);
    line-height: 1.5;
    flex: 1;
    margin: 0 0 1rem 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

/* 푸터: 등록자 + 등록일시 같은 줄 */
.tool-footer {
    border-top: 1px solid var(--border);
    padding-top: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}
.tool-meta-line {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.35rem;
    font-size: 0.8rem;
    color: var(--text-muted);
}
.tool-registrant { font-weight: 500; color: var(--text-primary, #333); }
.tool-meta-sep { opacity: 0.6; user-select: none; }
.tool-created { font-size: 0.8rem; color: var(--text-muted); }
.tool-for { font-size: 0.8rem; color: var(--text-muted); }

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

.media-row {
    display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem;
}
.media-url-input { flex: 1; min-width: 0; }
.media-type-select { width: 100px; flex-shrink: 0; }
.media-remove { flex-shrink: 0; width: 2rem; height: 2rem; padding: 0; font-size: 1.2rem; line-height: 1; }

.media-nav {
    position: absolute; top: 50%; transform: translateY(-50%);
    width: 36px; height: 36px; border-radius: 50%;
    background: rgba(0,0,0,0.5); color: white; border: none; cursor: pointer;
    font-size: 1.5rem; line-height: 1; display: flex; align-items: center; justify-content: center;
    transition: background 0.2s;
}
.media-nav:hover { background: rgba(0,0,0,0.7); }
.media-prev { left: 0.5rem; }
.media-next { right: 0.5rem; }
.media-counter {
    position: absolute; bottom: 0.5rem; right: 0.5rem;
    background: rgba(0,0,0,0.6); color: white; padding: 0.2rem 0.5rem; border-radius: 1rem; font-size: 0.75rem;
}
.tool-media-placeholder {
    display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 0.9rem;
}
</style>
