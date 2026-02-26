<template>
  <div class="landing-page">
    <div class="hero-section">
      <div class="glow-blob blob-1"></div>
      <div class="glow-blob blob-2"></div>
      
      <div class="hero-content">
        <h1 class="hero-title">
          {{ t('home.heroTitle') }} <span class="gradient-text">gym4me</span>
        </h1>
        <p class="hero-subtitle">
          {{ t('home.heroSubtitle') }}
        </p>
        
        <div class="hero-actions">
          <router-link v-if="auth.isAuthenticated" to="/dashboard" class="btn btn-primary btn-lg pulse-hover">
            {{ t('home.goToDashboard') }}
            <svg xmlns="http://www.w3.org/2000/svg" class="arrow-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </router-link>
          <router-link v-else to="/auth" class="btn btn-primary btn-lg pulse-hover">
            {{ t('home.getStarted') }}
             <svg xmlns="http://www.w3.org/2000/svg" class="arrow-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </router-link>
        </div>
      </div>
    </div>

    <section class="features-section container">
      <h2 class="section-title text-center">{{ t('home.transformTitle') }}</h2>
      <div class="features-grid">
        <div class="feature-card glass">
          <div class="feature-icon bg-indigo">📅</div>
          <h3>{{ t('home.smartScheduling') }}</h3>
          <p>{{ t('home.smartSchedulingDesc') }}</p>
        </div>
        <div class="feature-card glass">
          <div class="feature-icon bg-pink">📸</div>
          <h3>{{ t('home.visualProgress') }}</h3>
          <p>{{ t('home.visualProgressDesc') }}</p>
        </div>
        <div class="feature-card glass">
          <div class="feature-icon bg-purple">🔄</div>
          <h3>{{ t('home.repeatImprove') }}</h3>
          <p>{{ t('home.repeatImproveDesc') }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores/auth'
import { useI18n } from 'vue-i18n'

const auth = useAuthStore()
const { t } = useI18n()
</script>

<style scoped>
.landing-page {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 70px);
}

.hero-section {
  position: relative;
  overflow: hidden;
  padding: 8rem 2rem 6rem;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.glow-blob {
  position: absolute;
  filter: blur(80px);
  z-index: 0;
  border-radius: 50%;
  opacity: 0.5;
  animation: float 10s infinite alternate ease-in-out;
}

.blob-1 {
  width: 400px;
  height: 400px;
  background: rgba(99, 102, 241, 0.4); /* Indigo */
  top: -100px;
  left: -100px;
}

.blob-2 {
  width: 300px;
  height: 300px;
  background: rgba(192, 132, 252, 0.4); /* Purple */
  bottom: -50px;
  right: -50px;
  animation-delay: -5s;
}

@keyframes float {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(30px, 40px) scale(1.1); }
}

.hero-content {
  position: relative;
  z-index: 10;
  max-width: 800px;
}

.hero-title {
  font-size: 4rem;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 1.5rem;
}

.gradient-text {
  background: linear-gradient(135deg, #818cf8, #c084fc, #f43f5e);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-size: 200% auto;
  animation: shine 5s linear infinite;
}

@keyframes shine {
  to { background-position: 200% center; }
}

.hero-subtitle {
  font-size: 1.25rem;
  color: var(--text-muted);
  margin-bottom: 2.5rem;
  max-width: 600px;
  margin-inline: auto;
}

.hero-actions {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
}

.btn-lg {
  padding: 0.8rem 2rem;
  font-size: 1.1rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
}

.pulse-hover {
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
}
.pulse-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(99, 102, 241, 0.6);
}

.arrow-icon {
  width: 1.25rem;
  height: 1.25rem;
  transition: transform 0.3s ease;
}
.pulse-hover:hover .arrow-icon {
  transform: translateX(4px);
}

.text-center {
  text-align: center;
}

.features-section {
  padding: 4rem 2rem;
  position: relative;
  z-index: 10;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  margin-top: 3rem;
}

.feature-card {
  padding: 2rem;
  border-radius: 1.5rem;
  transition: transform 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
}

.feature-icon {
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 1rem;
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
}

.bg-indigo { background: rgba(99, 102, 241, 0.2); }
.bg-pink { background: rgba(244, 63, 94, 0.2); }
.bg-purple { background: rgba(192, 132, 252, 0.2); }

.feature-card h3 {
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
}

.feature-card p {
  color: var(--text-muted);
  font-size: 0.95rem;
}

@media (max-width: 768px) {
  .hero-title { font-size: 2.5rem; }
  .hero-actions { flex-direction: column; }
}
</style>
