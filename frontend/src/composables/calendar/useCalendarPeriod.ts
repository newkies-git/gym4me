import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

export interface DayCell {
  name: string
  num: number
  month: number
  dateStr: string
  isToday: boolean
}

function getSunday(d: Date): Date {
  const x = new Date(d)
  x.setDate(d.getDate() - d.getDay())
  return x
}

function getMonday(d: Date): Date {
  const x = new Date(d)
  // Monday-based offset: Monday=0, Sunday=6
  const day = x.getDay()
  const offset = (day + 6) % 7
  x.setDate(x.getDate() - offset)
  return x
}

/**
 * 2주(14일) 캘린더 기간·네비게이션 로직.
 * Vue 컴포넌트에서 기간 표시와 주 이동을 재사용하기 위한 composable.
 */
export function useCalendarPeriod(weekStartsOn: 'sunday' | 'monday' = 'sunday') {
  const { t, tm } = useI18n()
  const today = new Date()
  const currentPeriodStart = ref(weekStartsOn === 'monday' ? getMonday(today) : getSunday(today))

  const dayNames = computed(() => {
    const base = tm('calendar.dayNames') as string[]
    if (weekStartsOn === 'monday') return [...base.slice(1, 7), base[0]]
    return base.slice(0, 7)
  })

  const weekDays = computed<DayCell[]>(() => {
    const names = tm('calendar.dayNames') as string[]
    const start = currentPeriodStart.value
    const todayStr = today.toISOString().split('T')[0]
    const days: DayCell[] = []
    for (let i = 0; i < 14; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      days.push({
        name: names[d.getDay()],
        num: d.getDate(),
        month: d.getMonth() + 1,
        dateStr,
        isToday: dateStr === todayStr
      })
    }
    return days
  })

  const weekRows = computed(() => {
    const list = weekDays.value
    return [list.slice(0, 7), list.slice(7, 14)]
  })

  function formatCellDate(day: { num: number; month: number; dateStr: string }): string {
    const start = currentPeriodStart.value
    const isFirstDay = day.dateStr === start.toISOString().split('T')[0]
    if (isFirstDay) return `${day.month}${t('calendar.monthShort')} ${day.num}${t('calendar.dayShort')}`
    return `${day.num}${t('calendar.dayShort')}`
  }

  const periodTitle = computed(() => {
    const start = currentPeriodStart.value
    return t('calendar.yearMonth', { year: start.getFullYear(), month: start.getMonth() + 1 })
  })

  const weekRangeText = computed(() => {
    const start = currentPeriodStart.value
    const end = new Date(start)
    end.setDate(start.getDate() + 13)
    const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`
    return `${fmt(start)} ~ ${fmt(end)} ${t('calendar.twoWeeksLabel')}`
  })

  function goPrevWeek() {
    const d = new Date(currentPeriodStart.value)
    d.setDate(d.getDate() - 7)
    currentPeriodStart.value = d
  }

  function goNextWeek() {
    const d = new Date(currentPeriodStart.value)
    d.setDate(d.getDate() + 7)
    currentPeriodStart.value = d
  }

  function goToToday() {
    currentPeriodStart.value = weekStartsOn === 'monday' ? getMonday(today) : getSunday(today)
  }

  return {
    dayNames,
    weekDays,
    weekRows,
    formatCellDate,
    periodTitle,
    weekRangeText,
    goPrevWeek,
    goNextWeek,
    goToToday
  }
}
