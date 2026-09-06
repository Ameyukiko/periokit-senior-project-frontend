import type {
  DiagnosisInputs,
  DirectEvidence,
  Diabetes,
  ExtentId,
  Phenotype,
  Smoking,
  StageId,
} from './diagnosis.types'

export interface DiagnosisComplexityInputDto {
  boneLossPercent: number | null
  teethLostToPerio: number | null
  directEvidence: 'no_loss' | 'lt_2mm' | 'gte_2mm' | null
  phenotype: 'heavy_biofilm' | 'commensurate' | 'exceeds' | null
  smoking: 'non_smoker' | 'lt_10' | 'gte_10' | null
  diabetes: 'none' | 'hba1c_lt_7' | 'hba1c_gte_7' | null
  ageYears: number | null
  complexityStageOverride: 'stage_1' | 'stage_2' | 'stage_3' | 'stage_4' | null
}

export interface DiagnosisInputDto {
  extent: 'localized' | 'generalized' | 'molar_incisor' | null
  complexity: DiagnosisComplexityInputDto
}

export interface DiagnosisResponseDto {
  extent: DiagnosisInputDto['extent']
  complexity: DiagnosisComplexityInputDto
}

const stageToApi: Record<StageId, DiagnosisComplexityInputDto['complexityStageOverride']> = {
  I: 'stage_1', II: 'stage_2', III: 'stage_3', IV: 'stage_4',
}
const stageFromApi: Record<NonNullable<DiagnosisComplexityInputDto['complexityStageOverride']>, StageId> = {
  stage_1: 'I', stage_2: 'II', stage_3: 'III', stage_4: 'IV',
}

export function toDiagnosisInputDto(inputs: DiagnosisInputs): DiagnosisInputDto {
  return {
    extent: inputs.extent === 'molar-incisor' ? 'molar_incisor' : inputs.extent,
    complexity: {
      boneLossPercent: finiteOrNull(inputs.boneLossPercent),
      teethLostToPerio: integerOrNull(inputs.teethLostToPerio),
      directEvidence: toApiValue(inputs.directEvidence, { 'no-loss': 'no_loss', 'lt-2mm': 'lt_2mm', 'gte-2mm': 'gte_2mm' }),
      phenotype: toApiValue(inputs.phenotype, { 'heavy-biofilm': 'heavy_biofilm', commensurate: 'commensurate', exceeds: 'exceeds' }),
      smoking: toApiValue(inputs.smoking, { 'non-smoker': 'non_smoker', 'lt-10': 'lt_10', 'gte-10': 'gte_10' }),
      diabetes: toApiValue(inputs.diabetes, { none: 'none', 'hba1c-lt-7': 'hba1c_lt_7', 'hba1c-gte-7': 'hba1c_gte_7' }),
      ageYears: integerOrNull(inputs.ageYears),
      complexityStageOverride: inputs.stageMarks.complexity ? stageToApi[inputs.stageMarks.complexity] : null,
    },
  }
}

export function fromDiagnosisResponseDto(response: DiagnosisResponseDto): Partial<DiagnosisInputs> {
  const c = response.complexity
  return {
    extent: response.extent === 'molar_incisor' ? 'molar-incisor' : response.extent,
    boneLossPercent: c.boneLossPercent,
    teethLostToPerio: c.teethLostToPerio,
    directEvidence: fromApiValue(c.directEvidence, { no_loss: 'no-loss', lt_2mm: 'lt-2mm', gte_2mm: 'gte_2mm' }) as DirectEvidence | null,
    phenotype: fromApiValue(c.phenotype, { heavy_biofilm: 'heavy-biofilm', commensurate: 'commensurate', exceeds: 'exceeds' }) as Phenotype | null,
    smoking: fromApiValue(c.smoking, { non_smoker: 'non-smoker', lt_10: 'lt-10', gte_10: 'gte-10' }) as Smoking | null,
    diabetes: fromApiValue(c.diabetes, { none: 'none', hba1c_lt_7: 'hba1c-lt-7', hba1c_gte_7: 'hba1c-gte-7' }) as Diabetes | null,
    ageYears: c.ageYears,
    stageMarks: { cal: null, boneLoss: null, toothLoss: null, complexity: c.complexityStageOverride ? stageFromApi[c.complexityStageOverride] : null },
  }
}

function finiteOrNull(value: number | null) { return value !== null && Number.isFinite(value) ? value : null }
function integerOrNull(value: number | null) { return value !== null && Number.isInteger(value) ? value : null }
function toApiValue<T extends string, U extends string>(value: T | null, map: Record<T, U>): U | null { return value === null ? null : map[value] }
function fromApiValue<T extends string, U extends string>(value: T | null, map: Record<T, U>): U | null { return value === null ? null : map[value] }
