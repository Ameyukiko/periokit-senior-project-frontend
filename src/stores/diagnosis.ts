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

export const useDiagnosisStore = defineStore('diagnosis', () => {
  const chartStore = usePeriodontalChartStore()

  /**
   * One worksheet per visit, kept apart and kept between sessions. The
   * switching, the storage and the "as last saved" copy are all in there —
   * this store is about what the answers mean, not about where they live.
   */
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
    // Written by an older persistence owner. It has no reader now and is
    // removed during store setup and sign-out.
    legacyKeys: ['diagnosis'],
  })

  const findings = computed(() => collectChartFindings(chartStore.teethData))
  const assessment = computed(() =>
    deriveDiagnosisAssessment(inputs, findings.value, chartStore.patientInfo.age),
  )
  const selectAssessment = <K extends keyof DiagnosisAssessment>(key: K) =>
    computed(() => assessment.value[key])
  const hasChanges = selectAssessment('hasChanges')

  // Straight off the chart. Measurements can only be changed there, so a
  // diagnosis can never quote a different number from the clinical record.
  const interdentalCal = selectAssessment('interdentalCal')
  const probingDepth = selectAssessment('probingDepth')
  // The record first, always: an age on file cannot be typed over here. The
  // input behind it only fills the gap when the record carries no age, so the
  // grade's % bone loss ÷ age is not blocked by a record nobody can reach.
  const age = selectAssessment('age')
  const ageFromRecord = selectAssessment('ageFromRecord')

  // Only what was read off the film. The chart's estimate used to fall in
  // behind an empty field, which counted the same attachment loss twice — once
  // in the CAL row of the staging table and again here — and because severity
  // takes the worst row, the second count could only ever raise the stage.
  // 2 mm of CAL on a 13 mm root is the case definition in the CAL row and 15.4%
  // in this one, which is already Stage II. The estimate is offered beside the
  // field instead, for the doctor to accept or ignore.
  const boneLoss = selectAssessment('boneLoss')

  // Note C under TAP 2023 table 5: tooth loss counts towards the stage only
  // where it is known for certain to have been periodontitis that took the
  // tooth. The chart records the gap, never the cause, so its tally is offered
  // beside the field as a prompt and nothing is assumed until the doctor answers.
  const teethLost = selectAssessment('teethLost')

  const complexity = selectAssessment('complexity')

  // The band each row of the staging table lands in on its own. A tick in
  // `inputs.stageMarks` overrides it, row by row.
  const stage = selectAssessment('stage')

  // The stage is never set by hand. It follows the four rows of the staging
  // table, and the way to move it is to tick the row that reads differently —
  // then the stage on the record still has its criteria standing behind it.
  const finalStage = selectAssessment('finalStage')

  // How much of the mouth the chart says is involved, unless the doctor says
  // otherwise — the chart cannot see a pattern it has no readings for.
  const suggestedExtent = selectAssessment('suggestedExtent')
  const extent = selectAssessment('extent')
  const extentOverridden = selectAssessment('extentOverridden')

  // Only the molar / incisor pattern, which the extent already counts off the
  // chart. Weighing destruction against biofilm has no cut-off in the table, so
  // the rest of this row is the doctor's.
  const suggestedPhenotype = selectAssessment('suggestedPhenotype')
  const phenotype = selectAssessment('phenotype')
  const phenotypeFromChart = selectAssessment('phenotypeFromChart')
  const grade = selectAssessment('grade')

  // As with the stage: never set by hand. The grade is what the criteria above
  // arrive at, and the way to move it is to change the answer that reads wrong.
  const finalGrade = selectAssessment('finalGrade')

  const diagnosisTitle = selectAssessment('diagnosisTitle')

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
