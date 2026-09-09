import type { ToothId } from '@/domain/chart/chart.types'

/**
 * Average root length in millimetres, by tooth position in FDI numbering
 * (the second digit; left and right of the same arch share a figure). Population
 * means from dental anatomy — Ash & Nelson, Wheeler's Dental Anatomy — and not
 * a measurement of any one patient.
 */
const UPPER_ROOT_LENGTH_MM: Record<number, number> = {
  1: 13.0, // central incisor
  2: 13.4, // lateral incisor
  3: 17.0, // canine
  4: 14.0, // first premolar
  5: 14.0, // second premolar
  6: 13.0, // first molar
  7: 12.5, // second molar
  8: 11.0, // third molar
}

const LOWER_ROOT_LENGTH_MM: Record<number, number> = {
  1: 12.5,
  2: 14.0,
  3: 16.0,
  4: 14.0,
  5: 14.5,
  6: 14.0,
  7: 13.0,
  8: 11.0,
}

/** Quadrants 1 and 2 are the upper arch, 3 and 4 the lower. */
export const averageRootLength = (toothId: ToothId): number | null => {
  const quadrant = Math.floor(toothId / 10)
  const position = toothId % 10
  const table = quadrant <= 2 ? UPPER_ROOT_LENGTH_MM : LOWER_ROOT_LENGTH_MM
  return table[position] ?? null
}

/**
 * Radiographic bone loss estimated from attachment loss, as the percentage of
 * the root that the loss covers — the %RBL = A / B × 100 of the TAP 2023
 * worksheet, with attachment loss standing in for A and an average root length
 * for B.
 *
 * This is an estimate and not a reading of a radiograph: it assumes a root of
 * average length and bone following the attachment level. Where a radiograph
 * has been measured, that figure should replace it.
 */
export const estimateBoneLossPercent = (
  interdentalCalMm: number | null,
  toothId: ToothId | null,
): number | null => {
  if (interdentalCalMm === null || interdentalCalMm <= 0 || toothId === null) return null

  const rootLength = averageRootLength(toothId)
  if (!rootLength) return null

  return Math.min(100, Math.round((interdentalCalMm / rootLength) * 1000) / 10)
}
