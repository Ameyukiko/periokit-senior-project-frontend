export type ExportFormat = 'pdf' | 'png' | 'excel'
export type Orientation = 'portrait' | 'landscape'
export type PaperSize = 'a4' | 'letter' | 'legal'
export type PngDpi = 96 | 150 | 300
export type SectionId = 'chart' | 'diagnosis' | 'images' | 'imageNotes' | 'notes'

export interface ExportState {
  format: ExportFormat
  paper: PaperSize
  pngDpi: PngDpi
  orient: Record<SectionId, Orientation>
  on: Record<SectionId, boolean>
  gray: boolean
}

export const SECTIONS: { id: SectionId; label: string; desc: string; parent?: SectionId }[] = [
  { id: 'chart', label: 'Periodontal chart', desc: 'Full chart as drawn on the chart page' },
  { id: 'diagnosis', label: 'Diagnosis', desc: 'Same as the Diagnosis page: stage and grade tables' },
  { id: 'images', label: 'X-ray & intraoral photos', desc: 'Films and photos as placed on the board' },
  { id: 'imageNotes', label: 'X-ray notes', desc: 'Notes placed among the films and photos', parent: 'images' },
  { id: 'notes', label: 'Notes', desc: 'Patient, visit and tooth notes' },
]

export const PAPER_SIZES: { id: PaperSize; label: string; mm: [number, number] }[] = [
  { id: 'a4', label: 'A4 (210 × 297 mm)', mm: [210, 297] },
  { id: 'letter', label: 'Letter (8.5 × 11 in)', mm: [215.9, 279.4] },
  { id: 'legal', label: 'Legal (8.5 × 14 in)', mm: [215.9, 355.6] },
]

export const mmToPx = (mm: number, dpi = 96) => Math.round((mm / 25.4) * dpi)
