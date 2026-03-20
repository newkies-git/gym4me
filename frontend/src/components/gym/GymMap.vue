<template>
  <div class="gym-map">
    <div v-if="!gyms?.length" class="gym-map-empty">
      {{ t('gymMgt.noGym') }}
    </div>

    <div v-else class="gym-map-frame">
      <div ref="mapEl" class="gym-map-canvas" />

      <div v-if="loading" class="gym-map-loading">
        {{ t('gymMgt.loadingInfo') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import 'leaflet/dist/leaflet.css'
import * as L from 'leaflet'
import type { Map as LeafletMap, Marker } from 'leaflet'

type GymForMap = {
  id: string
  name: string
  location?: string
}

const props = defineProps<{
  gyms: GymForMap[]
  selectedGymId?: string
}>()

const emit = defineEmits<{
  (e: 'select', gymId: string): void
}>()

const { t } = useI18n()

const mapEl = ref<HTMLDivElement | null>(null)
let map: LeafletMap | null = null

const loading = ref(false)

type LatLng = { lat: number; lng: number }

const geocodeCacheKey = 'gym4me_geocode_cache_v1'
const geocodeCache = reactive(new Map<string, LatLng>())

function loadCacheFromLocalStorage() {
  if (typeof localStorage === 'undefined') return
  try {
    const raw = localStorage.getItem(geocodeCacheKey)
    if (!raw) return
    const parsed = JSON.parse(raw) as Record<string, LatLng>
    for (const [addr, coord] of Object.entries(parsed)) geocodeCache.set(addr, coord)
  } catch {
    // ignore
  }
}

function persistCacheToLocalStorage() {
  if (typeof localStorage === 'undefined') return
  try {
    const obj: Record<string, LatLng> = {}
    for (const [k, v] of geocodeCache.entries()) obj[k] = v
    localStorage.setItem(geocodeCacheKey, JSON.stringify(obj))
  } catch {
    // ignore
  }
}

async function geocodeAddress(address: string): Promise<LatLng | null> {
  const addr = address.trim()
  if (!addr) return null

  if (geocodeCache.has(addr)) return geocodeCache.get(addr)!

  const email = (import.meta as any).env?.VITE_NOMINATIM_EMAIL as string | undefined
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')
  url.searchParams.set('q', addr)
  url.searchParams.set('addressdetails', '0')
  if (email) url.searchParams.set('email', email)
  url.searchParams.set('accept-language', 'en')

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' }
  })
  if (!res.ok) return null
  const json = (await res.json()) as Array<{ lat: string; lon: string }>
  if (!json?.length) return null

  const lat = Number(json[0].lat)
  const lng = Number(json[0].lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const coord = { lat, lng }
  geocodeCache.set(addr, coord)
  persistCacheToLocalStorage()
  return coord
}

const markers = reactive(new Map<string, Marker>())

function clearMarkers() {
  for (const m of markers.values()) m.remove()
  markers.clear()
}

async function renderMarkers() {
  if (!map) return

  clearMarkers()

  const gymsToProcess = (props.gyms || []).filter((g) => g.location?.trim())
  const coords: Array<{ id: string; name: string; coord: LatLng }> = []

  // Simple concurrency throttle (browser-friendly)
  const concurrency = 3
  let idx = 0

  async function worker() {
    while (idx < gymsToProcess.length) {
      const cur = gymsToProcess[idx++]
      const coord = await geocodeAddress(cur.location || '')
      if (!coord) continue
      coords.push({ id: cur.id, name: cur.name, coord })
    }
  }

  const workers = Array.from({ length: concurrency }).map(() => worker())
  await Promise.all(workers)

  const bounds: L.LatLngBoundsExpression[] = []

  for (const item of coords) {
    const marker = L.marker([item.coord.lat, item.coord.lng] as [number, number]).addTo(map!)
    marker.bindPopup(item.name)
    markers.set(item.id, marker)
    bounds.push([item.coord.lat, item.coord.lng] as any)

    marker.on('click', () => {
      emit('select', item.id)
    })

    if (props.selectedGymId && item.id === props.selectedGymId) {
      marker.openPopup()
      map!.setView([item.coord.lat, item.coord.lng] as any, Math.max(map!.getZoom(), 14))
    }
  }

  if (bounds.length) {
    map.fitBounds(bounds as any, { padding: [20, 20] })
  }
}

const gymsToShow = computed(() => props.gyms || [])

onMounted(async () => {
  loadCacheFromLocalStorage()
  await nextTick()
  if (!mapEl.value) return

  map = L.map(mapEl.value, { zoomControl: true })
  // Free tiles (OpenStreetMap)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map)

  // Initial center
  map.setView([37.5665, 126.9780], 12)

  loading.value = true
  try {
    await renderMarkers()
  } finally {
    loading.value = false
  }
})

watch(
  gymsToShow,
  async () => {
    if (!map) return
    loading.value = true
    try {
      await renderMarkers()
    } finally {
      loading.value = false
    }
  },
  { deep: true }
)

onBeforeUnmount(() => {
  clearMarkers()
  map?.remove()
  map = null
})
</script>

<style scoped>
.gym-map-frame {
  position: relative;
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--bg-card);
}

.gym-map-canvas {
  width: 100%;
  height: 420px;
}

.gym-map-loading {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  color: var(--text-main);
  font-weight: 700;
  font-size: 0.85rem;
}

.gym-map-empty {
  padding: 1rem;
  color: var(--text-muted);
}
</style>

