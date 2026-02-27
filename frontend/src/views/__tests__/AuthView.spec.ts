import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import i18n from '../../i18n'

const pushMock = vi.fn()
const signInMock = vi.fn()
const createUserMock = vi.fn()
const setDocMock = vi.fn()
const docMock = vi.fn()
const serverTimestampMock = vi.fn(() => 'mock-ts')

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock })
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
  serverTimestamp: () => serverTimestampMock()
}))

describe('AuthView.vue', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'en'
    pushMock.mockReset()
    signInMock.mockReset()
    createUserMock.mockReset()
    setDocMock.mockReset()
    docMock.mockReset()
    serverTimestampMock.mockClear()
    docMock.mockReturnValue({ path: 'users/mock' })
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
    const wrapper = mount(AuthView, { global: { plugins: [i18n] } })

    await wrapper.find('input[type="email"]').setValue('member@test.com')
    await wrapper.find('input[type="password"]').setValue('pw123456')
    await wrapper.find('form').trigger('submit.prevent')

    expect(signInMock).toHaveBeenCalled()
    expect(pushMock).toHaveBeenCalledWith('/')
  })

  it('does not fail login when site-admin bootstrap update fails', async () => {
    vi.stubEnv('VITE_SITE_ADMIN_EMAIL', 'admin@test.com')
    vi.stubEnv('VITE_SITE_ADMIN_INITIAL_PASSWORD', 'init-pass')
    signInMock.mockResolvedValue({ user: { uid: 'admin-uid' } })
    setDocMock.mockRejectedValue(new Error('permission-denied'))

    const { default: AuthView } = await import('../AuthView.vue')
    const wrapper = mount(AuthView, { global: { plugins: [i18n] } })

    await wrapper.find('input[type="email"]').setValue('admin@test.com')
    await wrapper.find('input[type="password"]').setValue('init-pass')
    await wrapper.find('form').trigger('submit.prevent')
    await nextTick()

    expect(signInMock).toHaveBeenCalled()
    expect(setDocMock).toHaveBeenCalled()
    expect(pushMock).toHaveBeenCalledWith('/')
    expect(wrapper.text()).not.toContain('permission-denied')
  })

  it('does not fail signup when profile initialization fails', async () => {
    createUserMock.mockResolvedValue({ user: { uid: 'new-user' } })
    setDocMock.mockRejectedValue(new Error('permission-denied'))

    const { default: AuthView } = await import('../AuthView.vue')
    const wrapper = mount(AuthView, { global: { plugins: [i18n] } })

    const tabButtons = wrapper.findAll('.tabs button')
    await tabButtons[1].trigger('click')
    await wrapper.find('input[type="email"]').setValue('new@test.com')
    await wrapper.find('input[type="password"]').setValue('pw123456')
    await wrapper.find('input[type="text"]').setValue('newbie')
    await wrapper.find('form').trigger('submit.prevent')
    await nextTick()

    expect(createUserMock).toHaveBeenCalled()
    expect(setDocMock).toHaveBeenCalled()
    expect(wrapper.find('.error-text').exists()).toBe(false)
  })
})
