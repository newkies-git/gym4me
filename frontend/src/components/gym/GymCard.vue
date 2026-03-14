<template>
  <li class="glass gym-card">
    <!-- Top-Right Actions -->
    <div class="card-actions">
      <button class="btn btn-ghost btn-xs" @click="$emit('edit', gym)">{{ t('gymMgt.editGym') }}</button>
      <button class="btn btn-danger btn-xs" @click="$emit('delete', gym)">{{ t('gymMgt.deleteGym') }}</button>
    </div>

    <div class="card-content">
      <h3 class="gym-name">{{ gym.name }}</h3>
      
      <div class="info-group">
        <p class="sm-text">📍 {{ gym.location || '-' }}</p>
        <p v-if="gym.phone" class="sm-text">📞 {{ gym.phone }}</p>
        <p v-if="gym.openDate" class="sm-text">📅 Open: {{ gym.openDate }}</p>
        <p class="sm-text manager-status" :class="{ 'not-assigned': !gym.managerEmail }">
          👤 {{ gym.managerEmail ? t('gymMgt.managerAssigned', { email: gym.managerEmail }) : t('gymMgt.noManager') }}
        </p>
      </div>

      <div class="stats-row">
        <div class="stat-item clickable" @click="$emit('openTrainers', gym.id)">
          <span class="label">{{ t('gymMgt.trainerCount', { n: '' }).split(':')[0] }}:</span>
          <span class="value">{{ trainersCount }}</span>
        </div>
        <div class="stat-item">
          <span class="label">{{ t('gymMgt.memberCount', { n: '' }).split(':')[0] }}:</span>
          <span class="value">{{ membersCount }}</span>
        </div>
      </div>

      <p v-if="gym.notes" class="gym-notes">"{{ gym.notes }}"</p>
      <p class="gym-id">ID: {{ gym.id }}</p>
    </div>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Gym } from '../../types'

const props = defineProps<{
  gym: Gym
  trainersCount: number
  membersCount: number
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

.gym-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.card-actions {
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  gap: 0.5rem;
  z-index: 1;
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
  padding-right: 6rem; /* Space for buttons */
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

.gym-id {
  margin-top: auto;
  font-size: 0.75rem;
  color: var(--text-muted);
  opacity: 0.6;
}

/* Adjusted for very small screens */
@media (max-width: 360px) {
  .card-actions {
    position: static;
    margin-bottom: 0.5rem;
    justify-content: flex-end;
  }
  .gym-name {
    padding-right: 0;
  }
}
</style>
