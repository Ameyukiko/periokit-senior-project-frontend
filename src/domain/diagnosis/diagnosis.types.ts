import type { ToothId } from '@/domain/chart/chart.types'

// AAP / EFP 2017 staging and grading of periodontitis.
// Everything in this file either reads the chart or places a single criterion
// in its band — see diagnosis.rules.ts for what the app concludes from those
// bands, and for the ticks that let the doctor say a reading belongs elsewhere.

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
  /**
   * Whether the readings meet the TAP 2023 case definition of periodontitis.
   * False means the chart alone does not show a case — the exclusions it cannot
   * see are still the doctor's to weigh.
   */
  meetsCaseDefinition: boolean
  /**
   * Bone loss worked out from attachment loss against an average root length,
   * standing in for the radiograph the app does not hold. Null when the chart
   * records no interdental attachment loss to work from.
   */
  estimatedBoneLossPercent: number | null
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
 * Everything the doctor decides on this page. Notably absent are CAL, probing
 * depth, furcation and mobility: those are measurements, and the chart is where
 * they are recorded and corrected. This page reads them and never writes them,
 * so a diagnosis can never cite a number the record does not hold. Disagreeing
 * with what a measurement implies is done by ticking a band in `stageMarks`,
 * which keeps the reading intact and the judgement visible.
 */
export interface DiagnosisInputs {
  // Worst-site radiographic bone loss, read off the film. Feeds the stage's
  // severity band and the grade's % bone loss ÷ age, so it is asked for once.
  // null means "use the estimate the chart works out from attachment loss".
  boneLossPercent: number | null
  // null means "use the chart's tally of missing teeth". The chart knows which
  // teeth are gone but never why they went — caries, ortho and trauma leave the
  // same gap — so its count is the starting point and the doctor corrects it
  // down to the ones periodontitis took.
  teethLostToPerio: number | null
  extent: ExtentId | null
  // The band the doctor ticked on each row of the staging table. null means the
  // row keeps the band its measurement falls in; a value overrides that reading
  // for that row alone. The stage is worked out from the two together, and there
  // is no separate override for it: disagreeing with the stage means saying which
  // row reads differently, so the answer always has its criteria behind it.
  stageMarks: Record<StageRow, StageId | null>

  directEvidence: DirectEvidence | null
  // Age belongs to the patient record, and the record always wins. This is only
  // a stand-in for a record that carries no age at all, so the % bone loss ÷ age
  // ratio can still be worked out — it never overrides an age already on file.
  ageYears: number | null
  // The four answers the grading table is worked out from. As with the stage,
  // the grade itself is not stored: it is what these arrive at, so disagreeing
  // with it means changing the answer that reads wrong.
  phenotype: Phenotype | null
  smoking: Smoking | null
  diabetes: Diabetes | null
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

/**
 * What the answer means for the patient — how far the disease has already gone
 * and what treating it now involves. The tables above the result already show
 * which criteria produced it, row by row; this is the part they never say.
 */
export const STAGE_MEANING: Record<StageId, string> = {
  I: 'Initial periodontitis. Attachment loss has only just crossed out of health, the bone is still intact to the coronal third, and no tooth has been lost. The damage is real but nothing yet is beyond holding: cleaning the root surfaces and getting home care right is normally the whole of the treatment.',
  II: 'Moderate periodontitis. Attachment and bone loss are established, but they are still confined to the coronal third of the root, pockets stay shallow enough to reach and every tooth is still firm and in place. Treatment remains non-surgical; what changes is that recall has to be kept to.',
  III: 'Severe periodontitis with the potential for further tooth loss. Destruction now reaches the middle of the root and beyond — deep pockets, furcation involvement, or teeth already lost to the disease. Some sites will not resolve by cleaning alone and will need surgery, and each remaining tooth needs a prognosis of its own.',
  IV: 'Severe periodontitis with the dentition itself at risk. On top of Stage III damage the bite has started to break down — drifting, flaring, loose teeth, too few teeth left to chew on. Treating the gums is no longer enough on its own; the mouth needs rehabilitating as a whole.',
}

export const GRADE_MEANING: Record<GradeId, string> = {
  A: 'Slow rate of progression. What has been lost took a long time to go, and nothing in the record is pushing it along. The stage above says how much damage there is; this says it is unlikely to move much before the next recall.',
  B: 'Moderate rate of progression — the rate expected of untreated periodontitis. Destruction has kept pace with the deposits causing it and no risk factor is driving it faster. Standard treatment, with recall set by the stage.',
  C: 'Rapid rate of progression. Either the destruction runs ahead of what the biofilm explains, or smoking or diabetes is driving it. Expect it to keep moving without a shorter recall interval, and treat the risk factor as part of the periodontal treatment rather than beside it.',
}
