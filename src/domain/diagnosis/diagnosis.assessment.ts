import {
  assessGrade,
  assessStage,
  autoStageMarks,
  complexityFindings,
  complexityStage,
  stageSummary,
  suggestExtent,
  suggestPhenotype,
} from './diagnosis.rules'
import { EXTENT_LABEL, type ChartFindings, type DiagnosisInputs } from './diagnosis.types'

/**
 * Builds the complete diagnosis view model from recorded chart findings and
 * the clinician's inputs. It has no Vue or persistence concerns, so the same
 * clinical path can be verified without constructing a Pinia store.
 */
export function deriveDiagnosisAssessment(
  inputs: DiagnosisInputs,
  findings: ChartFindings,
  recordedAge: number | null,
) {
  const hasChanges =
    inputs.boneLossPercent !== null ||
    inputs.teethLostToPerio !== null ||
    inputs.extent !== null ||
    Object.values(inputs.stageMarks).some(mark => mark !== null) ||
    inputs.directEvidence !== null ||
    inputs.ageYears !== null ||
    inputs.phenotype !== null ||
    inputs.smoking !== null ||
    inputs.diabetes !== null

  const interdentalCal = findings.interdentalCal?.value ?? null
  const probingDepth = findings.probingDepth?.value ?? null
  const furcation = findings.furcation?.grade ?? null
  const mobility = findings.mobility?.grade ?? null
  const age = recordedAge ?? inputs.ageYears ?? null
  const ageFromRecord = recordedAge !== null
  const boneLoss = inputs.boneLossPercent
  const teethLost = inputs.teethLostToPerio

  const complexity = complexityFindings(
    probingDepth,
    furcation,
    mobility,
    findings.remainingTeeth,
  )
  const stageReasons = stageSummary(interdentalCal, boneLoss, teethLost, complexity)
  const autoMarks = autoStageMarks(
    interdentalCal,
    boneLoss,
    teethLost,
    complexityStage(probingDepth, furcation, mobility, findings.remainingTeeth),
  )
  const stage = assessStage(inputs.stageMarks, autoMarks)
  const finalStage = stage.stage

  const suggestedExtent = suggestExtent(
    findings.affectedToothIds,
    findings.affectedPercentage,
  )
  const extent = inputs.extent ?? suggestedExtent
  const extentOverridden =
    inputs.extent !== null && suggestedExtent !== null && inputs.extent !== suggestedExtent

  const suggestedPhenotype = suggestPhenotype(extent)
  const phenotype = inputs.phenotype ?? suggestedPhenotype
  const phenotypeFromChart = inputs.phenotype === null && suggestedPhenotype !== null
  const phenotypeOverridden =
    inputs.phenotype !== null &&
    suggestedPhenotype !== null &&
    inputs.phenotype !== suggestedPhenotype

  const grade = assessGrade({
    directEvidence: inputs.directEvidence,
    boneLossPercent: boneLoss,
    ageYears: age,
    phenotype,
    phenotypeFromChart,
    smoking: inputs.smoking,
    diabetes: inputs.diabetes,
  })
  const finalGrade = grade.grade
  const missingStageInputs = [
    ...stage.missing,
    ...(extent ? [] : ['extent and distribution']),
  ]
  const missingInputs = [...missingStageInputs, ...grade.missing]

  const titleParts: string[] = []
  if (extent === 'molar-incisor') {
    titleParts.push('Periodontitis, molar / incisor pattern')
  } else if (extent) {
    titleParts.push(`${EXTENT_LABEL[extent].split(' (')[0]} Periodontitis`)
  } else {
    titleParts.push('Periodontitis')
  }
  if (finalStage) titleParts.push(`Stage ${finalStage}`)
  titleParts.push(`Grade ${finalGrade}`)

  return {
    hasChanges,
    interdentalCal,
    probingDepth,
    furcation,
    mobility,
    age,
    ageFromRecord,
    boneLoss,
    teethLost,
    complexity,
    stageReasons,
    autoMarks,
    stage,
    finalStage,
    suggestedExtent,
    extent,
    extentOverridden,
    suggestedPhenotype,
    phenotype,
    phenotypeFromChart,
    phenotypeOverridden,
    grade,
    finalGrade,
    missingStageInputs,
    missingInputs,
    diagnosisTitle: titleParts.join(', '),
    isClassified: Boolean(finalStage),
  }
}

export type DiagnosisAssessment = ReturnType<typeof deriveDiagnosisAssessment>
