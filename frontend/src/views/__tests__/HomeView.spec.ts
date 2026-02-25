import { describe, it, expect, vi } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import HomeView from '../HomeView.vue'
import { createTestingPinia } from '@pinia/testing'

describe('HomeView.vue', () => {
    it('renders landing page content', () => {
        const wrapper = mount(HomeView, {
            global: {
                plugins: [createTestingPinia({ createSpy: vi.fn })],
                stubs: { 'router-link': RouterLinkStub }
            }
        })

        expect(wrapper.text()).toContain('Welcome to')
        expect(wrapper.text()).toContain('SQLite BBS')
        expect(wrapper.text()).toContain('Explore the Board')
    })
})
