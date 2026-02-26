<template>
  <div class="search-section glass">
    <h3>🔍 Search Past Exercises</h3>
    <p class="sm-text" style="margin-bottom: 1rem;">Looking to beat your old records? Search a workout name to repeat it.</p>
    <div class="search-bar">
      <input type="text" v-model="searchExerciseQuery" placeholder="e.g. Squat" @keyup.enter="searchPastExercises">
      <button class="btn btn-primary" @click="searchPastExercises">Search</button>
    </div>
    
    <div class="search-results mt-4" v-if="searchResults.length > 0">
        <div v-for="res in searchResults" :key="res.id" class="result-card">
            <div class="res-info">
                <strong>{{ res.date }}</strong> - {{ res.record.name }}
                <span class="sm-text block">{{ res.record.sets }} Sets x {{ res.record.reps }} Reps <template v-if="res.record.weight">@ {{ res.record.weight }}kg</template></span>
            </div>
            <button class="btn btn-sm" @click="repeatExercise(res.record)">Repeat Today</button>
        </div>
    </div>
    <div v-else-if="hasSearched" class="empty-state mt-4">
        No past logs found for "{{ searchExerciseQuery }}".
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { getSchedules, addSchedule, updateSchedule } from '../../services/firebaseService'
import { arrayUnion } from 'firebase/firestore'
import type { ExerciseRecord } from '../../types'

const auth = useAuthStore()
const router = useRouter()

// Search & Repeat Logic
const searchExerciseQuery = ref('')
const searchResults = ref<{id: string; date: string; record: ExerciseRecord}[]>([])
const hasSearched = ref(false)

const searchPastExercises = async () => {
  if(!searchExerciseQuery.value || !auth.user?.email) return;
  hasSearched.value = true;
  searchResults.value = [];
  
  try {
      const schedules = await getSchedules(auth.user.email)
      
      const term = searchExerciseQuery.value.toLowerCase()
      schedules.forEach(schedule => {
          if (schedule.records && Array.isArray(schedule.records)) {
              schedule.records.forEach((rec: ExerciseRecord) => {
                  if (rec.name && rec.name.toLowerCase().includes(term)) {
                      searchResults.value.push({
                          id: schedule.id,
                          date: schedule.dateStr,
                          record: rec
                      })
                  }
              })
          }
      })
      
      // Sort by dates descending
      searchResults.value.sort((a,b) => b.date.localeCompare(a.date))
  } catch(e) {
      console.error(e)
  }
}

const repeatExercise = async (record: ExerciseRecord) => {
  const todayStr = new Date().toISOString().split('T')[0];
  try {
      const schedules = await getSchedules(auth.user!.email)
      const todaySchedule = schedules.find(s => s.dateStr === todayStr)
      
      let targetDocId = todaySchedule?.id;
      if (!targetDocId) {
          const newDoc = await addSchedule({
              clientEmail: auth.user?.email,
              dateStr: todayStr,
              time: '18:00',
              title: 'Repeated Workout',
              type: 'PERSONAL',
              targetType: 'INDIVIDUAL',
              status: 'APPROVED'
          });
          targetDocId = newDoc.id;
      }
      
      const newRecordObj = {
          name: record.name,
          sets: record.sets,
          reps: record.reps,
          weight: record.weight || 0
      };
      
      await updateSchedule(targetDocId, {
          records: arrayUnion(newRecordObj),
          status: 'COMPLETED'
      });
      
      alert(`Added ${record.name} to today's schedule!`);
      router.push('/calendar');
  } catch (e: any) {
      alert(e.message)
  }
}
</script>

<style scoped>
.search-section {
  padding: 2rem;
  border-radius: 1rem;
}

h3 { margin-bottom: 1.5rem; font-size: 1.2rem; }
.sm-text { font-size: 0.8rem; color: var(--text-muted); }
.empty-state { color: var(--text-muted); font-style: italic; padding: 2rem 0; text-align: center; }

.search-bar { display: flex; gap: 0.5rem; }
.search-bar input { flex: 1; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid var(--border); background: rgba(255,255,255,0.05); color: white; }
.mt-4 { margin-top: 1.5rem; }
.result-card { display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: rgba(0,0,0,0.2); border-radius: 0.5rem; margin-bottom: 0.5rem; }
.block { display: block; margin-top: 0.2rem; }
.btn-sm { padding: 0.4rem 0.8rem; font-size: 0.8rem; }
</style>
