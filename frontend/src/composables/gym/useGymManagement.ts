import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'
import { useUIStore } from '../../stores/uiStore'
import {
  getGyms,
  createGym,
  updateGym,
  deleteGym,
  getGymTrainees,
  getTrainers,
  getTrainerProfile
} from '../../services/firebaseService'
import type { Gym, TrainerProfile, TraineeInfo } from '../../types'

/** getTrainers() 등에서 오는 목록 아이템 (raw + data 래핑 혼재) */
export interface GymTrainerListItem {
  id?: string
  uid?: string
  nickname?: string
  email?: string
  role?: string
  lvl?: number
  profileImageUrl?: string
  name?: string
  data?: { nickname?: string; email?: string; role?: string; lvl?: number }
}

export function useGymManagement() {
  const auth = useAuthStore()
  const ui = useUIStore()
  const { t } = useI18n()

  const loading = ref(true)
  const gym = ref<Gym | null>(null)
  const gymsList = ref<Gym[]>([])
  const traineesMap = ref<Record<string, TraineeInfo[]>>({})
  const trainersMap = ref<Record<string, GymTrainerListItem[]>>({})

  const isTrainersModalOpen = ref(false)
  const selectedGymTrainers = ref<GymTrainerListItem[]>([])

  const showProfileModal = ref(false)
  const viewingStaff = ref<GymTrainerListItem | null>(null)
  const viewingTrainerProfile = ref<TrainerProfile | null>(null)
  const loadingTrainerProfile = ref(false)

  const newGym = reactive({ name: '', location: '' })

  const isModalOpen = ref(false)
  const isEditing = ref(false)
  const saving = ref(false)
  const modalGym = reactive({
    id: '',
    name: '',
    location: '',
    phone: '',
    openDate: '',
    notes: '',
    managerEmail: ''
  })

  function normalizeOpenDate(input: unknown): string {
    if (!input) return ''
    if (typeof input === 'string') return input
    // Firestore Timestamp / Date 변환 대응
    const maybeTs = input as any
    if (maybeTs?.toDate && typeof maybeTs.toDate === 'function') {
      const d = maybeTs.toDate() as Date
      if (d instanceof Date && !Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
    }
    if (input instanceof Date && !Number.isNaN(input.getTime())) return input.toISOString().slice(0, 10)
    return ''
  }

  async function fetchGymsData() {
    loading.value = true
    try {
      const gyms = await getGyms()
      gymsList.value = gyms
      gym.value = gyms.find((g) => g.id === auth.user?.gymId) || null

      const gymsToCount = auth.isSiteAdmin ? gymsList.value : gym.value ? [gym.value] : []
      for (const g of gymsToCount) {
        if (!g.id) continue
        const [trainees, trainers] = await Promise.all([
          getGymTrainees(g.id),
          getTrainers(g.id)
        ])
        traineesMap.value[g.id] = trainees
        trainersMap.value[g.id] = trainers
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      ui.showToast(t('gymMgt.loadError') + ': ' + msg, 'error')
    } finally {
      loading.value = false
    }
  }

  function openCreateModal() {
    isEditing.value = false
    modalGym.id = ''
    modalGym.name = ''
    modalGym.location = ''
    modalGym.phone = ''
    modalGym.openDate = ''
    modalGym.notes = ''
    modalGym.managerEmail = auth.isSiteAdmin ? '' : (auth.user?.email || '')
    isModalOpen.value = true
  }

  function openTrainersModal(gymId: string) {
    selectedGymTrainers.value = trainersMap.value[gymId] || []
    isTrainersModalOpen.value = true
  }

  async function openProfileModal(staff: GymTrainerListItem) {
    const staffData = staff.data ?? staff
    viewingStaff.value = staffData as GymTrainerListItem
    viewingTrainerProfile.value = null
    showProfileModal.value = true

    const email = (staffData as { email?: string }).email
    if (email) {
      loadingTrainerProfile.value = true
      try {
        viewingTrainerProfile.value = await getTrainerProfile(email)
      } catch {
        console.warn('Failed to load trainer profile')
      } finally {
        loadingTrainerProfile.value = false
      }
    }
  }

  function openEditModal(g: Gym) {
    isEditing.value = true
    modalGym.id = g.id || ''
    modalGym.name = g.name || ''
    modalGym.location = g.location || ''
    modalGym.phone = g.phone || ''
    modalGym.openDate = normalizeOpenDate(g.openDate)
    modalGym.notes = g.notes || ''
    modalGym.managerEmail = g.managerEmail || ''
    isModalOpen.value = true
  }

  async function handleSaveGym() {
    if (!modalGym.name) return
    saving.value = true
    const payload: Partial<Gym> = {
      name: modalGym.name,
      location: modalGym.location || undefined,
      phone: modalGym.phone || undefined,
      notes: modalGym.notes || undefined,
      managerEmail: modalGym.managerEmail
    }
    // 빈 문자열은 Firestore에 그대로 쓰지 않도록 조건부로 포함
    if (modalGym.openDate) payload.openDate = modalGym.openDate
    try {
      if (isEditing.value && modalGym.id) {
        await updateGym(modalGym.id, payload)
        ui.showToast(t('gymMgt.saveSuccess'), 'success')
      } else {
        await createGym(payload)
        ui.showToast(t('gymMgt.createSuccess'), 'success')
      }
      isModalOpen.value = false
      await fetchGymsData()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      ui.showToast(t('gymMgt.createError') + ': ' + msg, 'error')
    } finally {
      saving.value = false
    }
  }

  async function handleDeleteGym(g: Gym) {
    if (!g.id) return
    if (!confirm(t('gymMgt.confirmDelete'))) return
    try {
      await deleteGym(g.id)
      ui.showToast(t('gymMgt.deleteSuccess'), 'success')
      await fetchGymsData()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      ui.showToast(t('gymMgt.deleteError') + ': ' + msg, 'error')
    }
  }

  async function handleCreateGym() {
    if (!newGym.name) return
    loading.value = true
    try {
      await createGym({
        name: newGym.name,
        location: newGym.location,
        managerEmail: auth.user?.email || '',
        // 매니저 생성 시, email 매칭 실패해도 uid로 사용자 role/gymId를 확실히 연결하기 위함
        managerUid: auth.user?.uid
      })
      ui.showToast(t('gymMgt.createSuccess'), 'success')
      location.reload()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      ui.showToast(t('gymMgt.createError') + ': ' + msg, 'error')
    } finally {
      loading.value = false
    }
  }

  function closeProfileModal() {
    showProfileModal.value = false
  }

  onMounted(fetchGymsData)

  return {
    loading,
    gym,
    gymsList,
    traineesMap,
    trainersMap,
    isModalOpen,
    isEditing,
    modalGym,
    saving,
    isTrainersModalOpen,
    selectedGymTrainers,
    showProfileModal,
    viewingStaff,
    viewingTrainerProfile,
    loadingTrainerProfile,
    newGym,
    fetchGymsData,
    openCreateModal,
    openEditModal,
    openTrainersModal,
    openProfileModal,
    handleSaveGym,
    handleDeleteGym,
    handleCreateGym,
    closeProfileModal
  }
}
