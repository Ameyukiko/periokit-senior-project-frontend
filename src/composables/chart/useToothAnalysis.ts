import { computed, type Ref } from 'vue'
import { buildToothAnalysis } from '@/domain/chart/tooth.analysis'
import { isUpperTooth } from '@/domain/chart/chart.rules'
import type { ToothData, ToothId } from '@/domain/chart/chart.types'

export function useToothAnalysis(options: {
  toothId: Ref<ToothId | null>
  toothData: Ref<ToothData | null>
}) {
  const { toothId, toothData } = options

  const innerSurfaceLabel = computed(() => {
    if (!toothId.value) return 'Palatal'
    return isUpperTooth(toothId.value) ? 'Palatal' : 'Lingual'
  })

  const analysisData = computed(() => buildToothAnalysis(toothData.value))

  return {
    innerSurfaceLabel,
    analysisData,
  }
}
