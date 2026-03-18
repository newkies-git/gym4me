<template>
  <span class="role-nickname" :class="roleClass">{{ displayText }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()

const displayText = computed(() => {
  const nickname = (auth.user?.nickname ?? '').trim()
  if (nickname) return nickname
  const name = (auth.user?.name ?? '').trim()
  if (name) return name
  const email = (auth.user?.email ?? '').trim()
  return email
})

/** 역할 우선순위에 따른 색상 클래스 (한 역할만 적용) */
const roleClass = computed(() => {
  if (!auth.user) return ''
  if (auth.isSiteAdmin) return 'role-system-admin'
  if (auth.isManager) return 'role-manager'
  if (auth.isTrainer) return 'role-trainer'
  if (auth.isTrainee) return 'role-trainee'
  return 'role-observer'
})
</script>

<style scoped>
.role-nickname {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-main);
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (min-width: 768px) {
  .role-nickname {
    max-width: 150px;
  }
}

@media (max-width: 480px) {
  .role-nickname {
    display: inline-block;
    max-width: 110px;
    font-size: 0.85rem;
  }
}

/* 역할별 닉네임 색상 */
.role-nickname.role-system-admin { color: #7b1fa2; }
.role-nickname.role-manager { color: #2e7d32; }
.role-nickname.role-trainer { color: #ef6c00; }
.role-nickname.role-trainee { color: var(--primary); }
.role-nickname.role-observer { color: #757575; }
</style>
