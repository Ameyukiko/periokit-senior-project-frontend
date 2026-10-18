

export type ExportFormat = 'pdf' | 'png' | 'xlsx'
export type Orientation = 'portrait' | 'landscape'
export type SectionId = 'patient' | 'chart' | 'diagnosis' | 'xray' | 'xrayNotes' | 'intraoral' | 'intraoralNotes'
export type PageSection = 'chart' | 'diagnosis' | 'xray' | 'intraoral'

export interface ExportState {
  format: ExportFormat
  paper: string
  pngScale: 96 | 150 | 300
  orient: Record<PageSection, Orientation>
  on: Record<SectionId, boolean>
  gray: boolean
}

export const SECTIONS: { id: SectionId; label: string; desc: string; locked?: boolean; parent?: SectionId }[] = [
  { id: 'patient', label: 'Patient & visit details', desc: 'Shown in the chart header, cannot be removed', locked: true },
  { id: 'chart', label: 'Periodontal chart', desc: 'Full chart as drawn on the chart page' },
  { id: 'diagnosis', label: 'Diagnosis', desc: 'Same as the Diagnosis page: stage and grade tables' },
  { id: 'xray', label: 'X-ray films', desc: '18-film FMX as placed on the board' },
  { id: 'xrayNotes', label: 'X-ray notes', desc: 'Notes placed among the films', parent: 'xray' },
  { id: 'intraoral', label: 'Intraoral photos', desc: '9 standard views as placed on the board' },
  { id: 'intraoralNotes', label: 'Intraoral notes', desc: 'Notes placed among the photos', parent: 'intraoral' },
]

export const PAPER_GROUPS: { label: string; sizes: { id: string; label: string }[] }[] = [
  { label: 'ISO A', sizes: [{ id: 'A3', label: 'A3 (297 × 420 mm)' }, { id: 'A4', label: 'A4 (210 × 297 mm)' }, { id: 'A5', label: 'A5 (148 × 210 mm)' }] },
  { label: 'ISO B', sizes: [{ id: 'B4', label: 'B4 (250 × 353 mm)' }, { id: 'B5', label: 'B5 (176 × 250 mm)' }] },
  { label: 'JIS B', sizes: [{ id: 'JIS-B4', label: 'JIS B4 (257 × 364 mm)' }, { id: 'JIS-B5', label: 'JIS B5 (182 × 257 mm)' }] },
  { label: 'North America', sizes: [{ id: 'Letter', label: 'Letter (8.5 × 11 in)' }, { id: 'Legal', label: 'Legal (8.5 × 14 in)' }, { id: 'Tabloid', label: 'Tabloid (11 × 17 in)' }, { id: 'Executive', label: 'Executive (7.25 × 10.5 in)' }] },
]

export const PAPER_MM: Record<string, [number, number]> = {
  A3: [297, 420], A4: [210, 297], A5: [148, 210], B4: [250, 353], B5: [176, 250], 'JIS-B4': [257, 364], 'JIS-B5': [182, 257],
  Letter: [215.9, 279.4], Legal: [215.9, 355.6], Tabloid: [279.4, 431.8], Executive: [184.15, 266.7],
}
export const mmToPx = (mm: number, dpi = 96) => Math.round((mm / 25.4) * dpi)

export function pagePx(paper: string, orient: Orientation): [number, number] {
  const [w, h] = PAPER_MM[paper]!.map((mm) => mmToPx(mm)) as [number, number]
  return orient === 'landscape' ? [h, w] : [w, h]
}
