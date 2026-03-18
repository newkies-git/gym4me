import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import i18n from '../../i18n'

const pushMock = vi.fn()
const signInMock = vi.fn()
const createUserMock = vi.fn()
const setDocMock = vi.fn()
const docMock = vi.fn()
const getDocMock = vi.fn()
const updateDocMock = vi.fn()
const serverTimestampMock = vi.fn(() => 'mock-ts')

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
  useRoute: () => ({ query: {} })
}))

vi.mock('../../firebase/config', () => ({
  auth: {},
  db: {}
}))

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: (...args: unknown[]) => signInMock(...args),
  createUserWithEmailAndPassword: (...args: unknown[]) => createUserMock(...args)
}))

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => docMock(...args),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  getDoc: (...args: unknown[]) => getDocMock(...args),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
  serverTimestamp: () => serverTimestampMock()
}))

describe('AuthView.vue', () => {
  beforeEach(() => {
    vi.resetModules()
    i18n.global.locale.value = 'en'
    pushMock.mockReset()
    signInMock.mockReset()
    createUserMock.mockReset()
    setDocMock.mockReset()
    docMock.mockReset()
    getDocMock.mockReset()
    updateDocMock.mockReset()
    serverTimestampMock.mockClear()
    docMock.mockReturnValue({ path: 'users/mock' })
    getDocMock.mockResolvedValue({ exists: () => false, data: () => ({}) })
    vi.stubGlobal('alert', vi.fn())
    vi.stubEnv('VITE_SITE_ADMIN_EMAIL', '')
    vi.stubEnv('VITE_SITE_ADMIN_INITIAL_PASSWORD', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('logs in successfully and navigates to home', async () => {
    signInMock.mockResolvedValue({ user: { uid: 'u1' } })
    const { default: AuthView } = await import('../AuthView.vue')
    const wrapper = mount(AuthView, {
      global: {
        plugins: [createPinia(), i18n],
        stubs: { 'router-link': { template: '<a><slot /></a>' } }
      }
    })

    await wrapper.find('input[type="email"]').setValue('member@test.com')
    await wrapper.find('input[type="password"]').setValue('pw123456')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(signInMock).toHaveBeenCalled()
    expect(pushMock).toHaveBeenCalledWith('/home')
  })

  it('does not fail login when site-admin bootstrap update fails', async () => {
    vi.stubEnv('VITE_SITE_ADMIN_EMAIL', 'admin@test.com')
    vi.stubEnv('VITE_SITE_ADMIN_INITIAL_PASSWORD', 'init-pass')
    signInMock.mockResolvedValue({ user: { uid: 'admin-uid' } })
    setDocMock.mockRejectedValue(new Error('permission-denied'))

    const { default: AuthView } = await import('../AuthView.vue')
    const wrapper = mount(AuthView, {
      global: {
        plugins: [createPinia(), i18n],
        stubs: { 'router-link': { template: '<a><slot /></a>' } }
      }
    })

    await wrapper.find('input[type="email"]').setValue('admin@test.com')
    await wrapper.find('input[type="password"]').setValue('init-pass')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(signInMock).toHaveBeenCalled()
    expect(setDocMock).toHaveBeenCalled()
    expect(pushMock).toHaveBeenCalledWith('/home')
    expect(wrapper.text()).not.toContain('permission-denied')
  })

  it('does not fail signup when profile initialization fails', async () => {
    createUserMock.mockResolvedValue({ user: { uid: 'new-user' } })
    setDocMock.mockRejectedValue(new Error('permission-denied'))

    const { default: AuthView } = await import('../AuthView.vue')
    const wrapper = mount(AuthView, {
      global: {
        plugins: [createPinia(), i18n],
        stubs: { 'router-link': { template: '<a><slot /></a>' } }
      }
    })

    const tabButtons = wrapper.findAll('.tabs button')
    await tabButtons[1].trigger('click')
    await wrapper.find('input[type="email"]').setValue('new@test.com')
    await wrapper.find('input[type="password"]').setValue('pw123456')
    await wrapper.findAll('input[type="password"]')[1].setValue('pw123456') // confirm
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    await checkboxes[0].setValue(true) // agreeTerms
    await checkboxes[1].setValue(true) // agreePrivacy
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(createUserMock).toHaveBeenCalled()
    expect(setDocMock).toHaveBeenCalled()
    expect(wrapper.find('.error-text').exists()).toBe(false)
  })

  it('bootstraps site admin account on first login when user does not exist', async () => {
    vi.stubEnv('VITE_SITE_ADMIN_EMAIL', 'admin@test.com')
    vi.stubEnv('VITE_SITE_ADMIN_INITIAL_PASSWORD', 'init-pass')
    signInMock.mockRejectedValue({ code: 'auth/user-not-found' })
    createUserMock.mockResolvedValue({ user: { uid: 'new-admin' } })

    const { default: AuthView } = await import('../AuthView.vue')
    const wrapper = mount(AuthView, {
      global: {
        plugins: [createPinia(), i18n],
        stubs: { 'router-link': { template: '<a><slot /></a>' } }
      }
    })

    await wrapper.find('input[type="email"]').setValue('admin@test.com')
    await wrapper.find('input[type="password"]').setValue('init-pass')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(signInMock).toHaveBeenCalled()
    expect(createUserMock).toHaveBeenCalled()
    expect(setDocMock).toHaveBeenCalled()
    expect(pushMock).toHaveBeenCalledWith('/home')
  })
})
