import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { collectChartFindings } from '@/domain/diagnosis/diagnosis.findings'
import {
  assessGrade,
  assessStage,
  autoStageMarks,
  complexityFindings,
  complexityStage,
  stageSummary,
  suggestExtent,
  suggestPhenotype,
} from '@/domain/diagnosis/diagnosis.rules'
import { EXTENT_LABEL, type DiagnosisInputs } from '@/domain/diagnosis/diagnosis.types'
import { usePeriodontalChartStore } from './periodontal-chart'
import { registerSessionClearListener } from '@/services/session'

const createInputs = (): DiagnosisInputs => ({
  // Empty means "use the estimate the chart works out from attachment loss",
  // which is a far better starting point than a 0 nobody measured.
  boneLossPercent: null,
  // null means "use the chart's count of missing teeth".
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

  // Straight off the chart. These four are measurements, so the chart is the
  // only place they can be changed — a diagnosis that quoted a different number
  // would leave the record saying one thing and the diagnosis another.
  const interdentalCal = computed(() => findings.value.interdentalCal?.value ?? null)
  const probingDepth = computed(() => findings.value.probingDepth?.value ?? null)
  const furcation = computed(() => findings.value.furcation?.grade ?? null)
  const mobility = computed(() => findings.value.mobility?.grade ?? null)
  // The record first, always: an age on file cannot be typed over here. The
  // input behind it only fills the gap when the record carries no age, so the
  // grade's % bone loss ÷ age is not blocked by a record nobody can reach.
  const age = computed(() => chartStore.patientInfo.age ?? inputs.ageYears ?? null)
  const ageFromRecord = computed(() => chartStore.patientInfo.age !== null)

  // The film wins where one has been read; otherwise the estimate the chart
  // works out from attachment loss carries the row.
  const boneLoss = computed(
    () => inputs.boneLossPercent ?? findings.value.estimatedBoneLossPercent,
  )
  const boneLossEstimated = computed(
    () => inputs.boneLossPercent === null && findings.value.estimatedBoneLossPercent !== null,
  )

  // Note C under TAP 2023 table 5: tooth loss counts towards the stage only
  // where it is known for certain to have been periodontitis that took the
  // tooth. The chart records the gap, never the cause, so its tally is offered
  // beside the field as a prompt and nothing is assumed until the doctor answers.
  const teethLost = computed(() => inputs.teethLostToPerio)

  const complexity = computed(() =>
    complexityFindings(
      probingDepth.value,
      furcation.value,
      mobility.value,
      findings.value.remainingTeeth,
    ),
  )

  // Where the measured numbers fall, criterion by criterion.
  const stageReasons = computed(() =>
    stageSummary(
      interdentalCal.value,
      boneLoss.value,
      teethLost.value,
      complexity.value,
    ),
  )

  // The band each row of the staging table lands in on its own. A tick in
  // `inputs.stageMarks` overrides it, row by row.
  const autoMarks = computed(() =>
    autoStageMarks(
      interdentalCal.value,
      boneLoss.value,
      teethLost.value,
      complexityStage(
        probingDepth.value,
        furcation.value,
        mobility.value,
        findings.value.remainingTeeth,
      ),
    ),
  )

  const stage = computed(() => assessStage(inputs.stageMarks, autoMarks.value))

  const finalStage = computed(() => inputs.stageOverride ?? stage.value.stage)
  const stageOverridden = computed(
    () =>
      inputs.stageOverride !== null &&
      stage.value.stage !== null &&
      inputs.stageOverride !== stage.value.stage,
  )

  // How much of the mouth the chart says is involved, unless the doctor says
  // otherwise — the chart cannot see a pattern it has no readings for.
  const suggestedExtent = computed(() =>
    suggestExtent(findings.value.affectedToothIds, findings.value.affectedPercentage),
  )
  const extent = computed(() => inputs.extent ?? suggestedExtent.value)
  const extentOverridden = computed(
    () =>
      inputs.extent !== null &&
      suggestedExtent.value !== null &&
      inputs.extent !== suggestedExtent.value,
  )

  // Only the molar / incisor pattern, which the extent already counts off the
  // chart. Weighing destruction against biofilm has no cut-off in the table, so
  // the rest of this row is the doctor's.
  const suggestedPhenotype = computed(() => suggestPhenotype(extent.value))
  const phenotype = computed(() => inputs.phenotype ?? suggestedPhenotype.value)
  const phenotypeFromChart = computed(
    () => inputs.phenotype === null && suggestedPhenotype.value !== null,
  )
  const phenotypeOverridden = computed(
    () =>
      inputs.phenotype !== null &&
      suggestedPhenotype.value !== null &&
      inputs.phenotype !== suggestedPhenotype.value,
  )

  const grade = computed(() =>
    assessGrade({
      directEvidence: inputs.directEvidence,
      boneLossPercent: boneLoss.value,
      ageYears: age.value,
      phenotype: phenotype.value,
      phenotypeFromChart: phenotypeFromChart.value,
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

  // The rows with nothing to read yet, plus the extent — what stands between
  // the worksheet and a full diagnosis line.
  const missingStageInputs = computed(() => [
    ...stage.value.missing,
    ...(extent.value ? [] : ['extent and distribution']),
  ])

  const missingInputs = computed(() => [...missingStageInputs.value, ...grade.value.missing])

  const diagnosisTitle = computed(() => {
    const parts: string[] = []
    if (extent.value === 'molar-incisor') parts.push('Periodontitis, molar / incisor pattern')
    else if (extent.value) parts.push(`${EXTENT_LABEL[extent.value].split(' (')[0]} Periodontitis`)
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
    ageFromRecord,
    boneLoss,
    boneLossEstimated,
    teethLost,
    complexity,
    stageReasons,
    autoMarks,
    stage,
    suggestedExtent,
    extent,
    extentOverridden,
    suggestedPhenotype,
    phenotype,
    phenotypeFromChart,
    phenotypeOverridden,
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
