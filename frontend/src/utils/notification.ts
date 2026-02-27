import { useUIStore } from '../stores/uiStore'

export const notifyScheduleEvent = async (title: string, body: string) => {
  const ui = useUIStore()
  ui.showToast(`${title}: ${body}`, 'info')

  if (typeof window === 'undefined' || !('Notification' in window)) return

  try {
    if (Notification.permission === 'granted') {
      new Notification(title, { body })
      return
    }
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        new Notification(title, { body })
      }
    }
  } catch {
    // Keep UX stable even when browser notification fails.
  }
}

