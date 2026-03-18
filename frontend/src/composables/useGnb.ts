import { ref, computed, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { getGymById } from '../services/firebaseService'

export function useGnb() {
  const auth = useAuthStore()
  const gymName = ref('')

  const gnbTitle = computed(() => {
    if (!auth.isAuthenticated) return 'gym4me'
    return gymName.value || 'gym4me'
  })

  const homePath = computed(() => {
    if (!auth.isAuthenticated) return '/'
    if (auth.isSupervisor) return '/manage-gym'
    if (auth.isSiteAdmin) return '/system/supervisors'
    return '/home'
  })

  async function loadGymName() {
    const id = auth.user?.gymId
    if (!id) {
      gymName.value = ''
      return
    }
    try {
      const gym = await getGymById(id)
      gymName.value = gym?.name ?? ''
    } catch {
      gymName.value = ''
    }
  }

  watch(() => auth.user?.gymId, loadGymName, { immediate: true })

  return { gnbTitle, homePath, loadGymName }
}
