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
            path: '/user-info',
            component: () => import('./views/UserInfoView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/settings',
            redirect: '/user-info'
        },
        {
            path: '/manage-trainers',
            component: () => import('./views/TrainerManagement.vue'),
            meta: { requiresAuth: true, requiresManager: true }
        },
        {
            path: '/manager/trainers',
            redirect: '/manage-trainers'
        },
        {
            path: '/manage-gym',
            component: () => import('./views/GymManagement.vue'),
            meta: { requiresAuth: true, requiresManager: true, requiresSiteAdmin: false }
        },
        {
            path: '/manager/gym',
            redirect: '/manage-gym'
        },
        {
            path: '/admin',
            component: () => import('./layouts/AdminLayout.vue'),
            meta: { requiresAuth: true, requiresSiteAdmin: true },
            children: [
                {
                    path: '',
                    redirect: '/admin/managers'
                },
                {
                    path: 'managers',
                    component: () => import('./views/ManagerManagement.vue')
                },
                {
                    path: 'staff',
                    component: () => import('./views/StaffManagement.vue')
                }
            ]
        },
        {
            path: '/manage-managers',
            redirect: '/admin/managers'
        },
        {
            path: '/trainer-profile',
            component: () => import('./views/TrainerProfileView.vue'),
            meta: { requiresAuth: true, requiresTrainer: true }
        },
        {
            path: '/tool-usage',
            component: () => import('./views/ToolUsageView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/gym/members',
            component: () => import('./views/GymMemberView.vue'),
            meta: { requiresAuth: true, requiresManager: true }
        }
    ]
})

router.beforeEach((to, from, next) => {
    const auth = useAuthStore()

    if (to.meta.requiresAuth && !auth.isAuthenticated) {
        next('/auth')
    } else if (auth.isAuthenticated && auth.user?.mustChangePassword && to.path !== '/user-info') {
        next('/user-info')
    } else if (to.meta.requiresSiteAdmin && !auth.isSiteAdmin) {
        next('/dashboard')
    } else if (to.meta.requiresManager && !auth.isManager && !auth.isSiteAdmin) {
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
