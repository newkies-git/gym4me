import { defineStore } from 'pinia'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
    id: string
    message: string
    type: ToastType
    duration?: number
}

export const useUIStore = defineStore('ui', {
    state: () => ({
        toasts: [] as Toast[],
        loading: false
    }),
    actions: {
        showToast(message: string, type: ToastType = 'info', duration = 3000) {
            const id = Date.now().toString()
            this.toasts.push({ id, message, type, duration })

            if (duration > 0) {
                setTimeout(() => {
                    this.removeToast(id)
                }, duration)
            }
        },
        removeToast(id: string) {
            this.toasts = this.toasts.filter(t => t.id !== id)
        },
        setLoading(status: boolean) {
            this.loading = status
        }
    }
})
