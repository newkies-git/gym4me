<template>
  <div class="tool-usage-wrapper container">
    <PageHeader
      :title="t('toolUsage.title')"
      :subtitle="t('toolUsage.subtitle')"
      :showBack="true"
      back-url="/home"
    />

    <div class="tool-header-actions">
      <div class="tool-header-search">
        <BaseSearchInput
          v-model="searchQuery"
          :placeholder="t('toolUsage.searchPlaceholder')"
        />
      </div>
      <button
        v-if="auth.isTrainer"
        class="btn btn-primary tool-header-add-btn"
        @click="isAddModalOpen = true"
      >
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
              <div class="tool-video-wrap">
                <video
                  v-if="currentMedia(tool).type === 'VIDEO'"
                  class="tool-media"
                  :src="currentMedia(tool).url"
                  preload="metadata"
                  playsinline
                  muted
                  :data-media-url="currentMedia(tool).url"
                  @loadedmetadata="(e) => handleVideoLoadedMetadata(tool.id, currentMedia(tool).url, e, auth.isTrainer && canEditTool(tool))"
                  @play="handleToolViewOnce(tool)"
                ></video>
                <div
                  v-if="currentMedia(tool).type === 'VIDEO'"
                  class="tool-play-overlay"
                  role="button"
                  tabindex="0"
                  aria-label="Play"
                  @click.stop="playToolVideo(tool)"
                  @keydown.enter.stop="playToolVideo(tool)"
                >
                  ▶
                </div>
                <img
                  v-else
                  :src="currentMedia(tool).url"
                  class="tool-media"
                  :alt="tool.title"
                  @load="handleToolViewOnce(tool)"
                />
              </div>
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

            <!-- Overlay (views/comments) - matches Stitch card style -->
            <div class="tool-overlay-bottom">
              <div class="tool-overlay-title-row">
                <h3 class="tool-overlay-title">{{ tool.title }}</h3>
                <button
                  type="button"
                  class="tool-overlay-kebab"
                  aria-label="Menu"
                  @click.stop="auth.isTrainer && canEditTool(tool) ? openEditModal(tool) : openCommentModal(tool)"
                >
                  ⋮
                </button>
              </div>

              <div class="tool-overlay-divider" />

              <div class="tool-overlay-stats-row">
                <div class="tool-overlay-stat">
                  <span class="tool-overlay-stat-text">{{ tool.viewsCount ?? 0 }} VIEWS</span>
                </div>
                <span class="tool-overlay-sep">·</span>
                <button
                  type="button"
                  class="tool-overlay-stat tool-overlay-comments-btn"
                  @click.stop="openCommentModal(tool)"
                >
                  <span class="tool-overlay-stat-text">{{ tool.commentsCount ?? 0 }} COMMENTS</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div v-if="auth.isTrainer" class="tool-info">
          <div class="tool-footer sm-text tool-footer--compact">
            <span class="tool-registrant">
              {{ t('toolUsage.byLabel') }} {{ trainerDisplayNameByTool(tool) }}
            </span>
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
                <BaseSelect
                  v-model="item.type"
                  class="media-type-select"
                  :options="[
                    { value: 'IMAGE', label: 'Image' },
                    { value: 'VIDEO', label: 'Video' }
                  ]"
                />
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
                <BaseSelect
                  v-model="item.type"
                  class="media-type-select"
                  :options="[
                    { value: 'IMAGE', label: 'Image' },
                    { value: 'VIDEO', label: 'Video' }
                  ]"
                />
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

    <!-- Comments Modal -->
    <BaseModal
      v-model:isOpen="isCommentModalOpen"
      :title="activeToolForComments ? activeToolForComments.title : t('toolUsage.title')"
      max-width="560px"
    >
      <div class="comments-modal">
        <div v-if="commentsLoading" class="empty-state">{{ t('common.loading') }}</div>

        <div v-else>
          <div v-if="toolComments.length" class="comments-list">
            <div v-for="c in toolComments" :key="c.id" class="comment-item">
              <div class="comment-author">
                {{ c.authorNickname || c.authorEmail }}
              </div>
              <div class="comment-content">{{ c.content }}</div>
            </div>
          </div>
          <div v-else class="empty-state">{{ t('common.noData') }}</div>

          <form class="comment-form" @submit.prevent="submitToolComment">
            <input
              v-model="commentDraft"
              class="comment-input"
              type="text"
              :placeholder="'댓글을 입력하세요'"
            />
            <button class="btn btn-primary" type="submit" :disabled="!commentDraft.trim()">
              댓글 달기
            </button>
          </form>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import {
  getTools,
  addTool,
  updateTool,
  patchToolMediaDurations,
  incrementToolViewsOnce,
  getToolComments,
  addToolComment
} from '../services/toolService'
import type { ToolUsage, ToolMediaItem, ToolComment } from '../types'
import PageHeader from '../components/ui/PageHeader.vue'
import BaseModal from '../components/ui/BaseModal.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseSelect from '../components/ui/BaseSelect.vue'
import BaseSearchInput from '../components/ui/BaseSearchInput.vue'
import { useUIStore } from '../stores/uiStore'
import { searchUserByEmail } from '../services/domain/userService'
import { extractErrorMessage } from '../utils/error'

const { t } = useI18n()
const auth = useAuthStore()
const ui = useUIStore()

const loading = ref(true)
const tools = ref<ToolUsage[]>([])
const selectedCategory = ref('All')
const searchQuery = ref('')

const categories = computed(() => {
    const cats = new Set(['All'])
    tools.value.forEach(tool => cats.add(tool.category))
    return Array.from(cats)
})

const normalizedSearch = computed(() => searchQuery.value.trim().toLowerCase())

const filteredTools = computed(() => {
  const q = normalizedSearch.value
  return tools.value.filter((tool) => {
    const categoryOk = selectedCategory.value === 'All' || tool.category === selectedCategory.value
    if (!categoryOk) return false
    if (!q) return true

    const title = (tool.title || '').toLowerCase()
    const category = (tool.category || '').toLowerCase()
    const registrant = trainerDisplayNameByTool(tool).toLowerCase()
    const email = (tool.trainerEmail || '').toLowerCase()

    return [title, category, registrant, email].some((v) => v.includes(q))
  })
})

const trainerNicknameByEmail = ref<Record<string, string>>({})

function trainerDisplayNameByTool(tool: ToolUsage): string {
  const email = tool.trainerEmail
  if (trainerNicknameByEmail.value[email]) return trainerNicknameByEmail.value[email]
  if (tool.trainerNickname) return tool.trainerNickname
  return email
}

// ── Comments (tool usage) ─────────────────────────────────────────────
const isCommentModalOpen = ref(false)
const activeToolForComments = ref<ToolUsage | null>(null)
const commentDraft = ref('')
const toolComments = ref<ToolComment[]>([])
const commentsLoading = ref(false)

async function openCommentModal(tool: ToolUsage) {
  activeToolForComments.value = tool
  commentDraft.value = ''
  toolComments.value = []
  isCommentModalOpen.value = true

  commentsLoading.value = true
  try {
    toolComments.value = await getToolComments(tool.id)
  } catch (e: unknown) {
    ui.showToast(extractErrorMessage(e, t('toolUsage.loadFailed')), 'error')
  } finally {
    commentsLoading.value = false
  }
}

async function submitToolComment() {
  const tool = activeToolForComments.value
  if (!tool) return
  if (!auth.user?.email) {
    ui.showToast(t('common.loginRequired' as any) || '로그인이 필요합니다.', 'error')
    return
  }
  const content = commentDraft.value.trim()
  if (!content) return

  try {
    await addToolComment(tool.id, {
      content,
      authorEmail: auth.user.email,
      authorNickname: auth.user.nickname || undefined
    })

    // optimistic refresh: reload comments and update local counts
    toolComments.value = await getToolComments(tool.id)
    tools.value = tools.value.map((t) =>
      t.id === tool.id
        ? { ...t, commentsCount: (t.commentsCount ?? 0) + 1 }
        : t
    )

    commentDraft.value = ''
    isCommentModalOpen.value = false
  } catch (e: unknown) {
    ui.showToast(extractErrorMessage(e, t('common.saveFailed')), 'error')
  }
}

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

// Video duration cache by media URL.
// duration is not guaranteed to exist in Firestore, so we read it from the <video> element metadata.
const videoDurationByUrl = ref<Record<string, number>>({})

const persistedDurationKeys = new Set<string>()
const durationPersistInFlight = new Set<string>()

async function handleVideoLoadedMetadata(toolId: string, url: string, e: Event, canPersist: boolean) {
    if (!url) return
    const el = e.target as HTMLVideoElement | null
    const dur = el?.duration
    if (dur == null || !Number.isFinite(dur) || dur <= 0) return

    // Always keep local cache for immediate UI usage
    videoDurationByUrl.value = { ...videoDurationByUrl.value, [url]: dur }

    if (!canPersist) return

    const durSec = Math.floor(dur)
    if (!Number.isFinite(durSec) || durSec <= 0) return

    const key = `${toolId}:${url}`
    if (persistedDurationKeys.has(key) || durationPersistInFlight.has(key)) return

    durationPersistInFlight.add(key)
    try {
        await patchToolMediaDurations(toolId, { [url]: durSec })
        persistedDurationKeys.add(key)
    } catch (err) {
        // If persistence fails (e.g. permission), keep displaying via local cache.
        console.warn('Failed to persist tool duration cache', err)
    } finally {
        durationPersistInFlight.delete(key)
    }
}

function formatDurationLabel(totalSeconds: number): string {
    const secs = Math.floor(totalSeconds)
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${String(s).padStart(2, '0')}`
}

function durationLabelForTool(tool: ToolUsage): string {
    const url = currentMedia(tool).url
    const stored = toolMediaList(tool).find(m => m.url === url)?.durationSec
    const dur = stored ?? (url ? videoDurationByUrl.value[url] : undefined)
    if (dur == null || !Number.isFinite(dur) || dur <= 0) return ''
    return formatDurationLabel(Number(dur))
}

function playVideo(url: string) {
    if (!url) return
    const escape = (v: string) => (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(v) : v.replace(/"/g, '\\"'))
    const selector = `video[data-media-url="${escape(url)}"]`
    const el = document.querySelector<HTMLVideoElement>(selector)
    if (!el) return
    el.play().catch(() => {
        // Ignore autoplay/play errors in restricted environments
    })
}

const viewedToolIds = new Set<string>()
const viewsInFlight = new Set<string>()

async function handleToolViewOnce(tool: ToolUsage) {
    const email = auth.user?.email
    if (!email) return
    if (viewedToolIds.has(tool.id) || viewsInFlight.has(tool.id)) return

    viewsInFlight.add(tool.id)
    try {
        await incrementToolViewsOnce(tool.id, email)
        viewedToolIds.add(tool.id)
        // optimistic UI sync with local state
        tools.value = tools.value.map((t) =>
            t.id === tool.id ? { ...t, viewsCount: (t.viewsCount ?? 0) + 1 } : t
        )
    } catch (e: any) {
        console.warn('Failed to increment tool views once', e)
    } finally {
        viewsInFlight.delete(tool.id)
    }
}

function playToolVideo(tool: ToolUsage) {
    const media = currentMedia(tool)
    if (media.type !== 'VIDEO') return
    playVideo(media.url)
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
        // Load missing trainer nicknames for display (email -> nickname)
        const missingEmails = tools.value
          .filter((tool) => !!tool.trainerEmail)
          .filter((tool) => !trainerNicknameByEmail.value[tool.trainerEmail] && !tool.trainerNickname)
          .map((tool) => tool.trainerEmail)
        const unique = Array.from(new Set(missingEmails))
        if (unique.length) {
          await Promise.all(
            unique.map(async (email) => {
              try {
                const res = await searchUserByEmail(email)
                if (!res?.data) return
                const data = res.data as Record<string, unknown>
                const nickname =
                  (data.nickname as string | undefined) ||
                  (data.name as string | undefined) ||
                  (data.email as string | undefined)
                if (nickname) trainerNicknameByEmail.value[email] = nickname
              } catch (e) {
                // non-critical; keep email as fallback
                console.warn('Failed to load trainer nickname', e)
              }
            })
          )
        }
    } catch (e: any) {
        ui.showToast(extractErrorMessage(e, t('toolUsage.loadFailed')), 'error')
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
:deep(.tool-card.base-card) {
  padding: 0 !important;
}

.tool-usage-wrapper { padding: 6rem 1rem 2rem 1rem; }
.tool-header-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
}

.tool-header-search {
  flex: 1;
  min-width: 180px;
  max-width: 520px;
}

.tool-header-add-btn {
  white-space: nowrap;
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
    height: 260px;
    background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
    position: relative;
}
.tool-media {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.tool-video-wrap {
    width: 100%;
    height: 100%;
    position: relative;
}

.tool-play-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 52px;
    height: 52px;
    border-radius: 999px;
    background: rgba(94, 53, 177, 0.85);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    font-weight: 900;
    box-shadow: 0 10px 24px rgba(94, 53, 177, 0.25);
    cursor: pointer;
    user-select: none;
}

.tool-play-overlay:hover {
    background: rgba(94, 53, 177, 0.95);
}

.tool-duration {
    font-weight: 900;
    color: var(--primary);
}
.private-badge {
    position: absolute; top: 0.5rem; right: 0.5rem;
    background: rgba(0,0,0,0.6); color: white;
    padding: 0.25rem 0.6rem; border-radius: 1rem; font-size: 0.7rem;
}
.tool-info { padding: 0; flex: 1; display: flex; flex-direction: column; }

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
    margin-bottom: 0;
    width: fit-content;
}

/* 카테고리줄: 카테고리 + 수정버튼(우측 끝) */
.tool-category-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0;
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

.tool-footer--compact {
  border-top: none !important;
  /* 요청: 기존 여백의 1/2 */
  padding: 0.45rem 0.55rem 0.5rem 0.55rem !important;
  gap: 0 !important;
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

/* ── Tool card overlay (views/comments) ──────────────────────────────── */
.tool-overlay-bottom {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 1rem 1.1rem 1rem 1.1rem;
    background: rgba(20, 21, 26, 0.82);
    backdrop-filter: blur(6px);
    border-top-left-radius: 1rem;
    border-top-right-radius: 1rem;
}

.tool-overlay-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
}

.tool-overlay-title {
    margin: 0;
    color: #f9fafb;
    font-weight: 950;
    font-size: 1.25rem;
    line-height: 1.15;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.tool-overlay-kebab {
    width: 34px;
    height: 34px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.85);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    line-height: 1;
}

.tool-overlay-kebab:hover {
    background: rgba(0, 0, 0, 0.25);
    color: white;
}

.tool-overlay-divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.12);
    margin: 0.8rem 0;
}

.tool-overlay-stats-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: space-between;
}

.tool-overlay-stat {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8rem;
    font-weight: 900;
    color: rgba(255, 255, 255, 0.85);
    white-space: nowrap;
}

.tool-overlay-sep {
    opacity: 0.6;
    color: rgba(255, 255, 255, 0.8);
    font-weight: 900;
    user-select: none;
}

.tool-overlay-comments-btn {
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
    font: inherit;
}

.tool-overlay-comments-btn:hover .tool-overlay-stat-text {
    color: white;
}

.tool-overlay-stat-text {
    font-weight: 900;
}

.comments-modal {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    color: var(--text-main);
  }

.comments-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 0;
    max-height: 320px;
    overflow-y: auto;
    padding-right: 0.35rem;
}

.comment-item {
    padding: 0.75rem 0.85rem;
    border-radius: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.10);
    background: rgba(255, 255, 255, 0.04);
}

.comment-author {
    font-weight: 900;
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.85rem;
    margin-bottom: 0.25rem;
}

.comment-content {
    color: var(--text-muted);
    font-weight: 600;
    font-size: 0.9rem;
    white-space: pre-wrap;
}

.comment-form {
    display: flex;
    gap: 0.6rem;
    align-items: center;
    padding-top: 0.85rem;
    border-top: 1px solid rgba(255, 255, 255, 0.10);
}

.comment-input {
    flex: 1;
    padding: 0.75rem 0.85rem;
    border: 1px solid var(--border);
    border-radius: 0.6rem;
    background: rgba(255, 255, 255, 0.06);
    color: var(--text-main);
}

.comments-modal :deep(.empty-state) {
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px dashed rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.03);
}

.tool-eye-icon {
    font-size: 0.95rem;
}

.tool-comment-icon {
    font-size: 0.95rem;
}
</style>
