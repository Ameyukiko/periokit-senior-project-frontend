import { defineStore } from 'pinia'
import { computed } from 'vue'
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
  // Empty until the radiograph has been read. Nothing stands in for it: %RBL is
  // a measurement off the film, and the chart's estimate is a prompt beside the
  // field rather than a value in it.
  boneLossPercent: null,
  // null means "use the chart's count of missing teeth".
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

export const useDiagnosisStore = defineStore(
  'diagnosis',
  () => {
    const chartStore = usePeriodontalChartStore()

    /**
     * One worksheet per visit, kept apart and kept between sessions. The
     * switching, the storage and the "as last saved" copy are all in there —
     * this store is about what the answers mean, not about where they live.
     */
    const {
      records,
      savedSnapshots,
      currentKey,
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
      // Written by a version of this store that kept the whole worksheet under
      // one key; cleared out on sign-out so it cannot outlive the account.
      legacyKeys: ['diagnosis'],
    })

    // Backward-compatibility alias
    const visitKey = computed(() => currentKey.value)

    const hasChanges = computed(() => {
      return (
        inputs.boneLossPercent !== null ||
        inputs.teethLostToPerio !== null ||
        inputs.extent !== null ||
        inputs.stageMarks.cal !== null ||
        inputs.stageMarks.boneLoss !== null ||
        inputs.stageMarks.toothLoss !== null ||
        inputs.stageMarks.complexity !== null ||
        inputs.directEvidence !== null ||
        inputs.ageYears !== null ||
        inputs.phenotype !== null ||
        inputs.smoking !== null ||
        inputs.diabetes !== null
      )
    })

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

  // Only what was read off the film. The chart's estimate used to fall in
  // behind an empty field, which counted the same attachment loss twice — once
  // in the CAL row of the staging table and again here — and because severity
  // takes the worst row, the second count could only ever raise the stage.
  // 2 mm of CAL on a 13 mm root is the case definition in the CAL row and 15.4%
  // in this one, which is already Stage II. The estimate is offered beside the
  // field instead, for the doctor to accept or ignore.
  const boneLoss = computed(() => inputs.boneLossPercent)

  /** What the chart makes of the worst interdental site, offered as a prompt. */
  const estimatedBoneLoss = computed(() => findings.value.estimatedBoneLossPercent)

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

  // The stage is never set by hand. It follows the four rows of the staging
  // table, and the way to move it is to tick the row that reads differently —
  // then the stage on the record still has its criteria standing behind it.
  const finalStage = computed(() => stage.value.stage)

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

  // As with the stage: never set by hand. The grade is what the criteria above
  // arrive at, and the way to move it is to change the answer that reads wrong.
  const finalGrade = computed(() => grade.value.grade)

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
    parts.push(`Grade ${finalGrade.value}`)
    return parts.join(', ')
  })

  // The grade is never missing — TAP 2023 starts every case at Grade B — so the
  // stage is what stands between the worksheet and a diagnosis line.
  const isClassified = computed(() => Boolean(finalStage.value))

  /** Point the worksheet at a visit, loading its recorded inputs if any exist. */
  function openFor(visitOrKey?: string | null, patientId?: string | null) {
    openDraft(resolveDiagnosisKey(visitOrKey, patientId))
  }

  function hydrateFromBackend(response: Parameters<typeof fromDiagnosisResponseDto>[0]) {
    replaceInputs(fromDiagnosisResponseDto(response))
  }

  return {
    records,
    savedSnapshots,
    currentKey,
    inputs,
    visitKey,
    isDirty,
    hasChanges,
    findings,
    interdentalCal,
    probingDepth,
    furcation,
    mobility,
    age,
    ageFromRecord,
    boneLoss,
    estimatedBoneLoss,
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
    grade,
    finalGrade,
    missingStageInputs,
    missingInputs,
    diagnosisTitle,
    isClassified,
    openFor,
    resetInputs,
    rekey,
    hydrateFromBackend,
    commitSaved,
    revertToSaved,
    clearAll,
  }
},
{
  persist: {
    storage: localStorage,
    pick: ['records', 'savedSnapshots'],
  },
})

registerSessionClearListener(() => {
  const store = useDiagnosisStore()
  store.clearAll()
})
