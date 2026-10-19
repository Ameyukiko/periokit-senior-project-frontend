import { onMounted, onUnmounted, type Ref } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import type { usePeriodontalChartStore } from '@/stores/periodontal-chart'

type ChartStore = ReturnType<typeof usePeriodontalChartStore>

export function useDraftRecovery(options: {
  chartStore: ChartStore
  route: RouteLocationNormalizedLoaded
  showDraftRecoveryModal: Ref<boolean>
}) {
  const { chartStore, route, showDraftRecoveryModal } = options

  const beforeUnloadHandler = (event: BeforeUnloadEvent) => {
    if (chartStore.isDirty) {
      event.preventDefault()
    }
  }

  onMounted(() => {
    window.addEventListener('beforeunload', beforeUnloadHandler)

    if (chartStore.isDirty && !route.query.visitId) {
      showDraftRecoveryModal.value = true
    }
  })

  onUnmounted(() => {
    window.removeEventListener('beforeunload', beforeUnloadHandler)
  })

  const discardDraft = () => {
    showDraftRecoveryModal.value = false
    chartStore.resetChart()
  }

  return {
    discardDraft,
  }
}
