import { describe, it, expect, vi } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import HomeView from '../HomeView.vue'
import { createTestingPinia } from '@pinia/testing'
import i18n from '../../i18n'

describe('HomeView.vue', () => {
    it('renders landing page content', () => {
        i18n.global.locale.value = 'en'
        const wrapper = mount(HomeView, {
            global: {
                plugins: [createTestingPinia({ createSpy: vi.fn }), i18n],
                stubs: { 'router-link': RouterLinkStub }
            }
        })

        expect(wrapper.text()).toContain('Welcome to')
        expect(wrapper.text()).toContain('gym4me')
        expect(wrapper.text()).toContain('Transform Your Training')
    })
})
