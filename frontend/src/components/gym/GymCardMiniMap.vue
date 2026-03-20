<template>
  <div
    v-show="!isMapModalOpen"
    class="gym-mini-map"
    role="button"
    tabindex="0"
    @click="openMapModal"
    @keydown.enter.prevent="openMapModal"
  >
    <div v-if="!location" class="gym-mini-map-empty">
      —
    </div>
    <div v-else ref="el" class="gym-mini-map-canvas" />
  </div>

  <teleport to="body">
    <div v-if="isMapModalOpen" class="gym-modal-overlay" @click.self="closeModal">
      <div class="gym-modal-content glass">
        <div class="gym-modal-header">
          <div class="gym-modal-title">{{ gymName || 'Gym Map' }}</div>
          <button type="button" class="gym-modal-close" @click="closeModal" aria-label="Close">×</button>
        </div>

        <div ref="modalMapEl" class="gym-modal-map-canvas" />

        <div class="gym-modal-footer">
          <button type="button" class="btn btn-ghost" @click="closeModal">
            {{ t('common.close') }}
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import 'leaflet/dist/leaflet.css'
import * as L from 'leaflet'

type LatLng = { lat: number; lng: number }

const props = defineProps<{
  location?: string
  gymName?: string
}>()

const { t } = useI18n()

const el = ref<HTMLDivElement | null>(null)
const modalMapEl = ref<HTMLDivElement | null>(null)

const isMapModalOpen = ref(false)
let map: L.Map | null = null
let marker: L.Marker | null = null
let modalMap: L.Map | null = null
let modalMarker: L.Marker | null = null

const geocodeCacheKey = 'gym4me_geocode_cache_v1'
let onKeyDown: ((e: KeyboardEvent) => void) | null = null

function getCache(): Record<string, LatLng> {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(geocodeCacheKey)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, LatLng>
  } catch {
    return {}
  }
}

function setCache(next: Record<string, LatLng>) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(geocodeCacheKey, JSON.stringify(next))
  } catch {
    // ignore
  }
}

async function geocodeAddress(address: string): Promise<LatLng | null> {
  const addr = address.trim()
  if (!addr) return null

  const cache = getCache()
  if (cache[addr]) return cache[addr]

  // Nominatim (free)
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')
  url.searchParams.set('q', addr)
  url.searchParams.set('addressdetails', '0')
  url.searchParams.set('accept-language', 'en')

  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
  if (!res.ok) return null

  const json = (await res.json()) as Array<{ lat: string; lon: string }>
  if (!json?.length) return null

  const lat = Number(json[0].lat)
  const lng = Number(json[0].lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  cache[addr] = { lat, lng }
  setCache(cache)
  return { lat, lng }
}

async function render() {
  if (!el.value) return

  const location = props.location
  if (!location) return

  if (!map) {
    map = L.map(el.value, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      dragging: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(map)
  }

  const coord = await geocodeAddress(location)
  if (!coord || !map) return

  const latlng: [number, number] = [coord.lat, coord.lng]

  map.setView(latlng, 13, { animate: false })

  if (!marker) {
    marker = L.marker(latlng).addTo(map)
  } else {
    marker.setLatLng(latlng)
  }

  marker.bindPopup(props.gymName || 'Gym')
}

async function renderModal() {
  if (!modalMapEl.value) return
  const location = props.location
  if (!location) return

  const coord = await geocodeAddress(location)
  if (!coord) return

  const latlng: [number, number] = [coord.lat, coord.lng]

  if (!modalMap) {
    modalMap = L.map(modalMapEl.value, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(modalMap)
  }

  modalMap.setView(latlng, 14, { animate: false })

  if (!modalMarker) {
    modalMarker = L.marker(latlng).addTo(modalMap)
  } else {
    modalMarker.setLatLng(latlng)
  }

  modalMarker.bindPopup(props.gymName || 'Gym').openPopup()
}

async function openMapModal() {
  if (!props.location) return
  isMapModalOpen.value = true
  await nextTick()
  await renderModal()
}

function closeModal() {
  isMapModalOpen.value = false
}

watch(
  () => props.location,
  async () => {
    // re-render when gym location changes
    if (!props.location) return
    await nextTick()
    await render()
  },
  { immediate: true }
)

onMounted(async () => {
  await render()
})

onBeforeUnmount(() => {
  if (map) map.remove()
  map = null
  marker = null

  if (modalMap) modalMap.remove()
  modalMap = null
  modalMarker = null

  if (onKeyDown) window.removeEventListener('keydown', onKeyDown)
})

watch(
  () => isMapModalOpen.value,
  async (open) => {
    if (!open) {
      if (modalMap) modalMap.remove()
      modalMap = null
      modalMarker = null
      if (typeof document !== 'undefined') document.body.style.overflow = ''
      return
    }
    if (typeof document !== 'undefined') document.body.style.overflow = 'hidden'
    await nextTick()
    await renderModal()
  }
)

onMounted(() => {
  onKeyDown = (e: KeyboardEvent) => {
    if (!isMapModalOpen.value) return
    if (e.key === 'Escape') closeModal()
  }
  window.addEventListener('keydown', onKeyDown)
})
</script>

<style scoped>
.gym-mini-map {
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.gym-mini-map-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  background: rgba(0, 0, 0, 0.03);
  border: 1px dashed var(--border);
  border-radius: 12px;
  font-size: 0.85rem;
}

.gym-mini-map-canvas {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  overflow: hidden;
}

.gym-mini-map-canvas :deep(.leaflet-container) {
  border-radius: 10px;
}

.gym-modal-map-canvas {
  width: 100%;
  height: 520px;
  border-radius: 12px;
  overflow: hidden;
}

.gym-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  backdrop-filter: blur(5px);
}

.gym-modal-content {
  width: 100%;
  max-width: 820px;
  border-radius: 1rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.gym-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.1rem;
  border-bottom: 1px solid var(--border);
}

.gym-modal-title {
  font-weight: 900;
  color: var(--text-main);
}

.gym-modal-close {
  background: rgba(148, 163, 184, 0.16);
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
}

.gym-modal-footer {
  padding: 1rem 1.1rem;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
}
</style>

