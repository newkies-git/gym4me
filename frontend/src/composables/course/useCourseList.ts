import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'
import { useUIStore } from '../../stores/uiStore'
import { useScheduleStore } from '../../stores/scheduleStore'
import {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  applyToCourse,
  cancelApplication,
  getCourseApplications,
  approveApplication,
  type CourseApplication
} from '../../services/courseService'
import { getGyms, getGymTraineesAndObservers } from '../../services/firebaseService'
import type { Course, Gym, TraineeInfo } from '../../types'

export function useCourseList() {
  const auth = useAuthStore()
  const ui = useUIStore()
  const scheduleStore = useScheduleStore()
  const { t } = useI18n()

  const loading = ref(true)
  const saving = ref(false)
  const courses = ref<Course[]>([])
  const selectedCourse = ref<Course | null>(null)
  const isDetailOpen = ref(false)
  const isCreateOpen = ref(false)
  const isEditOpen = ref(false)
  const editingCourse = ref<Course | null>(null)
  const applicationList = ref<CourseApplication[]>([])
  const gymsList = ref<Gym[]>([])
  const gymTraineesList = ref<TraineeInfo[]>([])
  const loadingGymTrainees = ref(false)

  const canManage = computed(() => auth.isTrainer || auth.isSupervisor)

  const form = ref({
    title: '',
    gymId: '' as string,
    dateStr: new Date().toISOString().split('T')[0],
    timeFrom: '09:00',
    timeTo: '10:00',
    type: '1:1' as Course['type'],
    maxParticipants: undefined as number | undefined,
    content: '',
    traineeEmails: [] as string[]
  })

  const hasApplied = computed(() => {
    if (!selectedCourse.value || !auth.user?.email) return false
    return applicationList.value.some((a) => a.traineeEmail === auth.user?.email)
  })

  function formatSchedule(c: Course) {
    return `${c.dateStr} ${c.timeFrom} ~ ${c.timeTo}`
  }

  function gymNameById(gymId: string) {
    return gymsList.value.find((g) => g.id === gymId)?.name ?? gymId
  }

  function formatType(type: Course['type']) {
    return type === '1:1' ? t('courses.type1to1') : type === '1:2' ? t('courses.type1to2') : t('courses.type1toN')
  }

  function formatDateTime(v: unknown) {
    if (!v) return '—'
    const d = (v as { toDate?: () => Date }).toDate ? (v as { toDate: () => Date }).toDate() : new Date(v as string | number)
    return d.toLocaleString()
  }

  async function loadCourses() {
    loading.value = true
    try {
      courses.value = await getCourses()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      ui.showToast(msg || 'Failed to load courses', 'error')
    } finally {
      loading.value = false
    }
  }

  function openDetail(course: Course) {
    selectedCourse.value = course
    applicationList.value = []
    isDetailOpen.value = true
    form.value.gymId = course.gymId || ''
    if (course.id) {
      getCourseApplications(course.id).then((list) => (applicationList.value = list))
    }
  }

  function openCreateModal() {
    form.value = {
      title: '',
      gymId: '',
      dateStr: new Date().toISOString().split('T')[0],
      timeFrom: '09:00',
      timeTo: '10:00',
      type: '1:1',
      maxParticipants: undefined,
      content: '',
      traineeEmails: []
    }
    isCreateOpen.value = true
  }

  function openEditModal(course: Course) {
    editingCourse.value = course
    form.value = {
      title: course.title,
      gymId: course.gymId || '',
      dateStr: course.dateStr,
      timeFrom: course.timeFrom,
      timeTo: course.timeTo,
      type: course.type,
      maxParticipants: course.maxParticipants,
      content: course.content,
      traineeEmails: [...(course.traineeEmails || [])]
    }
    isDetailOpen.value = false
    isEditOpen.value = true
  }

  async function submitCreate() {
    if (!auth.user?.email) return
    saving.value = true
    try {
      await createCourse({
        title: form.value.title.trim(),
        trainerEmail: auth.user.email,
        trainerNickname: auth.user.nickname,
        gymId: form.value.gymId || undefined,
        dateStr: form.value.dateStr,
        timeFrom: form.value.timeFrom,
        timeTo: form.value.timeTo,
        type: form.value.type,
        maxParticipants: form.value.type === '1:n' ? form.value.maxParticipants : undefined,
        content: form.value.content.trim(),
        traineeEmails: form.value.traineeEmails ?? [],
        applicationEmails: [],
        createdBy: auth.user.email,
        createdByName: auth.user.nickname
      })
      ui.showToast(t('courses.createSuccess'), 'success')
      isCreateOpen.value = false
      await loadCourses()
      if (auth.user?.email) await scheduleStore.fetchSchedules(auth.user.email, true)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      ui.showToast(msg || 'Failed to create course', 'error')
    } finally {
      saving.value = false
    }
  }

  async function submitEdit() {
    const id = editingCourse.value?.id
    if (!id) return
    saving.value = true
    try {
      await updateCourse(id, {
        title: form.value.title.trim(),
        gymId: form.value.gymId || undefined,
        dateStr: form.value.dateStr,
        timeFrom: form.value.timeFrom,
        timeTo: form.value.timeTo,
        type: form.value.type,
        maxParticipants: form.value.type === '1:n' ? form.value.maxParticipants : undefined,
        content: form.value.content.trim(),
        traineeEmails: form.value.traineeEmails ?? []
      })
      ui.showToast(t('courses.updateSuccess'), 'success')
      isEditOpen.value = false
      editingCourse.value = null
      await loadCourses()
      if (auth.user?.email) await scheduleStore.fetchSchedules(auth.user.email, true)
      if (selectedCourse.value?.id === id) {
        selectedCourse.value = courses.value.find((c) => c.id === id) || null
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      ui.showToast(msg || 'Failed to update course', 'error')
    } finally {
      saving.value = false
    }
  }

  async function confirmDelete(course: Course) {
    if (!confirm(t('courses.deleteConfirm'))) return
    try {
      await deleteCourse(course.id)
      ui.showToast(t('courses.deleteSuccess'), 'success')
      isDetailOpen.value = false
      selectedCourse.value = null
      await loadCourses()
      if (auth.user?.email) await scheduleStore.fetchSchedules(auth.user.email, true)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      ui.showToast(msg || 'Failed to delete course', 'error')
    }
  }

  async function doApply() {
    if (!selectedCourse.value?.id || !auth.user?.email) return
    try {
      await applyToCourse(selectedCourse.value.id, auth.user.email)
      ui.showToast(t('courses.applySuccess'), 'success')
      applicationList.value = await getCourseApplications(selectedCourse.value.id)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      ui.showToast(msg || 'Failed to apply', 'error')
    }
  }

  async function cancelApply() {
    if (!selectedCourse.value?.id || !auth.user?.email) return
    try {
      await cancelApplication(selectedCourse.value.id, auth.user.email)
      ui.showToast(t('courses.cancelApplySuccess'), 'success')
      applicationList.value = await getCourseApplications(selectedCourse.value.id)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      ui.showToast(msg || 'Failed to cancel', 'error')
    }
  }

  async function approveApp(app: CourseApplication) {
    if (!selectedCourse.value?.id) return
    try {
      await approveApplication(selectedCourse.value.id, app.id, app.traineeEmail)
      ui.showToast(t('courses.approveSuccess'), 'success')
      await loadCourses()
      applicationList.value = await getCourseApplications(selectedCourse.value.id)
      selectedCourse.value = courses.value.find((c) => c.id === selectedCourse.value?.id) || selectedCourse.value
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      ui.showToast(msg || 'Failed to approve', 'error')
    }
  }

  async function addTraineeToCourse(email: string) {
    if (!selectedCourse.value?.id) return
    const current = selectedCourse.value.traineeEmails || []
    if (current.includes(email)) return
    try {
      const updated = [...current, email]
      await updateCourse(selectedCourse.value.id, { traineeEmails: updated })
      ui.showToast(t('courses.updateSuccess'), 'success')
      await loadCourses()
      selectedCourse.value = courses.value.find((c) => c.id === selectedCourse.value?.id) || selectedCourse.value
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      ui.showToast(msg || 'Failed to update course', 'error')
    }
  }

  async function removeTraineeFromCourse(email: string) {
    if (!selectedCourse.value?.id) return
    const current = selectedCourse.value.traineeEmails || []
    if (!current.includes(email)) return
    try {
      const updated = current.filter((e) => e !== email)
      await updateCourse(selectedCourse.value.id, { traineeEmails: updated })
      ui.showToast(t('courses.updateSuccess'), 'success')
      await loadCourses()
      selectedCourse.value = courses.value.find((c) => c.id === selectedCourse.value?.id) || selectedCourse.value
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      ui.showToast(msg || 'Failed to update course', 'error')
    }
  }

  async function loadGyms() {
    try {
      gymsList.value = await getGyms()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      ui.showToast(msg || 'Failed to load gyms', 'error')
    }
  }

  watch(isDetailOpen, (open) => {
    if (open && selectedCourse.value?.id) {
      getCourseApplications(selectedCourse.value.id).then((list) => (applicationList.value = list))
    }
  })

  watch(
    () => form.value.gymId,
    async (gymId) => {
      if (!gymId) {
        gymTraineesList.value = []
        return
      }
      loadingGymTrainees.value = true
      try {
        gymTraineesList.value = await getGymTraineesAndObservers(gymId)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        ui.showToast(msg || 'Failed to load gym trainees', 'error')
        gymTraineesList.value = []
      } finally {
        loadingGymTrainees.value = false
      }
    },
    { immediate: true }
  )

  onMounted(async () => {
    await Promise.all([loadCourses(), loadGyms()])
  })

  return {
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
    loadCourses,
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
  }
}
