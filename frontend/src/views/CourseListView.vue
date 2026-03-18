<template>
  <div class="course-list-wrapper container">
    <PageHeader :title="t('courses.title')" :subtitle="t('courses.subtitle')" :showBack="true" back-url="/home" />

    <div class="course-header-actions" v-if="canManage">
      <button class="btn btn-primary" @click="openCreateModal">
        + {{ t('courses.addCourse') }}
      </button>
    </div>

    <div v-if="loading" class="empty-state">{{ t('common.loading') }}</div>
    <div v-else-if="courses.length === 0" class="empty-state">{{ t('courses.noCourses') }}</div>
    <div v-else class="course-grid">
      <BaseCard
        v-for="course in courses"
        :key="course.id"
        class="course-card"
        :clickable="true"
        @click="openDetail(course)"
      >
        <p class="course-card-line1">
          <span v-if="course.gymId" class="course-card-badge gym">{{ gymNameById(course.gymId) }}</span>
          <span v-else class="course-card-gym">—</span>
          <span class="course-card-title">{{ course.title }}</span>
        </p>
        <p class="course-card-line2">
          <span class="course-card-badge trainer">{{ course.trainerNickname || course.trainerEmail }}</span>
          <span class="course-card-schedule">{{ formatSchedule(course) }}</span>
          <span class="course-card-badge" :class="'type-' + course.type.replace(':', 'to')">
            {{ formatType(course.type) }}{{ course.maxParticipants != null ? ` (N=${course.maxParticipants})` : '' }}
          </span>
        </p>
      </BaseCard>
    </div>

    <!-- 상세 모달 -->
    <BaseModal v-model:isOpen="isDetailOpen" :title="selectedCourse?.title" max-width="520px">
      <template v-if="selectedCourse">
        <div class="course-detail-body">
          <div class="course-detail-meta">
            <span class="course-detail-chip trainer">{{ selectedCourse.trainerNickname || selectedCourse.trainerEmail }}</span>
            <span v-if="selectedCourse.gymId" class="course-detail-chip gym">{{ gymNameById(selectedCourse.gymId) }}</span>
            <span class="course-detail-chip schedule">{{ formatSchedule(selectedCourse) }}</span>
            <span class="course-detail-chip type" :class="'type-' + selectedCourse.type.replace(':', 'to')">
              {{ formatType(selectedCourse.type) }}{{ selectedCourse.maxParticipants != null ? ` (N=${selectedCourse.maxParticipants})` : '' }}
            </span>
          </div>

          <div v-if="selectedCourse.content" class="course-detail-block">
            <h4 class="course-detail-block-title">{{ t('courses.content') }}</h4>
            <p class="course-detail-content">{{ selectedCourse.content }}</p>
          </div>

          <p class="course-detail-registrant">
            {{ t('courses.registrant') }}: {{ selectedCourse.createdByName || selectedCourse.createdBy }} · {{ formatDateTime(selectedCourse.createdAt) }}
          </p>

          <div v-if="selectedCourse.traineeEmails?.length || (canManage && gymTraineesList.length)" class="course-detail-block">
            <h4 class="course-detail-block-title">{{ t('courses.trainees') }}</h4>
            <div v-if="selectedCourse.traineeEmails?.length" class="course-detail-tags">
              <template v-if="canManage">
                <div
                  v-for="(email, idx) in selectedCourse.traineeEmails"
                  :key="email"
                  class="course-detail-tag-row"
                >
                  <div class="course-detail-tag-pill" :title="email">
                    <span class="course-detail-tag-text">
                      {{ displayNameByEmail(email) }}
                    </span>
                    <button
                      type="button"
                      class="course-detail-tag-x"
                      :aria-label="t('courses.removeTrainee')"
                      :title="t('courses.removeTrainee')"
                      @click.stop="removeTraineeFromCourse(email)"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </template>
              <template v-else>
                <span
                  v-for="(email, idx) in selectedCourse.traineeEmails"
                  :key="email"
                  class="course-detail-tag"
                  :title="email"
                >
                  {{ displayNameByEmail(email) }}
                </span>
              </template>
            </div>
            <div v-if="canManage && availableTraineeOptions.length" class="course-detail-add-trainee">
              <BaseSelect
                v-model="traineeToAdd"
                :options="availableTraineeOptions.map(m => ({ value: m.email, label: `${m.nickname || m.email} (${m.email})` }))"
                :placeholder="t('courses.selectTraineeToAdd')"
              />
              <button
                type="button"
                class="btn btn-primary btn-sm"
                :disabled="!traineeToAdd"
                @click.stop="handleAddTrainee"
              >
                {{ t('courses.addTrainee') }}
              </button>
            </div>
          </div>

          <div v-if="canManage && applicationList.length" class="course-detail-block">
            <h4 class="course-detail-block-title">{{ t('courses.applications') }}</h4>
            <ul class="application-list">
              <li v-for="app in applicationList" :key="app.id" class="application-row">
                <span :title="app.traineeEmail">
                  {{ displayNameByEmail(app.traineeEmail) }}
                </span>
                <button type="button" class="btn btn-primary btn-sm" @click.stop="approveApp(app)">{{ t('courses.approve') }}</button>
              </li>
            </ul>
          </div>

          <div class="course-detail-actions">
            <template v-if="canManage">
              <button type="button" class="btn btn-primary" @click="openEditModal(selectedCourse)">{{ t('courses.edit') }}</button>
              <button type="button" class="btn btn-danger" @click="confirmDelete(selectedCourse)">{{ t('courses.delete') }}</button>
            </template>
            <template v-else>
              <button v-if="hasApplied" type="button" class="btn btn-ghost" @click="cancelApply">{{ t('courses.cancelApply') }}</button>
              <button v-else type="button" class="btn btn-primary" @click="doApply">{{ t('courses.apply') }}</button>
            </template>
            <button type="button" class="btn btn-ghost" @click="isDetailOpen = false">{{ t('courses.close') }}</button>
          </div>
        </div>
      </template>
      <template #footer></template>
    </BaseModal>

    <!-- 생성 모달 -->
    <BaseModal v-model:isOpen="isCreateOpen" :title="t('courses.addCourse')" max-width="520px">
      <form @submit.prevent="submitCreate" class="course-form">
        <BaseFormField :label="t('courses.courseName')" :required="true">
          <BaseTextField v-model="form.title" />
        </BaseFormField>
        <BaseFormField :label="t('courses.gym')">
          <BaseSelect
            v-model="form.gymId"
            :options="gymsList.map(g => ({ value: g.id, label: g.name }))"
            :placeholder="t('courses.gymPlaceholder')"
          />
        </BaseFormField>
        <div class="field date-time-row">
          <div class="third">
            <label>{{ t('courses.date') }} <span class="danger">*</span></label>
            <input v-model="form.dateStr" type="date" required />
          </div>
          <div class="third">
            <label>{{ t('courses.timeFrom') }}</label>
            <VueTimepicker v-model="form.timeFrom" format="HH:mm" :minute-interval="5" />
          </div>
          <div class="third">
            <label>{{ t('courses.timeTo') }}</label>
            <VueTimepicker v-model="form.timeTo" format="HH:mm" :minute-interval="5" />
          </div>
        </div>
        <BaseFormField :label="t('courses.type')">
          <BaseSelect
            v-model="form.type"
            :options="[
              { value: '1:1', label: t('courses.type1to1') },
              { value: '1:2', label: t('courses.type1to2') },
              { value: '1:n', label: t('courses.type1toN') }
            ]"
          />
          <BaseTextField
            v-if="form.type === '1:n'"
            v-model="form.maxParticipants"
            type="number"
            :placeholder="t('courses.maxParticipants')"
            class="mt-1"
          />
        </BaseFormField>
        <BaseFormField :label="t('courses.content')">
          <textarea v-model="form.content" rows="3" class="base-textarea"></textarea>
        </BaseFormField>
        <BaseFormField :label="`${t('courses.trainees')} (${t('courses.instructor')} 지정)`">
          <div class="chips-wrapper">
            <div v-if="form.traineeEmails.length" class="chip-list">
              <div
                v-for="email in form.traineeEmails"
                :key="email"
                class="chip-item"
              >
                <span class="chip-label">
                  {{ gymTraineesMap[email]?.nickname || email }} ({{ email }})
                </span>
                <button
                  type="button"
                  class="chip-remove"
                  @click="removeTraineeFromForm(email)"
                >
                  ×
                </button>
              </div>
            </div>
            <p v-else class="field-hint">{{ t('courses.noTraineesSelected') }}</p>

            <div class="chip-add-row">
              <BaseSelect
                v-model="formTraineeToAdd"
                :options="formAvailableTraineeOptions.map(m => ({ value: m.email, label: `${m.nickname || m.email} (${m.email})` }))"
                :placeholder="t('courses.selectTraineeToAdd')"
                :disabled="!form.gymId || formAvailableTraineeOptions.length === 0"
              />
              <button
                type="button"
                class="btn btn-primary btn-sm"
                :disabled="!formTraineeToAdd"
                @click="handleFormAddTrainee"
              >
                {{ t('courses.addTrainee') }}
              </button>
            </div>

            <p v-if="!form.gymId" class="field-hint">{{ t('courses.selectGymFirst') }}</p>
            <p v-else-if="loadingGymTrainees" class="field-hint">{{ t('common.loading') }}...</p>
            <p v-else-if="form.gymId && !gymTraineesList.length" class="field-hint">{{ t('courses.noGymTrainees') }}</p>
          </div>
        </BaseFormField>
      </form>
      <template #footer>
        <button class="btn btn-ghost" @click="isCreateOpen = false">{{ t('common.cancel') }}</button>
        <button class="btn btn-primary" :disabled="saving" @click="submitCreate">{{ saving ? t('common.processing') : t('common.save') }}</button>
      </template>
    </BaseModal>

    <!-- 수정 모달 -->
    <BaseModal v-model:isOpen="isEditOpen" :title="t('courses.edit')" max-width="520px">
      <form v-if="editingCourse" @submit.prevent="submitEdit" class="course-form">
        <BaseFormField :label="t('courses.courseName')" :required="true">
          <BaseTextField v-model="form.title" />
        </BaseFormField>
        <BaseFormField :label="t('courses.gym')">
          <BaseSelect
            v-model="form.gymId"
            :options="gymsList.map(g => ({ value: g.id, label: g.name }))"
            :placeholder="t('courses.gymPlaceholder')"
          />
        </BaseFormField>
        <div class="field date-time-row">
          <div class="third">
            <label>{{ t('courses.date') }} <span class="danger">*</span></label>
            <input v-model="form.dateStr" type="date" required />
          </div>
          <div class="third">
            <label>{{ t('courses.timeFrom') }}</label>
            <VueTimepicker v-model="form.timeFrom" format="HH:mm" :minute-interval="5" />
          </div>
          <div class="third">
            <label>{{ t('courses.timeTo') }}</label>
            <VueTimepicker v-model="form.timeTo" format="HH:mm" :minute-interval="5" />
          </div>
        </div>
        <BaseFormField :label="t('courses.type')">
          <BaseSelect
            v-model="form.type"
            :options="[
              { value: '1:1', label: t('courses.type1to1') },
              { value: '1:2', label: t('courses.type1to2') },
              { value: '1:n', label: t('courses.type1toN') }
            ]"
          />
          <BaseTextField
            v-if="form.type === '1:n'"
            v-model="form.maxParticipants"
            type="number"
            :placeholder="t('courses.maxParticipants')"
            class="mt-1"
          />
        </BaseFormField>
        <BaseFormField :label="t('courses.content')">
          <textarea v-model="form.content" rows="3" class="base-textarea"></textarea>
        </BaseFormField>
        <BaseFormField :label="t('courses.trainees')">
          <div class="chips-wrapper">
            <div v-if="form.traineeEmails.length" class="chip-list">
              <div
                v-for="email in form.traineeEmails"
                :key="email"
                class="chip-item"
              >
                <span class="chip-label">
                  {{ gymTraineesMap[email]?.nickname || email }} ({{ email }})
                </span>
                <button
                  type="button"
                  class="chip-remove"
                  @click="removeTraineeFromForm(email)"
                >
                  ×
                </button>
              </div>
            </div>
            <p v-else class="field-hint">{{ t('courses.noTraineesSelected') }}</p>

            <div class="chip-add-row">
              <BaseSelect
                v-model="formTraineeToAdd"
                :options="formAvailableTraineeOptions.map(m => ({ value: m.email, label: `${m.nickname || m.email} (${m.email})` }))"
                :placeholder="t('courses.selectTraineeToAdd')"
                :disabled="!form.gymId || formAvailableTraineeOptions.length === 0"
              />
              <button
                type="button"
                class="btn btn-primary btn-sm"
                :disabled="!formTraineeToAdd"
                @click="handleFormAddTrainee"
              >
                {{ t('courses.addTrainee') }}
              </button>
            </div>

            <p v-if="!form.gymId" class="field-hint">{{ t('courses.selectGymFirst') }}</p>
            <p v-else-if="loadingGymTrainees" class="field-hint">{{ t('common.loading') }}...</p>
            <p v-else-if="form.gymId && !gymTraineesList.length" class="field-hint">{{ t('courses.noGymTrainees') }}</p>
          </div>
        </BaseFormField>
      </form>
      <template #footer>
        <button class="btn btn-ghost" @click="isEditOpen = false">{{ t('common.cancel') }}</button>
        <button class="btn btn-primary" :disabled="saving" @click="submitEdit">{{ saving ? t('common.processing') : t('common.save') }}</button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import VueTimepicker from 'vue3-timepicker'
import 'vue3-timepicker/dist/VueTimepicker.css'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '../components/ui/PageHeader.vue'
import BaseModal from '../components/ui/BaseModal.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseFormField from '../components/ui/BaseFormField.vue'
import BaseTextField from '../components/ui/BaseTextField.vue'
import BaseSelect from '../components/ui/BaseSelect.vue'
import { useCourseList } from '../composables/course/useCourseList'
import { searchUserByEmail } from '../services/firebaseService'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const {
  loading,
  saving,
  courses,
  selectedCourse,
  isDetailOpen,
  isCreateOpen,
  isEditOpen,
  editingCourse,
  applicationList,
  gymsList,
  gymTraineesList,
  loadingGymTrainees,
  form,
  canManage,
  hasApplied,
  formatSchedule,
  gymNameById,
  formatType,
  formatDateTime,
  openDetail,
  openCreateModal,
  openEditModal,
  submitCreate,
  submitEdit,
  confirmDelete,
  doApply,
  cancelApply,
  approveApp,
  addTraineeToCourse,
  removeTraineeFromCourse
} = useCourseList()

const traineeToAdd = ref('')
const formTraineeToAdd = ref('')

const gymTraineesMap = computed(() =>
  gymTraineesList.value.reduce<Record<string, { nickname?: string }>>((acc, m) => {
    acc[m.email] = { nickname: m.nickname }
    return acc
  }, {})
)

const extraUserMap = ref<Record<string, { nickname?: string; name?: string }>>({})

const ensureProfilesByEmails = async (emails: string[]) => {
  const unique = Array.from(new Set(emails.filter(Boolean)))
  const missing = unique.filter((email) => !gymTraineesMap.value[email]?.nickname && !extraUserMap.value[email])
  if (missing.length === 0) return

  const results = await Promise.allSettled(missing.map((email) => searchUserByEmail(email)))
  const next = { ...extraUserMap.value }
  results.forEach((res, idx) => {
    const email = missing[idx]
    if (res.status !== 'fulfilled') return
    const data = res.value?.data
    if (!data) return
    next[email] = {
      nickname: typeof data.nickname === 'string' ? data.nickname : undefined,
      name: typeof data.name === 'string' ? data.name : undefined
    }
  })
  extraUserMap.value = next
}

const displayNameByEmail = (email: string) => {
  const nickname = gymTraineesMap.value[email]?.nickname
  if (nickname && nickname.trim()) return nickname
  const extraNickname = extraUserMap.value[email]?.nickname
  if (extraNickname && extraNickname.trim()) return extraNickname
  const extraName = extraUserMap.value[email]?.name
  if (extraName && extraName.trim()) return extraName
  return email
}

const availableTraineeOptions = computed(() => {
  if (!selectedCourse.value) return []
  const current = selectedCourse.value.traineeEmails || []
  return gymTraineesList.value.filter((m) => !current.includes(m.email))
})

const formAvailableTraineeOptions = computed(() => {
  const current = form.value.traineeEmails || []
  return gymTraineesList.value.filter((m) => !current.includes(m.email))
})

const handleAddTrainee = async () => {
  if (!traineeToAdd.value) return
  await addTraineeToCourse(traineeToAdd.value)
  traineeToAdd.value = ''
}

const handleFormAddTrainee = () => {
  if (!formTraineeToAdd.value) return
  if (!form.value.traineeEmails.includes(formTraineeToAdd.value)) {
    form.value.traineeEmails = [...form.value.traineeEmails, formTraineeToAdd.value]
  }
  formTraineeToAdd.value = ''
}

const removeTraineeFromForm = (email: string) => {
  form.value.traineeEmails = form.value.traineeEmails.filter((e) => e !== email)
}

watch(
  () => [isDetailOpen.value, selectedCourse.value?.traineeEmails, applicationList.value.map((a) => a.traineeEmail)] as const,
  ([open]) => {
    if (!open) return
    const emails = [
      ...((selectedCourse.value?.traineeEmails || []) as string[]),
      ...(applicationList.value.map((a) => a.traineeEmail) as string[])
    ]
    void ensureProfilesByEmails(emails)
  },
  { deep: true }
)

onMounted(() => {
  if (route.query.create === '1') {
    openCreateModal()

    const { create, ...rest } = route.query
    router.replace({ query: rest })
  }
})
</script>

<style scoped>
.course-list-wrapper {
  padding: 6rem 1rem 3rem 1rem;
}

.course-header-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
}

.course-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.25rem;
}

.course-card {
  padding: 1.25rem 1.25rem 1.25rem 1.5rem;
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border-left: 3px solid var(--primary);
}

.course-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(94, 53, 177, 0.12);
}

.course-card-line1 {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
  color: var(--text-main);
}

.course-card-line1 .course-card-gym {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-muted);
}

.course-card-line1 .course-card-title {
  font-weight: 700;
  color: var(--primary);
}

/* 직원 관리 페이지와 동일한 칩 스타일 */
.course-card-badge {
  font-size: 0.7rem;
  padding: 0.08rem 0.5rem;
  border-radius: 100px;
  font-weight: 700;
}

.course-card-badge.gym {
  color: #475569;
  background: #f1f5f9;
}

.course-card-badge.trainer {
  color: #8b5cf6;
  background: #ede9fe;
}

.course-card-badge.type-1to1 {
  color: #0369a1;
  background: #e0f2fe;
}

.course-card-badge.type-1to2 {
  color: #c2410c;
  background: #ffedd5;
}

.course-card-badge.type-1ton {
  color: #7c3aed;
  background: #ede9fe;
}

.course-card-schedule {
  color: var(--text-muted);
}

.course-card-line2 {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.5;
}

.empty-state {
  padding: 2rem 1rem;
  text-align: center;
  color: var(--text-muted);
  font-style: italic;
}

/* 강좌 상세 모달 */
.course-detail-body {
  padding: 0.25rem 0;
  max-height: 72vh;
  overflow: auto;
  padding-right: 0.25rem;
}

.course-detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border);
}

.course-detail-chip {
  font-size: 0.75rem;
  padding: 0.25rem 0.6rem;
  border-radius: 100px;
  font-weight: 600;
}

.course-detail-chip.trainer {
  color: #8b5cf6;
  background: #ede9fe;
}

.course-detail-chip.gym {
  color: #475569;
  background: #f1f5f9;
}

.course-detail-chip.schedule {
  color: #0369a1;
  background: #e0f2fe;
}

.course-detail-chip.type.type-1to1 { color: #0369a1; background: #e0f2fe; }
.course-detail-chip.type.type-1to2 { color: #c2410c; background: #ffedd5; }
.course-detail-chip.type.type-1ton { color: #7c3aed; background: #ede9fe; }

.course-detail-block {
  margin-bottom: 1.25rem;
  padding: 1rem 1.25rem;
  background: var(--bg-dark);
  border-radius: 12px;
  border: 1px solid var(--border);
}

.course-detail-block-title {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-main);
}

.course-detail-content {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
  white-space: pre-wrap;
  color: var(--text-main);
}

.course-detail-registrant {
  margin: 0 0 1.25rem 0;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.course-detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 0.5rem;
}

.course-detail-tag {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  background: #ede9fe;
  color: var(--primary);
  border-radius: 100px;
  font-weight: 600;
}

.course-detail-tag-row {
  display: contents;
}

.course-detail-tag-row .course-detail-tag {
  background: #ede9fe;
  color: #8b5cf6;
  border: 1px solid rgba(139, 92, 246, 0.25);
  padding: 0.45rem 0.95rem;
  border-radius: 999px;
  font-weight: 800;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.course-detail-tag-row .btn-sm {
  height: 2.25rem;
  padding: 0 0.8rem;
  border-radius: 999px;
}

.course-detail-tag-row .btn-icon {
  width: 2.25rem;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  line-height: 1;
  border-radius: 999px;
  background: #efe8ff;
  color: #6d28d9;
  border: 1px solid rgba(109, 40, 217, 0.18);
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
}

.course-detail-tag-row .btn-icon:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(109, 40, 217, 0.18);
  background: #e9ddff;
}

.course-detail-tag-row .btn-icon:active {
  transform: translateY(0);
}

.course-detail-tag-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #ede9fe;
  color: #8b5cf6;
  border: 1px solid rgba(139, 92, 246, 0.25);
  padding: 0.45rem 0.55rem 0.45rem 0.95rem;
  border-radius: 999px;
  font-weight: 800;
  max-width: 100%;
}

.course-detail-tag-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.course-detail-tag-x {
  width: 1.9rem;
  height: 1.9rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid rgba(109, 40, 217, 0.18);
  background: rgba(255, 255, 255, 0.6);
  color: #6d28d9;
  font-size: 1.05rem;
  line-height: 1;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
}

.course-detail-tag-x:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(109, 40, 217, 0.16);
  background: rgba(255, 255, 255, 0.85);
}

.course-detail-tag-x:active {
  transform: translateY(0);
}

.course-detail-add-trainee {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
  align-items: center;
}

.application-list {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 0 0;
}

.application-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.55rem 0.75rem;
  border-radius: 0.75rem;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.65);
  margin-bottom: 0.5rem;
}

.application-row:last-child {
  margin-bottom: 0;
}

.application-row span {
  font-weight: 700;
  color: var(--text-main);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.course-detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}

.detail-section {
  margin-bottom: 1rem;
}

.detail-section p {
  margin: 0.35rem 0;
}

.trainee-list {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 0 0;
}

.course-form .field {
  margin-bottom: 1rem;
}

.course-form .row {
  display: flex;
  gap: 1rem;
}

.course-form .half {
  flex: 1;
}
.date-time-row {
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
  flex-wrap: nowrap;
}

.date-time-row .third {
  flex: 1 1 0;
}


.mt-1 {
  margin-top: 0.5rem;
}

.sm-text {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.danger {
  color: var(--accent);
}

.trainee-select {
  width: 100%;
  padding: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  background-color: var(--bg-input, #fff);
}

.field-hint {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 0.35rem 0 0 0;
}

.chips-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.chip-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  background: rgba(129, 140, 248, 0.12);
  color: var(--primary);
  font-size: 0.8rem;
  border: 1px solid rgba(129, 140, 248, 0.25);
}

.chip-label {
  white-space: nowrap;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chip-remove {
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 0.9rem;
  line-height: 1;
  padding: 0;
  opacity: 0.8;
}

.chip-add-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.chip-add-row .btn-sm {
  height: 2.9rem;
  display: inline-flex;
  align-items: center;
}

/* 폼 내 인풋/셀렉트/텍스트area 공통 높이 및 스타일 */
.course-form input[type='text'],
.course-form input[type='date'],
.course-form input[type='time'],
.course-form input[type='number'],
.course-form select,
.course-form textarea {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  font-size: 0.9rem;
  box-sizing: border-box;
}

.course-form textarea {
  min-height: 96px;
  resize: vertical;
}

.base-textarea {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  font-size: 0.9rem;
  box-sizing: border-box;
  min-height: 96px;
  resize: vertical;
}

/* 날짜 + 시간 필드 배치 개선 */
.course-form .row .half input[type='date'],
.course-form .row .half input[type='time'] {
  width: 100%;
}

@media (max-width: 768px) {
  .course-form .row {
    flex-direction: column;
  }
}

@media (max-width: 640px) {
  .chip-label {
    max-width: 160px;
  }

  .chip-add-row {
    flex-direction: column;
    align-items: stretch;
  }

  .chip-add-row .btn-sm {
    width: 100%;
    justify-content: center;
  }

  .course-detail-add-trainee {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
