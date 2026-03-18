import type { RouteRecordRaw } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import AuthView from '../views/AuthView.vue'

export const routes: RouteRecordRaw[] = [
  { path: '/', component: HomeView },
  { path: '/auth', component: AuthView },
  {
    path: '/terms',
    component: () => import('../views/profile/TermsView.vue')
  },
  {
    path: '/privacy',
    component: () => import('../views/profile/PrivacyView.vue')
  },
  {
    path: '/complete-profile',
    component: () => import('../views/CompleteProfileView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/home',
    component: () => import('../views/DashboardView.vue'),
    meta: { requiresAuth: true }
  },
  { path: '/dashboard', redirect: '/home' },
  {
    path: '/calendar',
    component: () => import('../views/CalendarView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    component: () => import('../views/BodyProfileView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/user-info',
    component: () => import('../views/UserInfoView.vue'),
    meta: { requiresAuth: true }
  },
  { path: '/settings', redirect: '/user-info' },
  {
    path: '/manage-trainers',
    component: () => import('../views/TrainerManagement.vue'),
    meta: { requiresAuth: true, requiresManager: true }
  },
  { path: '/manager/trainers', redirect: '/manage-trainers' },
  {
    path: '/manage-gym',
    component: () => import('../views/GymManagement.vue'),
    meta: { requiresAuth: true, requiresManager: true, requiresSiteAdmin: false }
  },
  { path: '/manager/gym', redirect: '/manage-gym' },
  {
    path: '/admin',
    component: () => import('../layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, requiresSupervisor: true },
    children: [
      { path: '', redirect: '/admin/managers' },
      {
        path: 'managers',
        component: () => import('../views/ManagerManagement.vue')
      },
      {
        path: 'staff',
        component: () => import('../views/StaffManagement.vue')
      }
    ]
  },
  {
    path: '/system/supervisors',
    name: 'SystemSupervisors',
    component: () => import('../views/SystemSupervisorView.vue'),
    meta: { requiresAuth: true, requiresSiteAdmin: true }
  },
  { path: '/manage-managers', redirect: '/admin/managers' },
  {
    path: '/trainer-profile',
    component: () => import('../views/TrainerProfileView.vue'),
    meta: { requiresAuth: true, requiresTrainer: true }
  },
  {
    path: '/courses',
    component: () => import('../views/CourseListView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/tool-usage',
    component: () => import('../views/ToolUsageView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/gym/trainees',
    component: () => import('../views/GymTraineeView.vue'),
    meta: { requiresAuth: true, requiresManager: true }
  },
  { path: '/gym/members', redirect: '/gym/trainees' }
]
