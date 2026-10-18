import type { ToothId } from '@/domain/chart/chart.types'






export type StageId = 'I' | 'II' | 'III' | 'IV'
export type GradeId = 'A' | 'B' | 'C'
export type ExtentId = 'localized' | 'generalized' | 'molar-incisor'

export type DirectEvidence = 'no-loss' | 'lt-2mm' | 'gte-2mm'
export type Phenotype = 'heavy-biofilm' | 'commensurate' | 'exceeds'
export type Smoking = 'non-smoker' | 'lt-10' | 'gte-10'
export type Diabetes = 'none' | 'hba1c-lt-7' | 'hba1c-gte-7'


export interface SiteFinding {
  value: number
  toothId: ToothId
  site: string
}


export interface ToothFinding {
  grade: number
  toothId: ToothId
}


export interface ChartFindings {





  meetsCaseDefinition: boolean
  interdentalCal: SiteFinding | null
  probingDepth: SiteFinding | null
  furcation: ToothFinding | null
  mobility: ToothFinding | null
  missingTeeth: ToothId[]
  remainingTeeth: number
  affectedTeeth: number

  affectedToothIds: ToothId[]
  affectedPercentage: number
  plaquePercentage: number
  bopPercentage: number
}


export type StageRow = 'cal' | 'boneLoss' | 'toothLoss' | 'complexity'


export type GradeChoice =
  | { field: 'directEvidence'; value: DirectEvidence | null }
  | { field: 'phenotype'; value: Phenotype | null }
  | { field: 'smoking'; value: Smoking | null }
  | { field: 'diabetes'; value: Diabetes | null }









export interface DiagnosisInputs {



  boneLossPercent: number | null




  teethLostToPerio: number | null
  extent: ExtentId | null





  stageMarks: Record<StageRow, StageId | null>

  directEvidence: DirectEvidence | null



  ageYears: number | null



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






export const STAGE_MEANING: Record<StageId, string> = {
  I: 'Initial periodontitis. Attachment loss has only just crossed out of health, the bone is still intact to the coronal third, and no tooth has been lost. The damage is real but nothing yet is beyond holding: cleaning the root surfaces and getting home care right is normally the whole of the treatment.',
  II: 'Moderate periodontitis. Attachment and bone loss are established, but they are still confined to the coronal third of the root, pockets stay shallow enough to reach and every tooth is still firm and in place. Treatment remains non-surgical; what changes is that recall has to be kept to.',
  III: 'Severe periodontitis with the potential for further tooth loss. Destruction extends to the middle of the root and beyond, with deep pockets, furcation involvement, or teeth already lost to the disease. Some sites may require periodontal surgery, and remaining teeth need individual prognosis.',
  IV: 'Severe periodontitis with dentition itself at risk. In addition to Stage III damage, masticatory dysfunction has occurred with tooth mobility, drifting, flaring, or bite collapse. Periodontal therapy must be combined with complex oral rehabilitation.',
}

export const GRADE_MEANING: Record<GradeId, string> = {
  A: 'Slow rate of progression. What has been lost took a long time to go, and nothing in the record is pushing it along. The stage above says how much damage there is; this says it is unlikely to move much before the next recall.',
  B: 'Moderate rate of progression, typical of periodontitis where tissue destruction corresponds with biofilm deposits without accelerating risk factors. Standard treatment with recall interval set by stage.',
  C: 'Rapid rate of progression. Either the destruction runs ahead of what the biofilm explains, or smoking or diabetes is driving it. Expect it to keep moving without a shorter recall interval, and treat the risk factor as part of the periodontal treatment rather than beside it.',
}
