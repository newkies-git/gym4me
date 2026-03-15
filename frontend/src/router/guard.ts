import type { Router } from 'vue-router'
import { useAuthStore } from '../stores/auth'

export function setupRouterGuard(router: Router): void {
  router.beforeEach((to, _from, next) => {
    const auth = useAuthStore()

    if (to.meta.requiresAuth && !auth.isAuthenticated) {
      next('/auth')
      return
    }
    if (auth.isAuthenticated && auth.user?.mustChangePassword && to.path !== '/user-info') {
      next('/user-info')
      return
    }
    if (
      auth.isAuthenticated &&
      auth.needsMemberProfile &&
      to.path !== '/complete-profile' &&
      to.path !== '/auth'
    ) {
      next('/complete-profile')
      return
    }
    if (to.path === '/complete-profile' && auth.isAuthenticated && !auth.needsMemberProfile) {
      next('/home')
      return
    }
    if (to.meta.requiresSiteAdmin && !auth.isSiteAdmin) {
      next('/home')
      return
    }
    if (to.meta.requiresManager && !auth.isManager && !auth.isSiteAdmin) {
      next('/home')
      return
    }
    if (to.meta.requiresTrainer && !auth.isTrainer) {
      next('/home')
      return
    }
    if (to.path === '/auth' && auth.isAuthenticated) {
      next('/home')
      return
    }
    // 로그인된 사용자가 루트(/) 접근 시 권한에 맞는 홈(대시보드)으로
    if (to.path === '/' && auth.isAuthenticated) {
      next('/home')
      return
    }
    next()
  })
}
