import type { ToothId } from '@/domain/chart/chart.types'
import {
  DIABETES_LABEL,
  DIRECT_EVIDENCE_LABEL,
  FURCATION_CLASS,
  PHENOTYPE_LABEL,
  SMOKING_LABEL,
  type Diabetes,
  type DirectEvidence,
  type ExtentId,
  type GradeId,
  type Phenotype,
  type Smoking,
  type StageId,
  type StageRow,
} from './diagnosis.types'

export const STAGE_IDS: StageId[] = ['I', 'II', 'III', 'IV']
export const GRADE_IDS: GradeId[] = ['A', 'B', 'C']

// ── Stage: computed from the numbers, and overridable ─────────────────────────
// Each helper answers "which columns of the AAP/EFP table does this one number
// belong in", and a number can belong in more than one — interdental CAL of
// 6 mm reads as Stage III and Stage IV alike. `autoStageMarks` settles that by
// taking the lower band of the pair: what separates III from IV is tooth loss
// and complexity, which have rows of their own and can only raise the stage.
// A band the doctor ticks by hand wins over the one the numbers land in.

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

/**
 * The complexity band the measurements themselves read as. This cannot be taken
 * off `complexityFindings`, which lists a probing depth in every column it fits
 * so the table can show it there: 3 mm belongs under Stage I *and* Stage II,
 * and only the lowest of those is the complexity the patient actually has.
 */
export const complexityStage = (
  probingDepth: number | null,
  furcation: number | null,
  mobility: number | null,
  remainingTeeth: number,
): StageId | null => {
  let stage: StageId | null = null

  if (probingDepth !== null && probingDepth > 0) {
    stage = worseStage(stage, probingDepth <= 4 ? 'I' : probingDepth < 6 ? 'II' : 'III')
  }
  if (furcation !== null && furcation >= 2) stage = worseStage(stage, 'III')
  if (mobility !== null && mobility >= 2) stage = worseStage(stage, 'IV')
  if (remainingTeeth > 0 && remainingTeeth < 20) stage = worseStage(stage, 'IV')

  return stage
}

/** Of the bands a number fits, the lowest — complexity raises it from there. */
const lowestBand = (stages: StageId[]): StageId | null => stages[0] ?? null

/**
 * Where the measurements put each row of the staging table, so the doctor does
 * not have to tick what the numbers already say. Rows with nothing recorded stay
 * null, and `assessStage` treats a hand-ticked band as the answer instead.
 */
export const autoStageMarks = (
  cal: number | null,
  boneLossPercent: number | null,
  toothLoss: number | null,
  complexity: StageId | null,
): Record<StageRow, StageId | null> => ({
  cal: lowestBand(stagesForCal(cal)),
  boneLoss: lowestBand(stagesForBoneLoss(boneLossPercent)),
  toothLoss: lowestBand(stagesForToothLoss(toothLoss)),
  complexity,
})

const SEVERITY_ROWS: { row: StageRow; label: string }[] = [
  { row: 'cal', label: 'interdental CAL' },
  { row: 'boneLoss', label: 'radiographic bone loss' },
  { row: 'toothLoss', label: 'tooth loss due to periodontitis' },
]

export interface StageAssessment {
  /** null until at least one severity row has a number or a tick. */
  stage: StageId | null
  severity: StageId | null
  complexity: StageId | null
  reasons: string[]
  missing: string[]
  /** The band each row settled on, whether the numbers or the doctor put it there. */
  resolved: Record<StageRow, StageId | null>
}

const NO_MARKS: Record<StageRow, StageId | null> = {
  cal: null,
  boneLoss: null,
  toothLoss: null,
  complexity: null,
}

/**
 * The stage the table adds up to. Each row takes the doctor's tick if there is
 * one and the band its measurement falls in otherwise; severity is then the
 * worst band across the three severity rows, and complexity can raise that,
 * never lower it (AAP/EFP 2017). A table with no numbers and no ticks yields no
 * stage at all.
 */
export const assessStage = (
  marks: Record<StageRow, StageId | null>,
  auto: Record<StageRow, StageId | null> = NO_MARKS,
): StageAssessment => {
  const reasons: string[] = []
  const missing: string[] = []
  const bands: string[] = []
  const resolved = { ...NO_MARKS }

  let severity: StageId | null = null
  for (const { row, label } of SEVERITY_ROWS) {
    const mark = marks[row] ?? auto[row]
    resolved[row] = mark
    if (!mark) {
      missing.push(label)
      continue
    }
    bands.push(`${label} in Stage ${mark}${marks[row] ? ' — your tick' : ''}`)
    severity = worseStage(severity, mark)
  }

  const complexity = marks.complexity ?? auto.complexity
  resolved.complexity = complexity
  if (!complexity) missing.push('complexity')

  if (!severity) {
    return {
      stage: null,
      severity: null,
      complexity,
      reasons: [
        'Fill in interdental CAL, bone loss or tooth loss and the stage follows from those numbers. Ticking a band overrides what they say.',
      ],
      missing,
      resolved,
    }
  }

  const stage = worseStage(severity, complexity)
  reasons.push(`Severity is Stage ${severity} — the worst band on the table (${bands.join(', ')}).`)

  if (complexity) {
    reasons.push(
      stage === severity
        ? `Complexity reads as Stage ${complexity}, which does not raise it — complexity can raise the stage, never lower it.`
        : `Complexity is Stage ${complexity}, which raises the stage to ${stage}.`,
    )
  }

  if (missing.length) {
    reasons.push(
      `${missing.join(' and ')} not recorded yet — filling ${missing.length > 1 ? 'them' : 'it'} in may raise the stage, but cannot take it below ${stage}.`,
    )
  }

  return { stage, severity, complexity, reasons, missing, resolved }
}

// ── Extent: counted off the chart ─────────────────────────────────────────────

// FDI numbering puts the position in the second digit: 1–2 incisors, 3 canine,
// 4–5 premolars, 6–8 molars.
const isMolar = (toothId: ToothId) => toothId % 10 >= 6
const isIncisor = (toothId: ToothId) => toothId % 10 <= 2

/**
 * The extent the affected teeth read as. TAP 2023 puts the pattern as "molars
 * and/or incisors" — the affected teeth being confined to those, not both
 * groups having to be involved — and otherwise splits on 30% of the teeth.
 * Null when the chart has no affected tooth to count.
 */
export const suggestExtent = (
  affectedToothIds: ToothId[],
  affectedPercentage: number,
): ExtentId | null => {
  if (!affectedToothIds.length) return null

  if (affectedToothIds.every(id => isMolar(id) || isIncisor(id))) return 'molar-incisor'

  return affectedPercentage >= 30 ? 'generalized' : 'localized'
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

/**
 * The one case phenotype the chart can settle on its own. TAP 2023 names the
 * molar / incisor pattern in the Grade C cell itself, as a clinical pattern
 * suggestive of rapid progression, and the extent already counts it off the
 * chart.
 *
 * Nothing else is read here. The table gives the other two bands in words —
 * "heavy biofilm deposit with low levels of destruction", "destruction
 * commensurate with biofilm deposits" — and no plaque score to divide them at,
 * so weighing destruction against biofilm stays a judgement the doctor makes.
 */
export const suggestPhenotype = (extent: ExtentId | null): Phenotype | null =>
  extent === 'molar-incisor' ? 'exceeds' : null

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
  /** True when the phenotype above was read off the chart rather than answered. */
  phenotypeFromChart?: boolean
  smoking: Smoking | null
  diabetes: Diabetes | null
}

export interface GradeAssessment {
  /** Never null: TAP 2023 starts every case at Grade B. */
  grade: GradeId
  ratio: number | null
  ratioGrade: GradeId | null
  primary: GradeId
  modifier: GradeId | null
  reasons: string[]
  missing: string[]
}

export const assessGrade = (criteria: GradeCriteria): GradeAssessment => {
  const { directEvidence, boneLossPercent, ageYears, phenotype, smoking, diabetes } = criteria
  const phenotypeSource = criteria.phenotypeFromChart ? 'read off the chart' : 'you selected'

  const ratio =
    boneLossPercent !== null && ageYears !== null && ageYears > 0
      ? Math.round((boneLossPercent / ageYears) * 100) / 100
      : null
  const ratioGrade = gradeForRatio(ratio)
  const directGrade = gradeForDirectEvidence(directEvidence)
  const phenotypeGrade = gradeForPhenotype(phenotype)

  const reasons: string[] = []
  const missing: string[] = []

  // TAP 2023, the note under table 6: start every patient at Grade B, then move
  // it down to A or up to C on the evidence in the table. Direct evidence wins
  // whenever it exists — radiographs 5 years apart beat any estimate made from
  // a single visit.
  let primary: GradeId = 'B'
  if (directGrade) {
    primary = directGrade
    reasons.push(
      `Direct evidence over 5 years shows ${DIRECT_EVIDENCE_LABEL[directEvidence!].toLowerCase()}, which is the Grade ${directGrade} band.`,
    )
  } else {
    const indirect = worse(ratioGrade, phenotypeGrade)
    if (indirect) primary = indirect

    if (ratioGrade) {
      reasons.push(
        `No radiographs 5 years apart, so the grade comes from indirect evidence — ${boneLossPercent}% bone loss ÷ ${ageYears} years = ${ratio}, in the Grade ${ratioGrade} band.`,
      )
    }
    if (phenotypeGrade) {
      reasons.push(
        `The case phenotype ${phenotypeSource} (${PHENOTYPE_LABEL[phenotype!].toLowerCase()}) reads as Grade ${phenotypeGrade}.`,
      )
    }
    if (!indirect) {
      missing.push('direct evidence, % bone loss ÷ age, or case phenotype')
      reasons.push(
        'No evidence of progression recorded yet, so the case sits at Grade B — the band every patient starts in until something moves it.',
      )
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

  // Modifiers raise the grade the primary criteria arrived at; they never pull
  // it back down (TAP 2023: "หากผู้ป่วยมีปัจจัยเสี่ยงเพิ่มเติม … ให้สามารถปรับ
  // เพิ่ม grade ได้"), which is why this is `worse` and not an average.
  const grade = worse(primary, modifier) as GradeId

  return { grade, ratio, ratioGrade, primary, modifier, reasons, missing }
}
