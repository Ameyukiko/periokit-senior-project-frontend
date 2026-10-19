export type ExportFormat = 'pdf' | 'png' | 'excel'
export type Orientation = 'portrait' | 'landscape'
export type PaperSize =
  | 'a3' | 'a4' | 'a5'
  | 'b4' | 'b5'
  | 'jis-b4' | 'jis-b5'
  | 'letter' | 'legal' | 'tabloid' | 'executive'
export type PngDpi = 96 | 150 | 300
export type SectionId = 'chart' | 'diagnosis' | 'images' | 'imageNotes'

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
]

export type PaperGroup = 'ISO A' | 'ISO B' | 'JIS B' | 'North America'

export const PAPER_SIZES: { id: PaperSize; label: string; mm: [number, number]; group: PaperGroup }[] = [
  { id: 'a3', label: 'A3 (297 × 420 mm)', mm: [297, 420], group: 'ISO A' },
  { id: 'a4', label: 'A4 (210 × 297 mm)', mm: [210, 297], group: 'ISO A' },
  { id: 'a5', label: 'A5 (148 × 210 mm)', mm: [148, 210], group: 'ISO A' },
  { id: 'b4', label: 'B4 (250 × 353 mm)', mm: [250, 353], group: 'ISO B' },
  { id: 'b5', label: 'B5 (176 × 250 mm)', mm: [176, 250], group: 'ISO B' },
  { id: 'jis-b4', label: 'JIS B4 (257 × 364 mm)', mm: [257, 364], group: 'JIS B' },
  { id: 'jis-b5', label: 'JIS B5 (182 × 257 mm)', mm: [182, 257], group: 'JIS B' },
  { id: 'letter', label: 'Letter (8.5 × 11 in)', mm: [215.9, 279.4], group: 'North America' },
  { id: 'legal', label: 'Legal (8.5 × 14 in)', mm: [215.9, 355.6], group: 'North America' },
  { id: 'tabloid', label: 'Tabloid (11 × 17 in)', mm: [279.4, 431.8], group: 'North America' },
  { id: 'executive', label: 'Executive (7.25 × 10.5 in)', mm: [184.15, 266.7], group: 'North America' },
]

export const PAPER_GROUPS: PaperGroup[] = ['ISO A', 'ISO B', 'JIS B', 'North America']

export const mmToPx = (mm: number, dpi = 96) => Math.round((mm / 25.4) * dpi)
