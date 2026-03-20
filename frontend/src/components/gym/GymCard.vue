<template>
  <li :id="gym?.id ? `gym-card-${gym.id}` : undefined" class="glass gym-card" :class="{ 'is-active': active }">
    <div class="card-content">
      <!-- 1x2 grid: (1,1)=정보, (1,2)=지도 -->
      <div class="card-body-grid">
        <div class="card-cell card-info">
          <h3 class="gym-name">{{ gym.name }}</h3>

          <div class="info-group">
            <p class="sm-text">📍 {{ gym.location || '-' }}</p>
            <p v-if="gym.phone" class="sm-text">📞 {{ gym.phone }}</p>
            <p v-if="gym.openDate" class="sm-text">📅 Open: {{ gym.openDate }}</p>
            <p class="sm-text manager-status" :class="{ 'not-assigned': !gym.managerEmail }">
              👤 {{
                gym.managerEmail
                  ? t('gymMgt.managerAssigned', { email: gym.managerEmail })
                  : t('gymMgt.noManager')
              }}
            </p>
          </div>

          <p v-if="gym.notes" class="gym-notes">"{{ gym.notes }}"</p>
        </div>

        <div class="card-cell card-map">
          <GymCardMiniMap :location="gym.location" :gym-name="gym.name" />
        </div>
      </div>
    </div>

    <!-- Footer: trainer/trainee + buttons (1 line) -->
    <div class="card-footer-row">
      <div class="card-footer-stats">
        <div class="stat-item clickable" @click="$emit('openTrainers', gym.id)">
          <span class="label">{{ t('gymMgt.trainerCount', { n: '' }).split(':')[0] }}:</span>
          <span class="value">{{ trainersCount }}</span>
        </div>
        <div class="stat-item">
          <span class="label">{{ t('gymMgt.traineeCount', { n: '' }).split(':')[0] }}:</span>
          <span class="value">{{ traineesCount }}</span>
        </div>
      </div>

      <div class="card-footer-actions">
        <button class="btn btn-ghost btn-xs" @click="$emit('edit', gym)">{{ t('gymMgt.editGym') }}</button>
        <button class="btn btn-danger btn-xs" @click="$emit('delete', gym)">{{ t('gymMgt.deleteGym') }}</button>
      </div>
    </div>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Gym } from '../../types'
import GymCardMiniMap from './GymCardMiniMap.vue'

const props = defineProps<{
  gym: Gym
  trainersCount: number
  traineesCount: number
  active?: boolean
}>()

defineEmits<{
  (e: 'edit', gym: Gym): void
  (e: 'delete', gym: Gym): void
  (e: 'openTrainers', gymId: string): void
}>()

const { t } = useI18n()
</script>

<style scoped>
.gym-card {
  position: relative;
  padding: 1.5rem;
  margin-bottom: 1rem;
  list-style: none;
  transition: transform 0.2s, box-shadow 0.2s;
}

.gym-card.is-active {
  box-shadow: 0 0 0 3px rgba(94, 53, 177, 0.25), 0 8px 24px rgba(0, 0, 0, 0.12);
  border-color: rgba(94, 53, 177, 0.35);
}

.gym-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.card-body-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  align-items: start;
}

.card-cell {
  min-width: 0;
}

.card-info {
  min-width: 0;
}

.card-map {
  height: 140px;
}

.card-map :deep(.gym-mini-map-canvas) {
  border-radius: 10px;
}

/* Base button size reduction for cards */
.btn-xs {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  border-radius: 6px;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.gym-name {
  margin: 0;
  font-size: 1.25rem;
  color: var(--primary);
}

.info-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.sm-text {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.manager-status {
  color: var(--primary);
  font-weight: 500;
}

.manager-status.not-assigned {
  color: var(--accent);
}

.stats-row {
  display: flex;
  gap: 1.5rem;
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);
}

.card-footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.55rem;
  padding-top: 0.15rem;
  padding-bottom: 0.25rem;
  border-top: 1px solid var(--border);
}

.card-footer-stats {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  white-space: nowrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
}

.stat-item.clickable {
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.stat-item.clickable:hover {
  color: var(--primary);
}

.label {
  color: var(--text-muted);
}

.value {
  font-weight: 700;
  color: var(--text-main);
}

.gym-notes {
  margin-top: 0.5rem;
  font-style: italic;
  font-size: 0.85rem;
  color: var(--text-muted);
  border-left: 2px solid var(--primary);
  padding-left: 0.75rem;
}

/* Footer buttons always at bottom */
.card-footer-actions {
  margin-top: 0;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  flex-wrap: nowrap;
}

.card-footer-actions .btn-xs {
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 30px;
}

/* Adjusted for very small screens */
@media (max-width: 360px) {
  .card-body-grid {
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .card-map {
    height: 130px;
  }

  .card-footer-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .card-footer-actions {
    margin-top: 0;
  }
}
</style>
