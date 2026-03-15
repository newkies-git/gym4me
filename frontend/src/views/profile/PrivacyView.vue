<template>
  <div class="container legal-container">
    <div class="glass legal-card">
      <h1 class="legal-title">{{ t('legal.privacyTitle') }}</h1>
      <p class="legal-intro">{{ t('legal.privacyIntro') }}</p>
      <div class="legal-body">
        <p><strong>1. 수집하는 개인정보 항목</strong> 서비스는 회원가입·이용 시 이메일, 비밀번호, 이름, 전화번호, 닉네임, 소속 헬스장 정보 등을 수집할 수 있습니다.</p>
        <p><strong>2. 수집 목적</strong> 서비스 제공, 회원 식별, 일정·강좌 관리, 고객 문의 대응 및 이용약관에 따른 의무 이행을 위하여 수집합니다.</p>
        <p><strong>3. 보유 및 이용 기간</strong> 회원 탈퇴 또는 동의 철회 시까지 보유하며, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>
        <p><strong>4. 제3자 제공</strong> 원칙적으로 회원의 개인정보를 제3자에게 제공하지 않습니다. 법령에 의한 경우 등 예외가 있는 경우 해당 법령에 따릅니다.</p>
        <p><strong>5. 동의 거부 권리</strong> 개인정보 수집·이용에 동의하지 않을 수 있으며, 동의 거부 시 서비스 가입 및 이용이 제한될 수 있습니다.</p>
      </div>
      <router-link :to="{ path: '/auth', query: { tab: 'signup' } }" class="btn btn-primary">{{ t('legal.backToSignup') }}</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
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
.legal-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary);
  margin: 0 0 1rem 0;
}
.legal-intro {
  color: var(--text-muted);
  margin: 0 0 1.5rem 0;
  font-size: 0.95rem;
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
