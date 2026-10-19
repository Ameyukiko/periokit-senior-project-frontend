export type PrognosisReferenceType = 'MN' | 'KC'

export interface PrognosisReferenceRow {
  prognosis: string
  description: string
  prognosisClass: string
}

export interface PrognosisReference {
  title: string
  badgeClass: string
  detailHeader: string
  rows: PrognosisReferenceRow[]
}

export const PROGNOSIS_REFERENCES: Record<PrognosisReferenceType, PrognosisReference> = {
  MN: {
    title: 'McGuire and Nunn (M&N)',
    badgeClass: 'bg-red-500',
    detailHeader: 'Criteria',
    rows: [
      {
        prognosis: 'Good',
        prognosisClass: 'text-green-600 bg-green-50/30',
        description: 'Control of etiologic factors and enough support to enable the tooth to be maintained by the patient and clinician.',
      },
      {
        prognosis: 'Fair',
        prognosisClass: 'text-blue-600 bg-blue-50/30',
        description: '~25% attachment loss, Class I furcation. Adequate maintenance possible.',
      },
      {
        prognosis: 'Poor',
        prognosisClass: 'text-yellow-600 bg-yellow-50/30',
        description: '50% attachment loss, Class II furcation. Maintenance difficult.',
      },
      {
        prognosis: 'Questionable',
        prognosisClass: 'text-orange-600 bg-orange-50/30',
        description: '> 50% attachment loss, Class II/III furcation, Class II mobility, poor crown/root ratio.',
      },
      {
        prognosis: 'Hopeless',
        prognosisClass: 'text-red-600 bg-red-50/30',
        description: 'Severe attachment loss; extraction suggested.',
      },
    ],
  },
  KC: {
    title: 'Kwok and Caton (K&C)',
    badgeClass: 'bg-blue-500',
    detailHeader: 'Classification',
    rows: [
      {
        prognosis: 'Favorable',
        prognosisClass: 'text-green-600 bg-green-50/30',
        description: 'Can be stabilized with treatment/maintenance; less chance of breakdown.',
      },
      {
        prognosis: 'Questionable',
        prognosisClass: 'text-orange-600 bg-orange-50/30',
        description: 'Influenced by local/systemic factors that may or may not be controlled.',
      },
      {
        prognosis: 'Unfavorable',
        prognosisClass: 'text-red-600 bg-red-50/30',
        description: 'Influenced by factors that cannot be controlled; maintenance unlikely.',
      },
      {
        prognosis: 'Hopeless',
        prognosisClass: 'text-black bg-slate-50/30',
        description: 'Must be extracted.',
      },
    ],
  },
}
