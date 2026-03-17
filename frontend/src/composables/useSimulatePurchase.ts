import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuthStore } from '../stores/auth'
import { useI18n } from 'vue-i18n'
import { addTicketCredit } from '../services/firebaseService'

export function useSimulatePurchase() {
  const auth = useAuthStore()
  const { t } = useI18n()

  return async function simulatePurchase() {
    if (!auth.user) return
    try {
      const uid = auth.user.uid
      const email = auth.user.email || ''

      // 1) Add 1 trial PT via shared addTicketCredit (logs history)
      const today = new Date()
      const purchaseDate = today.toISOString().slice(0, 10)
      const expiration = new Date(today)
      expiration.setMonth(expiration.getMonth() + 1)
      const expirationDate = expiration.toISOString().slice(0, 10)

      await addTicketCredit(uid, {
        amount: 1,
        purchaseDate,
        expirationDate,
        registrantEmail: email
      })

      // 2) Promote observer -> member for full feature access
      const userRef = doc(db, 'users', uid)
      await updateDoc(userRef, {
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
