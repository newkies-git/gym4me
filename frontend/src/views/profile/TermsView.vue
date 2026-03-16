<template>
  <div class="container legal-container">
    <PageHeader :title="t('legal.termsTitle')" :subtitle="t('legal.termsIntro')" :showBack="true" />

    <div class="glass legal-card">
      <div class="legal-body">
        <p>{{ t('legal.termsSection1') }}</p>
        <p>{{ t('legal.termsSection2') }}</p>
        <p>{{ t('legal.termsSection3') }}</p>
        <p>{{ t('legal.termsSection4') }}</p>
      </div>
      <router-link
        :to="{ path: '/auth', query: { tab: 'signup' } }"
        class="btn btn-primary"
      >
        {{ t('legal.backToSignup') }}
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PageHeader from '../../components/ui/PageHeader.vue'
const { t } = useI18n()
</script>

<style scoped>
.legal-container {
  padding: 6rem 1rem 3rem;
  max-width: 720px;
  margin: 0 auto;
}
.legal-card {
  padding: 2rem;
}
.legal-body {
  margin-bottom: 2rem;
  line-height: 1.7;
}
.legal-body p {
  margin: 0 0 0.75rem 0;
}
.legal-body p:last-child {
  margin-bottom: 0;
}
</style>
