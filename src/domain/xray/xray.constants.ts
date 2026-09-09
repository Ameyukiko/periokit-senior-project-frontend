import type { FmxSlot } from './xray.types'

/** Smallest on-board size of an object, in world pixels. */
export const MIN_OBJECT_SIZE = 40

export const MIN_SCALE = 0.08
export const MAX_SCALE = 8
/** Fit never zooms past this, so a single small film doesn't blow up. */
export const FIT_MAX_SCALE = 2
export const FIT_PADDING = 40

export const HISTORY_MAX = 30

/** Longest side an added image gets on the board, before the user resizes it. */
export const IMAGE_MAX_LONG_SIDE = 420
/**
 * How far each film of a batch is stepped from the one before it. Films dropped
 * exactly on top of each other look like a single film, so a doctor who adds 18
 * at once would think the other 17 never arrived (SRS-232).
 */
export const IMAGE_CASCADE_OFFSET = 28

/**
 * What an upload may be. Checked here to spare the user a long upload that ends
 * in a rejection — it does not stand in for the server's own check, which is
 * the one that counts (SRS-208, SRS-211).
 */
export const UPLOAD_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const UPLOAD_MAX_MB = 10
export const UPLOAD_MAX_BYTES = UPLOAD_MAX_MB * 1024 * 1024
/** Same list, in the form the file picker wants. */
export const UPLOAD_ACCEPT_ATTR = UPLOAD_ACCEPTED_TYPES.join(',')

/** How far outside a slot a film may be dropped and still snap in. */
export const SLOT_SNAP_TOLERANCE = 24
/** Breathing room left around a film once it is mounted in a slot. */
export const SLOT_PADDING = 10

export const NOTE_COLORS = [
  '#fde68a', '#fdba74', '#fca5a5', '#f9a8d4', '#e9d5ff', '#c7d2fe',
  '#bfdbfe', '#a5f3fc', '#a7f3d0', '#bbf7d0', '#e2e8f0', '#ffffff',
]
export const NOTE_DEFAULT_COLOR = NOTE_COLORS[0]
export const NOTE_DEFAULT_SIZE = { w: 180, h: 120 }
export const NOTE_FONT = { min: 10, max: 44, step: 2, default: 14 }

export const GRID_SIZE = 24

/**
 * Full-mouth series (FMX) template — 18 films, world coordinates centred on
 * (0,0). Board left is the patient's right, following the usual film-mounting
 * convention.
 */
export const FMX_SLOTS: FmxSlot[] = (() => {
  const PA = { w: 328, h: 244 } // posterior periapical
  const AN = { w: 200, h: 292 } // anterior periapical
  const BW = { w: 232, h: 328 } // bitewing

  /**
   * `teeth` is the FDI numbering of what the film is taken to cover, so a slot
   * says which teeth it answers for rather than only where it sits on the
   * mount. Ranges follow the usual 18-film prescription and overlap between
   * neighbouring films the way the films themselves do.
   */
  const row = (
    y: number,
    xs: number[],
    size: { w: number; h: number },
    films: [string, number[]][],
  ): Omit<FmxSlot, 'id' | 'code'>[] =>
    xs.map((x, i) => ({
      x, y, w: size.w, h: size.h, label: films[i][0], teeth: films[i][1],
    }))

  return [
    ...row(-488, [-672, -336, 336, 672], PA, [
      ['Upper Right Post.', [18, 17, 16]],
      ['Upper Right Mid.', [15, 14, 13]],
      ['Upper Left Mid.', [23, 24, 25]],
      ['Upper Left Post.', [26, 27, 28]],
    ]),
    ...row(-212, [-208, 0, 208], AN, [
      ['Upper Ant. R', [13, 12]],
      ['Upper Ant. C', [11, 21]],
      ['Upper Ant. L', [22, 23]],
    ]),
    ...row(-63, [-672, -428, 428, 672], BW, [
      ['BW Right Post.', [17, 16, 47, 46]],
      ['BW Right Ant.', [15, 14, 45, 44]],
      ['BW Left Ant.', [24, 25, 34, 35]],
      ['BW Left Post.', [26, 27, 36, 37]],
    ]),
    ...row(86, [-208, 0, 208], AN, [
      ['Lower Ant. R', [43, 42]],
      ['Lower Ant. C', [41, 31]],
      ['Lower Ant. L', [32, 33]],
    ]),
    ...row(362, [-672, -336, 336, 672], PA, [
      ['Lower Right Post.', [48, 47, 46]],
      ['Lower Right Mid.', [45, 44, 43]],
      ['Lower Left Mid.', [33, 34, 35]],
      ['Lower Left Post.', [36, 37, 38]],
    ]),
  ].map((slot, index) => ({ ...slot, id: index + 1, code: String(index + 1) }))
})()

/**
 * Intraoral photograph template — the nine standard views, laid out below the
 * FMX films on the same board so one canvas holds the whole visit's imaging.
 * Codes are prefixed `io-` rather than continuing the FMX numbering: a board
 * saved before this template existed points at bare numbers, and those must
 * keep meaning the film slot they meant then.
 */
export const INTRAORAL_SLOTS: FmxSlot[] = (() => {
  const PHOTO = { w: 440, h: 330 }
  /** Clear of the lowest FMX film (y 484) with a gap the eye reads as a break. */
  const TOP = 820
  const COLS = [-500, 0, 500]
  const ROWS: string[][] = [
    ['Upper Right (Palatal)', 'Upper Occlusal', 'Upper Left (Palatal)'],
    ['Right (Buccal)', 'Front (Buccal)', 'Left (Buccal)'],
    ['Lower Right (Lingual)', 'Lower Occlusal', 'Lower Left (Lingual)'],
  ]

  return ROWS.flatMap((labels, rowIndex) =>
    labels.map((label, colIndex) => {
      const index = rowIndex * 3 + colIndex
      return {
        id: index + 1,
        code: `io-${index + 1}`,
        x: COLS[colIndex],
        y: TOP + rowIndex * (PHOTO.h + 60),
        w: PHOTO.w,
        h: PHOTO.h,
        label,
      }
    }),
  )
})()

/** Every slot a film or photo can be mounted in, FMX first. */
export const BOARD_SLOTS: FmxSlot[] = [...FMX_SLOTS, ...INTRAORAL_SLOTS]

/**
 * Where the rule between the two templates is drawn, in world coordinates —
 * inside the empty band between the lowest film (bottom edge 484) and the
 * topmost photograph (top edge 655), so the line never crosses a slot. Showing
 * both templates then reads as two boards rather than one long grid.
 */
export const LAYOUT_DIVIDER_Y = 570

/** localStorage keys for view preferences that are not part of a board. */
export const XRAY_PREF_KEYS = {
  canvasTheme: 'periokit.xray.canvasTheme',
  toolbar: 'periokit.xray.toolbar',
  noteColors: 'periokit.xray.noteColors',
} as const
