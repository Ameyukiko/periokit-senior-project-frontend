import {
  DIABETES_LABEL,
  DIRECT_EVIDENCE_LABEL,
  FURCATION_CLASS,
  PHENOTYPE_LABEL,
  SMOKING_LABEL,
  type Diabetes,
  type DirectEvidence,
  type GradeId,
  type Phenotype,
  type Smoking,
  type StageId,
  type StageRow,
} from './diagnosis.types'

export const STAGE_IDS: StageId[] = ['I', 'II', 'III', 'IV']
export const GRADE_IDS: GradeId[] = ['A', 'B', 'C']

// ── Stage: bands from the numbers, the stage from the ticks ───────────────────
// Each helper answers "which columns of the AAP/EFP table does this one number
// belong in", and a number can belong in more than one — interdental CAL of
// 6 mm reads as Stage III and Stage IV alike. Nothing here picks between them;
// the stage comes from `assessStage`, out of the bands the doctor ticked, never
// straight out of the chart.

export const stagesForCal = (mm: number | null): StageId[] => {
  if (mm === null || mm <= 0) return []
  if (mm <= 2) return ['I']
  if (mm <= 4) return ['II']
  return ['III', 'IV']
}

export const stagesForBoneLoss = (percent: number | null): StageId[] => {
  if (percent === null) return []
  if (percent < 15) return ['I']
  if (percent <= 33) return ['II']
  return ['III', 'IV']
}

export const stagesForToothLoss = (count: number | null): StageId[] => {
  if (count === null) return []
  if (count === 0) return ['I', 'II']
  if (count <= 4) return ['III']
  return ['IV']
}

/**
 * Complexity features, in the column each one belongs to. Complexity can raise
 * the stage but never lower it, so these read as "and this is also true of the
 * patient" rather than as an answer.
 */
export const complexityFindings = (
  probingDepth: number | null,
  furcation: number | null,
  mobility: number | null,
  remainingTeeth: number,
): Record<StageId, string[]> => {
  const found: Record<StageId, string[]> = { I: [], II: [], III: [], IV: [] }

  if (probingDepth !== null && probingDepth > 0) {
    if (probingDepth <= 4) found.I.push(`Max PD ${probingDepth} mm`)
    if (probingDepth <= 5) found.II.push(`Max PD ${probingDepth} mm`)
    if (probingDepth >= 6) found.III.push(`Max PD ${probingDepth} mm`)
  }
  if (furcation !== null && furcation >= 2) {
    found.III.push(`Furcation ${FURCATION_CLASS[furcation]}`)
  }
  if (mobility !== null && mobility >= 2) {
    found.IV.push(`Mobility ${mobility}`)
  }
  if (remainingTeeth > 0 && remainingTeeth < 20) {
    found.IV.push(`${remainingTeeth} teeth remaining`)
  }

  return found
}

const worseStage = (a: StageId | null, b: StageId | null): StageId | null => {
  if (!a) return b
  if (!b) return a
  return STAGE_IDS.indexOf(a) >= STAGE_IDS.indexOf(b) ? a : b
}

const SEVERITY_ROWS: { row: StageRow; label: string }[] = [
  { row: 'cal', label: 'interdental CAL' },
  { row: 'boneLoss', label: 'radiographic bone loss' },
  { row: 'toothLoss', label: 'tooth loss due to periodontitis' },
]

export interface StageAssessment {
  /** null until at least one severity row is ticked. */
  stage: StageId | null
  severity: StageId | null
  complexity: StageId | null
  reasons: string[]
  missing: string[]
}

/**
 * The stage the ticked bands add up to. Severity is the worst band ticked
 * across the three severity rows; complexity can raise that, never lower it
 * (AAP/EFP 2017). Nothing is read out of the chart here — an untouched table
 * yields no stage at all.
 */
export const assessStage = (marks: Record<StageRow, StageId | null>): StageAssessment => {
  const reasons: string[] = []
  const missing: string[] = []
  const ticked: string[] = []

  let severity: StageId | null = null
  for (const { row, label } of SEVERITY_ROWS) {
    const mark = marks[row]
    if (!mark) {
      missing.push(label)
      continue
    }
    ticked.push(`${label} in Stage ${mark}`)
    severity = worseStage(severity, mark)
  }

  const complexity = marks.complexity
  if (!complexity) missing.push('complexity')

  if (!severity) {
    return {
      stage: null,
      severity: null,
      complexity,
      reasons: ['Tick a band on the severity rows and the stage follows from what you ticked.'],
      missing,
    }
  }

  const stage = worseStage(severity, complexity)
  reasons.push(
    `Severity is Stage ${severity} — the worst band you ticked (${ticked.join(', ')}).`,
  )

  if (complexity) {
    reasons.push(
      stage === severity
        ? `The complexity you ticked is Stage ${complexity}, which does not raise it — complexity can raise the stage, never lower it.`
        : `Complexity is Stage ${complexity}, which raises the stage to ${stage}.`,
    )
  }

  if (missing.length) {
    reasons.push(
      `${missing.join(' and ')} not ticked yet — ticking ${missing.length > 1 ? 'them' : 'it'} may raise the stage, but cannot take it below ${stage}.`,
    )
  }

  return { stage, severity, complexity, reasons, missing }
}

/** Where each measured number falls, criterion by criterion. */
export const stageSummary = (
  cal: number | null,
  boneLoss: number | null,
  toothLoss: number | null,
  complexity: Record<StageId, string[]>,
): string[] => {
  const lines: string[] = []
  const band = (stages: StageId[]) =>
    stages.length > 1 ? `Stage ${stages[0]}–${stages[stages.length - 1]}` : `Stage ${stages[0]}`

  const cals = stagesForCal(cal)
  if (cals.length) lines.push(`Interdental CAL of ${cal} mm sits in ${band(cals)}.`)

  const bones = stagesForBoneLoss(boneLoss)
  if (bones.length) lines.push(`Radiographic bone loss of ${boneLoss}% sits in ${band(bones)}.`)

  const losses = stagesForToothLoss(toothLoss)
  if (losses.length) {
    lines.push(
      toothLoss === 0
        ? `No tooth loss from periodontitis, which fits ${band(losses)}.`
        : `${toothLoss} ${toothLoss === 1 ? 'tooth' : 'teeth'} lost to periodontitis fits ${band(losses)}.`,
    )
  }

  const complexityLines = STAGE_IDS.filter(stage => stage !== 'I' && complexity[stage].length).map(
    stage => `${complexity[stage].join(' and ')} (Stage ${stage})`,
  )
  if (complexityLines.length) lines.push(`Complexity adds ${complexityLines.join(', ')}.`)

  return lines
}

// ── Grade: computed, and overridable ──────────────────────────────────────────
// Every case starts at Grade B. Primary criteria move it to A or C; risk
// factors can only shift it upward, never down.

const DIRECT_GRADE: Record<DirectEvidence, GradeId> = {
  'no-loss': 'A',
  'lt-2mm': 'B',
  'gte-2mm': 'C',
}

const PHENOTYPE_GRADE: Record<Phenotype, GradeId> = {
  'heavy-biofilm': 'A',
  commensurate: 'B',
  exceeds: 'C',
}

const SMOKING_GRADE: Record<Smoking, GradeId> = {
  'non-smoker': 'A',
  'lt-10': 'B',
  'gte-10': 'C',
}

const DIABETES_GRADE: Record<Diabetes, GradeId> = {
  none: 'A',
  'hba1c-lt-7': 'B',
  'hba1c-gte-7': 'C',
}

export const gradeForDirectEvidence = (value: DirectEvidence | null) =>
  value ? DIRECT_GRADE[value] : null
export const gradeForPhenotype = (value: Phenotype | null) => (value ? PHENOTYPE_GRADE[value] : null)
export const gradeForSmoking = (value: Smoking | null) => (value ? SMOKING_GRADE[value] : null)
export const gradeForDiabetes = (value: Diabetes | null) => (value ? DIABETES_GRADE[value] : null)

export const gradeForRatio = (ratio: number | null): GradeId | null => {
  if (ratio === null) return null
  if (ratio < 0.25) return 'A'
  if (ratio <= 1) return 'B'
  return 'C'
}

const worse = (a: GradeId | null, b: GradeId | null): GradeId | null => {
  if (!a) return b
  if (!b) return a
  return GRADE_IDS.indexOf(a) >= GRADE_IDS.indexOf(b) ? a : b
}

export interface GradeCriteria {
  directEvidence: DirectEvidence | null
  boneLossPercent: number | null
  ageYears: number | null
  phenotype: Phenotype | null
  smoking: Smoking | null
  diabetes: Diabetes | null
}

export interface GradeAssessment {
  /** null while the inputs cannot decide between A, B and C. */
  grade: GradeId | null
  ratio: number | null
  ratioGrade: GradeId | null
  primary: GradeId | null
  modifier: GradeId | null
  reasons: string[]
  missing: string[]
}

export const assessGrade = (criteria: GradeCriteria): GradeAssessment => {
  const { directEvidence, boneLossPercent, ageYears, phenotype, smoking, diabetes } = criteria

  const ratio =
    boneLossPercent !== null && ageYears !== null && ageYears > 0
      ? Math.round((boneLossPercent / ageYears) * 100) / 100
      : null
  const ratioGrade = gradeForRatio(ratio)
  const directGrade = gradeForDirectEvidence(directEvidence)
  const phenotypeGrade = gradeForPhenotype(phenotype)

  const reasons: string[] = []
  const missing: string[] = []

  // Direct evidence wins whenever it exists — radiographs 5 years apart beat
  // any estimate made from a single visit.
  let primary: GradeId | null = null
  if (directGrade) {
    primary = directGrade
    reasons.push(
      `Direct evidence over 5 years shows ${DIRECT_EVIDENCE_LABEL[directEvidence!].toLowerCase()}, which is the Grade ${directGrade} band.`,
    )
  } else {
    primary = worse(ratioGrade, phenotypeGrade)
    if (ratioGrade) {
      reasons.push(
        `No radiographs 5 years apart, so the grade comes from indirect evidence — ${boneLossPercent}% bone loss ÷ ${ageYears} years = ${ratio}, in the Grade ${ratioGrade} band.`,
      )
    }
    if (phenotypeGrade) {
      reasons.push(
        `The case phenotype you selected (${PHENOTYPE_LABEL[phenotype!].toLowerCase()}) reads as Grade ${phenotypeGrade}.`,
      )
    }
    if (!primary) {
      missing.push('direct evidence, % bone loss ÷ age, or case phenotype')
    }
  }

  const smokingGrade = gradeForSmoking(smoking)
  const diabetesGrade = gradeForDiabetes(diabetes)
  const modifier = worse(smokingGrade, diabetesGrade)

  if (smoking) {
    reasons.push(
      smoking === 'non-smoker'
        ? 'Non-smoker, so smoking shifts nothing.'
        : `Smoking ${SMOKING_LABEL[smoking].toLowerCase()} is a Grade ${smokingGrade} modifier.`,
    )
  } else {
    missing.push('smoking')
  }

  if (diabetes) {
    reasons.push(
      diabetes === 'none'
        ? 'No diabetes recorded, so nothing shifts the grade there.'
        : `${DIABETES_LABEL[diabetes]} in a patient with diabetes is a Grade ${diabetesGrade} modifier.`,
    )
  } else {
    missing.push('diabetes')
  }

  // Modifiers raise the grade the primary criteria arrived at; they never
  // pull it back down, which is why this is `worse` and not an average.
  const grade = primary ? worse(primary, modifier) : null

  return { grade, ratio, ratioGrade, primary, modifier, reasons, missing }
}
