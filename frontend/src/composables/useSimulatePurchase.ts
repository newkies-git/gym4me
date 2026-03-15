import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuthStore } from '../stores/auth'
import { useI18n } from 'vue-i18n'

export function useSimulatePurchase() {
  const auth = useAuthStore()
  const { t } = useI18n()

  return async function simulatePurchase() {
    if (!auth.user) return
    try {
      const userRef = doc(db, 'users', auth.user.uid)
      await updateDoc(userRef, {
        remainingSessions: 10,
        lvl: 5,
        role: 'MEMBER',
        updatedAt: serverTimestamp()
      })
      alert(t('dashboard.testPurchaseSuccess'))
      location.reload()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      alert(t('common.errorWithMessage', { msg }))
    }
  }
}
