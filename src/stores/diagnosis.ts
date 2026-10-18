import { defineStore } from 'pinia'
import { computed } from 'vue'
import {
  deriveDiagnosisAssessment,
  type DiagnosisAssessment,
} from '@/domain/diagnosis/diagnosis.assessment'
import { collectChartFindings } from '@/domain/diagnosis/diagnosis.findings'
import type { DiagnosisInputs } from '@/domain/diagnosis/diagnosis.types'
import { useKeyedDrafts } from '@/composables/useKeyedDrafts'
import { usePeriodontalChartStore } from './periodontal-chart'
import { registerSessionClearListener } from '@/services/session'
import { fromDiagnosisResponseDto } from '@/domain/diagnosis/diagnosis.api-mapper'

export const resolveDiagnosisKey = (
  visitId: string | null | undefined,
  patientId?: string | null | undefined,
): string => {
  if (visitId && visitId !== 'new') {
    return visitId.startsWith('visit:') ? visitId : `visit:${visitId}`
  }
  if (patientId) {
    return patientId.startsWith('draft:') ? patientId : `draft:${patientId}`
  }
  return 'draft:new'
}

const createInputs = (): DiagnosisInputs => ({



  boneLossPercent: null,

  teethLostToPerio: null,
  extent: null,
  stageMarks: { cal: null, boneLoss: null, toothLoss: null, complexity: null },
  directEvidence: null,
  ageYears: null,
  phenotype: null,
  smoking: null,
  diabetes: null,
})

const STORAGE_KEY = 'periokit_diagnosis_records'
const SNAPSHOTS_KEY = 'periokit_diagnosis_snapshots'
const STORAGE_VERSION_KEY = 'periokit_diagnosis_storage_version'
const STORAGE_VERSION = '2'

export const useDiagnosisStore = defineStore('diagnosis', () => {
  const chartStore = usePeriodontalChartStore()






  const {
    records,
    savedSnapshots,
    inputs,
    isDirty,
    openFor: openDraft,
    reset: resetInputs,
    rekey,
    replace: replaceInputs,
    commitSaved,
    revertToSaved,
    clearAll,
  } = useKeyedDrafts<DiagnosisInputs>({
    create: createInputs,
    storageKey: STORAGE_KEY,
    snapshotsKey: SNAPSHOTS_KEY,
    versionKey: STORAGE_VERSION_KEY,
    version: STORAGE_VERSION,


    legacyKeys: ['diagnosis'],
  })

  const findings = computed(() => collectChartFindings(chartStore.teethData))
  const assessment = computed(() =>
    deriveDiagnosisAssessment(inputs, findings.value, chartStore.patientInfo.age),
  )
  const selectAssessment = <K extends keyof DiagnosisAssessment>(key: K) =>
    computed(() => assessment.value[key])
  const hasChanges = selectAssessment('hasChanges')



  const interdentalCal = selectAssessment('interdentalCal')
  const probingDepth = selectAssessment('probingDepth')



  const age = selectAssessment('age')
  const ageFromRecord = selectAssessment('ageFromRecord')








  const boneLoss = selectAssessment('boneLoss')





  const teethLost = selectAssessment('teethLost')

  const complexity = selectAssessment('complexity')



  const stage = selectAssessment('stage')




  const finalStage = selectAssessment('finalStage')



  const suggestedExtent = selectAssessment('suggestedExtent')
  const extent = selectAssessment('extent')
  const extentOverridden = selectAssessment('extentOverridden')




  const suggestedPhenotype = selectAssessment('suggestedPhenotype')
  const phenotype = selectAssessment('phenotype')
  const phenotypeFromChart = selectAssessment('phenotypeFromChart')
  const grade = selectAssessment('grade')



  const finalGrade = selectAssessment('finalGrade')

  const diagnosisTitle = selectAssessment('diagnosisTitle')


  function openFor(visitOrKey?: string | null, patientId?: string | null) {
    openDraft(resolveDiagnosisKey(visitOrKey, patientId))
  }

  function hydrateFromBackend(response: Parameters<typeof fromDiagnosisResponseDto>[0]) {
    replaceInputs(fromDiagnosisResponseDto(response))
  }

  return {
    records,
    savedSnapshots,
    inputs,
    isDirty,
    hasChanges,
    findings,
    interdentalCal,
    probingDepth,
    age,
    ageFromRecord,
    boneLoss,
    teethLost,
    complexity,
    stage,
    suggestedExtent,
    extent,
    extentOverridden,
    suggestedPhenotype,
    phenotype,
    phenotypeFromChart,
    finalStage,
    grade,
    finalGrade,
    diagnosisTitle,
    openFor,
    resetInputs,
    rekey,
    hydrateFromBackend,
    commitSaved,
    revertToSaved,
    clearAll,
  }
})

registerSessionClearListener(() => {
  const store = useDiagnosisStore()
  store.clearAll()
})
