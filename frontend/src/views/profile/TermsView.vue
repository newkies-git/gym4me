<template>
  <div class="container legal-container">
    <PageHeader :title="t('legal.termsTitle')" :subtitle="t('legal.termsIntro')" :showBack="true" />

    <div class="glass legal-card">
      <div class="legal-body">
        <p>제1조 (목적) 이 약관은 gym4me(이하 "서비스")가 제공하는 헬스/PT 관리 서비스의 이용 조건 및 절차, 회원과 서비스 제공자 간의 권리·의무를 정함을 목적으로 합니다.</p>
        <p>제2조 (약관의 효력) 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다. 회원이 가입 시 동의한 경우 이 약관에 구속됩니다.</p>
        <p>제3조 (서비스의 제공) 서비스는 회원 가입·로그인, 일정 관리, 강좌 조회·신청, 신체 기록 등 서비스가 정한 범위 내의 기능을 제공합니다.</p>
        <p>제4조 (회원 의무) 회원은 이용약관 및 개인정보처리방침을 준수하여야 하며, 타인의 정보를 도용하거나 서비스를 부정하게 이용하여서는 안 됩니다.</p>
      </div>
      <router-link :to="{ path: '/auth', query: { tab: 'signup' } }" class="btn btn-primary">{{ t('legal.backToSignup') }}</router-link>
    </div>
  </div>
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
