<template>
  <div class="course-list-wrapper container">
    <PageHeader :title="t('courses.title')" :subtitle="t('courses.subtitle')">
      <template #actions>
        <button v-if="canManage" class="btn btn-primary" @click="openCreateModal">
          + {{ t('courses.addCourse') }}
        </button>
      </template>
    </PageHeader>

    <div v-if="loading" class="empty-state">{{ t('common.loading') }}</div>
    <div v-else-if="courses.length === 0" class="empty-state">{{ t('courses.noCourses') }}</div>
    <div v-else class="course-grid">
      <div
        v-for="course in courses"
        :key="course.id"
        class="course-card glass"
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
      </div>
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

          <div v-if="selectedCourse.traineeEmails?.length" class="course-detail-block">
            <h4 class="course-detail-block-title">{{ t('courses.trainees') }}</h4>
            <div class="course-detail-tags">
              <span v-for="email in selectedCourse.traineeEmails" :key="email" class="course-detail-tag">{{ email }}</span>
            </div>
          </div>

          <div v-if="canManage && applicationList.length" class="course-detail-block">
            <h4 class="course-detail-block-title">{{ t('courses.applications') }}</h4>
            <ul class="application-list">
              <li v-for="app in applicationList" :key="app.id" class="application-row">
                <span>{{ app.traineeEmail }}</span>
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
        <div class="field">
          <label>{{ t('courses.courseName') }} <span class="danger">*</span></label>
          <input v-model="form.title" type="text" required />
        </div>
        <div class="field">
          <label>{{ t('courses.gym') }}</label>
          <select v-model="form.gymId">
            <option value="">{{ t('courses.gymPlaceholder') }}</option>
            <option v-for="g in gymsList" :key="g.id" :value="g.id">{{ g.name }}</option>
          </select>
        </div>
        <div class="field row">
          <div class="half">
            <label>{{ t('courses.date') }} <span class="danger">*</span></label>
            <input v-model="form.dateStr" type="date" required />
          </div>
          <div class="half">
            <label>{{ t('courses.timeFrom') }} ~ {{ t('courses.timeTo') }}</label>
            <input v-model="form.timeFrom" type="time" /> <input v-model="form.timeTo" type="time" />
          </div>
        </div>
        <div class="field">
          <label>{{ t('courses.type') }}</label>
          <select v-model="form.type">
            <option value="1:1">{{ t('courses.type1to1') }}</option>
            <option value="1:2">{{ t('courses.type1to2') }}</option>
            <option value="1:n">{{ t('courses.type1toN') }}</option>
          </select>
          <input v-if="form.type === '1:n'" v-model.number="form.maxParticipants" type="number" min="1" :placeholder="t('courses.maxParticipants')" class="mt-1" />
        </div>
        <div class="field">
          <label>{{ t('courses.content') }}</label>
          <textarea v-model="form.content" rows="3"></textarea>
        </div>
        <div class="field">
          <label>{{ t('courses.trainees') }} ({{ t('courses.instructor') }} 지정)</label>
          <select
            v-model="form.traineeEmails"
            multiple
            class="trainee-select"
            :disabled="!form.gymId"
          >
            <option v-for="m in gymMembersList" :key="m.email" :value="m.email">
              {{ m.nickname || m.email }} ({{ m.email }})
            </option>
          </select>
          <p v-if="!form.gymId" class="field-hint">{{ t('courses.selectGymFirst') }}</p>
          <p v-else-if="loadingGymMembers" class="field-hint">{{ t('common.loading') }}...</p>
          <p v-else-if="form.gymId && !gymMembersList.length" class="field-hint">{{ t('courses.noGymMembers') }}</p>
        </div>
      </form>
      <template #footer>
        <button class="btn btn-ghost" @click="isCreateOpen = false">{{ t('common.cancel') }}</button>
        <button class="btn btn-primary" :disabled="saving" @click="submitCreate">{{ saving ? t('common.processing') : t('common.save') }}</button>
      </template>
    </BaseModal>

    <!-- 수정 모달 -->
    <BaseModal v-model:isOpen="isEditOpen" :title="t('courses.edit')" max-width="520px">
      <form v-if="editingCourse" @submit.prevent="submitEdit" class="course-form">
        <div class="field">
          <label>{{ t('courses.courseName') }} <span class="danger">*</span></label>
          <input v-model="form.title" type="text" required />
        </div>
        <div class="field">
          <label>{{ t('courses.gym') }}</label>
          <select v-model="form.gymId">
            <option value="">{{ t('courses.gymPlaceholder') }}</option>
            <option v-for="g in gymsList" :key="g.id" :value="g.id">{{ g.name }}</option>
          </select>
        </div>
        <div class="field row">
          <div class="half">
            <label>{{ t('courses.date') }} <span class="danger">*</span></label>
            <input v-model="form.dateStr" type="date" required />
          </div>
          <div class="half">
            <label>{{ t('courses.timeFrom') }} ~ {{ t('courses.timeTo') }}</label>
            <input v-model="form.timeFrom" type="time" /> <input v-model="form.timeTo" type="time" />
          </div>
        </div>
        <div class="field">
          <label>{{ t('courses.type') }}</label>
          <select v-model="form.type">
            <option value="1:1">{{ t('courses.type1to1') }}</option>
            <option value="1:2">{{ t('courses.type1to2') }}</option>
            <option value="1:n">{{ t('courses.type1toN') }}</option>
          </select>
          <input v-if="form.type === '1:n'" v-model.number="form.maxParticipants" type="number" min="1" :placeholder="t('courses.maxParticipants')" class="mt-1" />
        </div>
        <div class="field">
          <label>{{ t('courses.content') }}</label>
          <textarea v-model="form.content" rows="3"></textarea>
        </div>
        <div class="field">
          <label>{{ t('courses.trainees') }}</label>
          <select
            v-model="form.traineeEmails"
            multiple
            class="trainee-select"
            :disabled="!form.gymId"
          >
            <option v-for="m in gymMembersList" :key="m.email" :value="m.email">
              {{ m.nickname || m.email }} ({{ m.email }})
            </option>
          </select>
          <p v-if="!form.gymId" class="field-hint">{{ t('courses.selectGymFirst') }}</p>
          <p v-else-if="loadingGymMembers" class="field-hint">{{ t('common.loading') }}...</p>
          <p v-else-if="form.gymId && !gymMembersList.length" class="field-hint">{{ t('courses.noGymMembers') }}</p>
        </div>
      </form>
      <template #footer>
        <button class="btn btn-ghost" @click="isEditOpen = false">{{ t('common.cancel') }}</button>
        <button class="btn btn-primary" :disabled="saving" @click="submitEdit">{{ saving ? t('common.processing') : t('common.save') }}</button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PageHeader from '../components/ui/PageHeader.vue'
import BaseModal from '../components/ui/BaseModal.vue'
import { useCourseList } from '../composables/course/useCourseList'

const { t } = useI18n()

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
  gymMembersList,
  loadingGymMembers,
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
  approveApp
} = useCourseList()
</script>

<style scoped>
.course-list-wrapper {
  padding: 6rem 1rem 3rem 1rem;
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
  gap: 0.4rem;
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
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
}

.application-row:last-child {
  border-bottom: none;
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
  min-height: 120px;
  padding: 0.5rem;
}

.field-hint {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 0.35rem 0 0 0;
}
</style>
