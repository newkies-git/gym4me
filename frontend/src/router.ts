import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import AuthView from './views/AuthView.vue'
import { useAuthStore } from './stores/auth'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', component: HomeView },
        { path: '/auth', component: AuthView },
        {
            path: '/dashboard',
            component: () => import('./views/DashboardView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/calendar',
            component: () => import('./views/CalendarView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/profile',
            component: () => import('./views/BodyProfileView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/settings',
            component: () => import('./views/ProfileSettingsView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/manage-trainers',
            component: () => import('./views/TrainerManagement.vue'),
            meta: { requiresAuth: true, requiresManager: true }
        },
        {
            path: '/manage-gym',
            component: () => import('./views/GymManagement.vue'),
            meta: { requiresAuth: true, requiresManager: true }
        },
        {
            path: '/manage-managers',
            component: () => import('./views/ManagerManagement.vue'),
            meta: { requiresAuth: true, requiresSiteAdmin: true }
        },
        {
            path: '/trainer-profile',
            component: () => import('./views/TrainerProfileView.vue'),
            meta: { requiresAuth: true, requiresTrainer: true }
        }
    ]
})

router.beforeEach((to, from, next) => {
    const auth = useAuthStore()

    if (to.meta.requiresAuth && !auth.isAuthenticated) {
        next('/auth')
    } else if (to.meta.requiresSiteAdmin && !auth.isSiteAdmin) {
        next('/dashboard')
    } else if (to.meta.requiresManager && !auth.isManager) {
        next('/dashboard')
    } else if (to.meta.requiresTrainer && !auth.isTrainer) {
        next('/dashboard')
    } else if (to.path === '/auth' && auth.isAuthenticated) {
        next('/dashboard')
    } else {
        next()
    }
})

export default router
