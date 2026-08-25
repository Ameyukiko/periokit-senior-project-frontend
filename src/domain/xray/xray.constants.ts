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

  const row = (
    y: number,
    xs: number[],
    size: { w: number; h: number },
    labels: string[],
  ): Omit<FmxSlot, 'id'>[] =>
    xs.map((x, i) => ({ x, y, w: size.w, h: size.h, label: labels[i] }))

  return [
    ...row(-488, [-672, -336, 336, 672], PA, [
      'Upper Right Post.', 'Upper Right Mid.', 'Upper Left Mid.', 'Upper Left Post.',
    ]),
    ...row(-212, [-208, 0, 208], AN, ['Upper Ant. R', 'Upper Ant. C', 'Upper Ant. L']),
    ...row(-63, [-672, -428, 428, 672], BW, [
      'BW Right Post.', 'BW Right Ant.', 'BW Left Ant.', 'BW Left Post.',
    ]),
    ...row(86, [-208, 0, 208], AN, ['Lower Ant. R', 'Lower Ant. C', 'Lower Ant. L']),
    ...row(362, [-672, -336, 336, 672], PA, [
      'Lower Right Post.', 'Lower Right Mid.', 'Lower Left Mid.', 'Lower Left Post.',
    ]),
  ].map((slot, index) => ({ ...slot, id: index + 1 }))
})()

/** localStorage keys for view preferences that are not part of a board. */
export const XRAY_PREF_KEYS = {
  canvasTheme: 'periokit.xray.canvasTheme',
  toolbar: 'periokit.xray.toolbar',
  noteColors: 'periokit.xray.noteColors',
} as const
