import { ref, computed, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'
import { useUIStore } from '../../stores/uiStore'
import { appendClassWorkoutLog, updateSchedule, completeSession } from '../../services/firebaseService'
import { arrayUnion, doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { extractErrorMessage } from '../../utils/error'
import { notifyScheduleEvent } from '../../utils/notification'
import type { CalendarEvent, ExerciseRecord } from '../../types'

export interface UseEventDetailsOptions {
  onUpdated?: () => void
  onClose?: () => void
}

export function useEventDetails(
  eventRef: Ref<CalendarEvent | null>,
  options: UseEventDetailsOptions = {}
) {
  const { onUpdated, onClose } = options
  const auth = useAuthStore()
  const ui = useUIStore()
  const { t } = useI18n()

  const savingRecord = ref(false)
  const newRecordObj = ref<ExerciseRecord>({ name: '', sets: 0, reps: 0 })
  const applyingBulkLogs = ref(false)
  const approving = ref(false)
  const rejecting = ref(false)
  const isRejecting = ref(false)
  const rejectionReasonInput = ref('')
  const tempSignature = ref('')
  const completing = ref(false)
  const loadingClassInfo = ref(false)
  const classEmails = ref<string[]>([])

  const canAddRecord = computed(() => {
    const event = eventRef.value
    if (!event) return false
    if (event.type === 'PT') return auth.isTrainer
    return !auth.isTrainer
  })

  watch(
    eventRef,
    async (newEv) => {
      if (newEv?.targetType === 'CLASS' && newEv.classId) {
        loadingClassInfo.value = true
        try {
          const snap = await getDoc(doc(db, 'classes', newEv.classId))
          if (snap.exists()) {
            classEmails.value = snap.data().traineeEmails || []
          }
        } catch {
          ui.showToast(t('eventDetails.classLoadFailed'), 'error')
        } finally {
          loadingClassInfo.value = false
        }
      } else {
        classEmails.value = []
      }
    },
    { immediate: true }
  )

  async function saveRecord() {
    const event = eventRef.value
    if (!event || !newRecordObj.value.name) return
    savingRecord.value = true
    try {
      await updateSchedule(event.id, {
        records: arrayUnion({ ...newRecordObj.value })
      })
      newRecordObj.value = { name: '', sets: 0, reps: 0 }
      onUpdated?.()
    } catch (e: unknown) {
      ui.showToast(extractErrorMessage(e, t('eventDetails.recordSaveFailed')), 'error')
    } finally {
      savingRecord.value = false
    }
  }

  async function approveSession() {
    const event = eventRef.value
    if (!event) return
    approving.value = true
    try {
      await updateSchedule(event.id, { status: 'APPROVED' })
      await notifyScheduleEvent(
        t('notification.sessionApprovedTitle'),
        t('notification.sessionApprovedBody', { title: event.title })
      )
      ui.showToast(t('eventDetails.approveSuccess'), 'success')
      onUpdated?.()
    } catch (e: unknown) {
      ui.showToast(extractErrorMessage(e, t('eventDetails.approveFailed')), 'error')
    } finally {
      approving.value = false
    }
  }

  async function handleReject() {
    const event = eventRef.value
    if (!event || !rejectionReasonInput.value.trim()) return
    rejecting.value = true
    try {
      await updateSchedule(event.id, {
        status: 'REJECTED',
        rejectionReason: rejectionReasonInput.value.trim()
      })
      ui.showToast(t('calendar.rejected'), 'info')
      onUpdated?.()
      onClose?.()
    } catch (e: unknown) {
      ui.showToast(extractErrorMessage(e, t('common.errorWithMessage', { msg: '' })), 'error')
    } finally {
      rejecting.value = false
    }
  }

  async function handleSignAndComplete() {
    const event = eventRef.value
    if (!event || !tempSignature.value || !auth.user) return
    completing.value = true
    try {
      await completeSession(event.id, tempSignature.value, auth.user)
      ui.showToast(t('eventDetails.sessionCompleted'), 'success')
      await notifyScheduleEvent(
        t('notification.sessionCompletedTitle'),
        t('notification.sessionCompletedBody', { title: event.title })
      )
      onUpdated?.()
      onClose?.()
    } catch (e: unknown) {
      ui.showToast(extractErrorMessage(e, t('eventDetails.completeFailed')), 'error')
    } finally {
      completing.value = false
    }
  }

  async function applyLogsToClass() {
    const event = eventRef.value
    if (!event || !event.records || event.records.length === 0) return
    applyingBulkLogs.value = true
    try {
      await appendClassWorkoutLog(event, event.records)
      ui.showToast(t('eventDetails.bulkApplySuccess'), 'success')
    } catch (e: unknown) {
      ui.showToast(extractErrorMessage(e, t('eventDetails.bulkApplyFailed')), 'error')
    } finally {
      applyingBulkLogs.value = false
    }
  }

  return {
    canAddRecord,
    savingRecord,
    newRecordObj,
    applyingBulkLogs,
    approving,
    rejecting,
    isRejecting,
    rejectionReasonInput,
    tempSignature,
    completing,
    loadingClassInfo,
    classEmails,
    saveRecord,
    approveSession,
    handleReject,
    handleSignAndComplete,
    applyLogsToClass
  }
}
