import type { ToothId } from '@/domain/chart/chart.types'

// AAP / EFP 2017 staging and grading of periodontitis.
// Everything in this file either reads the chart or places a single criterion
// in its band — see diagnosis.rules.ts for what the app concludes from those
// bands, and for the ticks and overrides that let the doctor say otherwise.

export type StageId = 'I' | 'II' | 'III' | 'IV'
export type GradeId = 'A' | 'B' | 'C'
export type ExtentId = 'localized' | 'generalized' | 'molar-incisor'

export type DirectEvidence = 'no-loss' | 'lt-2mm' | 'gte-2mm'
export type Phenotype = 'heavy-biofilm' | 'commensurate' | 'exceeds'
export type Smoking = 'non-smoker' | 'lt-10' | 'gte-10'
export type Diabetes = 'none' | 'hba1c-lt-7' | 'hba1c-gte-7'

/** A value together with the tooth and site it was recorded at, e.g. 6 mm at #26 MB. */
export interface SiteFinding {
  value: number
  toothId: ToothId
  site: string
}

/** A whole-tooth grade (mobility, furcation) and the tooth carrying it. */
export interface ToothFinding {
  grade: number
  toothId: ToothId
}

/** What the periodontal chart already answers, before the doctor types anything. */
export interface ChartFindings {
  interdentalCal: SiteFinding | null
  probingDepth: SiteFinding | null
  furcation: ToothFinding | null
  mobility: ToothFinding | null
  missingTeeth: ToothId[]
  remainingTeeth: number
  affectedTeeth: number
  /** Which teeth those are — the molar / incisor pattern is read off them. */
  affectedToothIds: ToothId[]
  affectedPercentage: number
  plaquePercentage: number
  bopPercentage: number
}

/** The rows of the staging table the doctor can tick a band in. */
export type StageRow = 'cal' | 'boneLoss' | 'toothLoss' | 'complexity'

/** One cell of the grading table, which stands for one of the grade inputs. */
export type GradeChoice =
  | { field: 'directEvidence'; value: DirectEvidence | null }
  | { field: 'phenotype'; value: Phenotype | null }
  | { field: 'smoking'; value: Smoking | null }
  | { field: 'diabetes'; value: Diabetes | null }

/**
 * Everything the doctor decides on this page. The four clinical measurements
 * are overrides: null means "use the chart's value", a number means the doctor
 * typed something else over it.
 */
export interface DiagnosisInputs {
  interdentalCalMm: number | null
  probingDepthMm: number | null
  furcationGrade: number | null
  mobilityGrade: number | null
  // Worst-site radiographic bone loss. Feeds the stage's severity band and the
  // grade's % bone loss ÷ age, so it is asked for once.
  boneLossPercent: number | null
  teethLostToPerio: number | null
  extent: ExtentId | null
  // The band the doctor ticked on each row of the staging table. null means the
  // row keeps the band its measurement falls in; a value overrides that reading
  // for that row alone. The stage is worked out from the two together.
  stageMarks: Record<StageRow, StageId | null>
  // null = keep the stage the ticked bands arrive at; a value = the doctor's own call.
  stageOverride: StageId | null
  stageReason: string

  directEvidence: DirectEvidence | null
  ageYears: number | null
  phenotype: Phenotype | null
  smoking: Smoking | null
  diabetes: Diabetes | null
  // null = keep the grade the criteria arrived at; a value = the doctor's own call.
  gradeOverride: GradeId | null
  gradeReason: string
}

export const EXTENT_LABEL: Record<ExtentId, string> = {
  localized: 'Localized (< 30%)',
  generalized: 'Generalized (≥ 30%)',
  'molar-incisor': 'Molar / incisor pattern',
}

export const DIRECT_EVIDENCE_LABEL: Record<DirectEvidence, string> = {
  'no-loss': 'No loss over 5 years',
  'lt-2mm': '< 2 mm over 5 years',
  'gte-2mm': '≥ 2 mm over 5 years',
}

export const PHENOTYPE_LABEL: Record<Phenotype, string> = {
  'heavy-biofilm': 'Heavy biofilm, low destruction',
  commensurate: 'Commensurate',
  exceeds: 'Destruction exceeds expectation',
}

export const SMOKING_LABEL: Record<Smoking, string> = {
  'non-smoker': 'Non-smoker',
  'lt-10': '< 10 cig/day',
  'gte-10': '≥ 10 cig/day',
}

export const DIABETES_LABEL: Record<Diabetes, string> = {
  none: 'None',
  'hba1c-lt-7': 'HbA1c < 7.0%',
  'hba1c-gte-7': 'HbA1c ≥ 7.0%',
}

export const FURCATION_CLASS = ['None', 'Class I', 'Class II', 'Class III']
