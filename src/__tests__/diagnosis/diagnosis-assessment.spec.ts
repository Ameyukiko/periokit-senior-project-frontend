import { describe, expect, it } from 'vitest'
import { deriveDiagnosisAssessment } from '@/domain/diagnosis/diagnosis.assessment'
import type { ChartFindings, DiagnosisInputs } from '@/domain/diagnosis/diagnosis.types'

const emptyInputs = (): DiagnosisInputs => ({
  boneLossPercent: null,
  teethLostToPerio: null,
  extent: null,
  stageMarks: { cal: null, boneLoss: null, toothLoss: null, complexity: null },
  directEvidence: null,
  ageYears: null,
  phenotype: null,
  smoking: null,
  diabetes: null,
})

const emptyFindings = (): ChartFindings => ({
  meetsCaseDefinition: false,
  interdentalCal: null,
  probingDepth: null,
  furcation: null,
  mobility: null,
  missingTeeth: [],
  remainingTeeth: 28,
  affectedTeeth: 0,
  affectedToothIds: [],
  affectedPercentage: 0,
  plaquePercentage: 0,
  bopPercentage: 0,
})

describe('Diagnosis assessment', () => {
  it('derives one consistent classification from chart findings and inputs', () => {
    const inputs: DiagnosisInputs = {
      ...emptyInputs(),
      boneLossPercent: 40,
      teethLostToPerio: 2,
      directEvidence: 'gte-2mm',
      ageYears: 50,
      smoking: 'non-smoker',
      diabetes: 'none',
    }
    const findings: ChartFindings = {
      ...emptyFindings(),
      interdentalCal: { value: 5, toothId: 11, site: 'MB' },
      probingDepth: { value: 6, toothId: 21, site: 'DB' },
      furcation: { grade: 2, toothId: 16 },
      mobility: { grade: 2, toothId: 11 },
      remainingTeeth: 18,
      affectedTeeth: 2,
      affectedToothIds: [11, 21],
      affectedPercentage: 11,
    }

    const assessment = deriveDiagnosisAssessment(inputs, findings, 60)

    expect(assessment).toMatchObject({
      hasChanges: true,
      interdentalCal: 5,
      probingDepth: 6,
      age: 60,
      ageFromRecord: true,
      boneLoss: 40,
      teethLost: 2,
      finalStage: 'IV',
      suggestedExtent: 'molar-incisor',
      extent: 'molar-incisor',
      suggestedPhenotype: 'exceeds',
      phenotype: 'exceeds',
      phenotypeFromChart: true,
      finalGrade: 'C',
      diagnosisTitle: 'Periodontitis, molar / incisor pattern, Stage IV, Grade C',
      isClassified: true,
    })
  })

  it('keeps an empty worksheet unclassified at the default Grade B', () => {
    const assessment = deriveDiagnosisAssessment(emptyInputs(), emptyFindings(), null)

    expect(assessment.hasChanges).toBe(false)
    expect(assessment.finalStage).toBeNull()
    expect(assessment.finalGrade).toBe('B')
    expect(assessment.diagnosisTitle).toBe('Periodontitis, Grade B')
    expect(assessment.missingInputs).toContain('extent and distribution')
    expect(assessment.isClassified).toBe(false)
  })

  it('reports clinician overrides against chart suggestions', () => {
    const inputs = {
      ...emptyInputs(),
      phenotype: 'commensurate' as const,
    }
    const findings = {
      ...emptyFindings(),
      affectedTeeth: 2,
      affectedToothIds: [11, 21] as ChartFindings['affectedToothIds'],
      affectedPercentage: 11,
    }

    const assessment = deriveDiagnosisAssessment(inputs, findings, null)

    expect(assessment.suggestedPhenotype).toBe('exceeds')
    expect(assessment.phenotype).toBe('commensurate')
    expect(assessment.phenotypeFromChart).toBe(false)
    expect(assessment.phenotypeOverridden).toBe(true)
  })
})
