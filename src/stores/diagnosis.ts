import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { collectChartFindings } from '@/domain/diagnosis/diagnosis.findings'
import {
  assessGrade,
  assessStage,
  complexityFindings,
  stageSummary,
} from '@/domain/diagnosis/diagnosis.rules'
import { EXTENT_LABEL, type DiagnosisInputs } from '@/domain/diagnosis/diagnosis.types'
import { usePeriodontalChartStore } from './periodontal-chart'
import { registerSessionClearListener } from '@/services/session'

const createInputs = (): DiagnosisInputs => ({
  interdentalCalMm: null,
  probingDepthMm: null,
  furcationGrade: null,
  mobilityGrade: null,
  boneLossPercent: 0,
  teethLostToPerio: null,
  extent: null,
  stageMarks: { cal: null, boneLoss: null, toothLoss: null, complexity: null },
  stageOverride: null,
  stageReason: '',
  directEvidence: null,
  ageYears: null,
  phenotype: null,
  smoking: null,
  diabetes: null,
  gradeOverride: null,
  gradeReason: '',
})

/**
 * The diagnosis worksheet for one visit. Held in memory only: the backend has
 * no place to file a diagnosis yet, so nothing here is saved — it survives
 * moving between the chart and this page, and no longer.
 */
export const useDiagnosisStore = defineStore('diagnosis', () => {
  const chartStore = usePeriodontalChartStore()

  const inputs = reactive<DiagnosisInputs>(createInputs())
  // Which visit the answers above belong to, so opening another visit starts
  // from a blank worksheet instead of inheriting someone else's smoking status.
  const visitKey = ref<string | null>(null)

  const findings = computed(() => collectChartFindings(chartStore.teethData))

  // The chart's value unless the doctor typed over it.
  const interdentalCal = computed(
    () => inputs.interdentalCalMm ?? findings.value.interdentalCal?.value ?? null,
  )
  const probingDepth = computed(
    () => inputs.probingDepthMm ?? findings.value.probingDepth?.value ?? null,
  )
  const furcation = computed(() => inputs.furcationGrade ?? findings.value.furcation?.grade ?? null)
  const mobility = computed(() => inputs.mobilityGrade ?? findings.value.mobility?.grade ?? null)
  const age = computed(() => inputs.ageYears ?? chartStore.patientInfo.age ?? null)
  const teethLost = computed(() => inputs.teethLostToPerio ?? findings.value.missingTeeth.length)

  const complexity = computed(() =>
    complexityFindings(
      probingDepth.value,
      furcation.value,
      mobility.value,
      findings.value.remainingTeeth,
    ),
  )

  // Where the measured numbers fall — shown next to the stage as a guide for
  // which band to tick, never as the stage itself.
  const stageReasons = computed(() =>
    stageSummary(
      interdentalCal.value,
      inputs.boneLossPercent,
      teethLost.value,
      complexity.value,
    ),
  )

  const stage = computed(() => assessStage(inputs.stageMarks))

  const finalStage = computed(() => inputs.stageOverride ?? stage.value.stage)
  const stageOverridden = computed(
    () =>
      inputs.stageOverride !== null &&
      stage.value.stage !== null &&
      inputs.stageOverride !== stage.value.stage,
  )

  const grade = computed(() =>
    assessGrade({
      directEvidence: inputs.directEvidence,
      boneLossPercent: inputs.boneLossPercent,
      ageYears: age.value,
      phenotype: inputs.phenotype,
      smoking: inputs.smoking,
      diabetes: inputs.diabetes,
    }),
  )

  const finalGrade = computed(() => inputs.gradeOverride ?? grade.value.grade)
  const gradeOverridden = computed(
    () =>
      inputs.gradeOverride !== null &&
      grade.value.grade !== null &&
      inputs.gradeOverride !== grade.value.grade,
  )

  // The rows still to be ticked, plus the extent — what stands between the
  // worksheet and a full diagnosis line.
  const missingStageInputs = computed(() => [
    ...stage.value.missing,
    ...(inputs.extent ? [] : ['extent and distribution']),
  ])

  const missingInputs = computed(() => [...missingStageInputs.value, ...grade.value.missing])

  const diagnosisTitle = computed(() => {
    const parts: string[] = []
    if (inputs.extent === 'molar-incisor') parts.push('Periodontitis, molar / incisor pattern')
    else if (inputs.extent) parts.push(`${EXTENT_LABEL[inputs.extent].split(' (')[0]} Periodontitis`)
    else parts.push('Periodontitis')

    if (finalStage.value) parts.push(`Stage ${finalStage.value}`)
    if (finalGrade.value) parts.push(`Grade ${finalGrade.value}`)
    return parts.join(', ')
  })

  const isClassified = computed(() => Boolean(finalStage.value && finalGrade.value))

  function resetInputs() {
    Object.assign(inputs, createInputs())
  }

  /** Point the worksheet at a visit, blanking it when the visit changes. */
  function openFor(key: string | null) {
    if (visitKey.value === key) return
    visitKey.value = key
    resetInputs()
  }

  return {
    inputs,
    visitKey,
    findings,
    interdentalCal,
    probingDepth,
    furcation,
    mobility,
    age,
    teethLost,
    complexity,
    stageReasons,
    stage,
    finalStage,
    stageOverridden,
    grade,
    finalGrade,
    gradeOverridden,
    missingStageInputs,
    missingInputs,
    diagnosisTitle,
    isClassified,
    openFor,
    resetInputs,
  }
})

registerSessionClearListener(() => {
  const store = useDiagnosisStore()
  store.visitKey = null
  store.resetInputs()
})
