


import { LOWER_TEETH, UPPER_TEETH } from '@/domain/chart/chart.constants'
import type { ChartData, Surface, ToothData } from '@/domain/chart/chart.types'

export interface SheetCell { v: string | number; cls?: string; span?: number }
export type SheetRow = Record<number, SheetCell>
export interface ChartSheet { rows: SheetRow[]; columns: number }

export const SHEET_COLUMNS = 60

const STATS_COL = 52
const firstToothCol = 3

export const colName = (i: number) => {
  let n = ''
  for (i++; i > 0; i = Math.floor((i - 1) / 26)) n = String.fromCharCode(65 + ((i - 1) % 26)) + n
  return n
}

const num = (v: string) => Number.parseInt(v, 10)
const present = (t: ToothData | undefined): t is ToothData => !!t && !t.extracted


export function sheetCode(phase: string, visitNumber: number | undefined) {
  return `${/after/i.test(phase) ? 'H' : 'B'}${visitNumber ?? 1}`
}

export function buildChartSheet(chart: ChartData, code: string): ChartSheet {
  const rows: SheetRow[] = []
  const row = () => { const r: SheetRow = {}; rows.push(r); return r }
  const label = (r: SheetRow, a: string, b?: string) => {
    r[1] = { v: a, cls: 'font-bold bg-slate-100 text-left' }
    if (b !== undefined) r[2] = { v: b, cls: 'bg-slate-50 text-left' }
  }
  const eachTooth = (arch: number[], fn: (t: ToothData, col: number, id: number) => void) =>
    arch.forEach((id, i) => { const t = chart[id]; if (present(t)) fn(t, firstToothCol + i * 3, id) })

  const sites = (arch: number[], surf: Surface, key: 'pd' | 'rec' | 'cal' | 'bop') => {
    const r = row()
    eachTooth(arch, (t, c) => t[surf][key].forEach((raw, j) => {
      if (key === 'bop') { if (raw) r[c + j] = { v: 1, cls: 'bg-red-100 text-red-700' }; return }
      const v = num(raw as string)
      if (Number.isNaN(v)) return
      r[c + j] = { v, cls: key === 'pd' && v >= 5 ? 'text-red-600 font-bold' : '' }
    }))
    return r
  }
  const perTooth = (arch: number[], fn: (t: ToothData | undefined, id: number) => string | number, cls = '') => {
    const r = row()
    arch.forEach((id, i) => { r[firstToothCol + i * 3] = { v: fn(chart[id], id), cls, span: 3 } })
    return r
  }
  const furcation = (arch: number[], surf: Surface) => {
    const r = row()
    eachTooth(arch, (t, c) => t.fur[surf].forEach((g, j) => { if (g) r[c + j] = { v: g, cls: 'bg-amber-50' } }))
    return r
  }
  const ktw = (arch: number[], surf: Surface) => perTooth(arch, (t) => (present(t) ? t[surf].ktw : ''))
  const mobility = (arch: number[]) => perTooth(arch, (t) => (present(t) ? t.mo : ''))
  const numbers = (arch: number[]) => perTooth(arch, (_, id) => id, 'font-bold bg-blue-50 text-[#0052ff]')
  const missing = (arch: number[]) => perTooth(arch, (t) => (present(t) ? '' : 'x'), 'text-slate-500 font-bold')

  const U = UPPER_TEETH
  const L = LOWER_TEETH
  row()
  label(furcation(U, 'buccal'), 'Furcation Involvement')
  label(ktw(U, 'buccal'), 'Keratinized Tissue Width')
  label(sites(U, 'buccal', 'bop'), 'BOP')
  label(sites(U, 'buccal', 'cal'), 'Buccal', 'CAL')
  label(sites(U, 'buccal', 'pd'), '', 'PD')
  label(sites(U, 'buccal', 'rec'), '', 'GR')
  label(mobility(U), 'Mobility')
  label(numbers(U), 'Upper arch')
  missing(U)
  label(sites(U, 'lingual', 'rec'), 'Palatal', 'GR')
  label(sites(U, 'lingual', 'pd'), '', 'PD')
  label(sites(U, 'lingual', 'cal'), '', 'CAL')
  label(sites(U, 'lingual', 'bop'), 'BOP')
  label(furcation(U, 'lingual'), 'Furcation Involvement')
  row()
  label(furcation(L, 'lingual'), 'Furcation Involvement')
  label(sites(L, 'lingual', 'bop'), 'BOP')
  label(sites(L, 'lingual', 'cal'), 'Lingual', 'CAL')
  label(sites(L, 'lingual', 'pd'), '', 'PD')
  label(sites(L, 'lingual', 'rec'), '', 'GR')
  missing(L)
  label(numbers(L), 'Lower arch')
  label(mobility(L), 'Mobility')
  label(sites(L, 'buccal', 'rec'), 'Buccal', 'GR')
  label(sites(L, 'buccal', 'pd'), '', 'PD')
  label(sites(L, 'buccal', 'cal'), '', 'CAL')
  label(sites(L, 'buccal', 'bop'), 'BOP')
  label(ktw(L, 'buccal'), 'Keratinized Tissue Width')
  label(furcation(L, 'buccal'), 'Furcation Involvement')

  addStatistics(rows, chart, code)
  return { rows, columns: SHEET_COLUMNS }
}


function addStatistics(rows: SheetRow[], chart: ChartData, code: string) {
  const teeth = Object.values(chart).filter(present)
  const all = teeth.flatMap((t) => (['buccal', 'lingual'] as const).flatMap((s) =>
    [0, 1, 2].map((i) => ({ pd: num(t[s].pd[i]!), cal: num(t[s].cal[i]!), bop: t[s].bop[i], pi: t[s].pi[i] }))))
  const n = all.length || 1
  const pct = (v: number) => ((v / n) * 100).toFixed(1)
  const mean = (k: 'pd' | 'cal') => (all.reduce((a, z) => a + (Number.isNaN(z[k]) ? 0 : z[k]), 0) / n).toFixed(2)
  const bucket = (k: 'pd' | 'cal', lo: number, hi: number) => all.filter((z) => z[k] >= lo && z[k] <= hi).length
  const mob = (m: number) => teeth.filter((t) => num(t.mo) === m).length
  const bi = pct(all.filter((z) => z.bop).length)
  const pi = pct(all.filter((z) => z.pi).length)

  const H = 'font-bold bg-emerald-50'
  const set = (r: number, c: number, v: string | number, cls = '') => { rows[r]![STATS_COL + c] = { v, cls } }
  set(1, 0, code, H)
  ;[['Mean PD', mean('pd')], ['Mean CAL', mean('cal')], ['BI', bi], ['PI', pi]].forEach(([k, v], i) => {
    set(1, 1 + i, k!, H)
    set(2, 1 + i, v!)
  })
  ;['จำนวนซี่', 'CAL', 'sites', '%', '', 'PD', 'sites', '%'].forEach((h, i) => h && set(6, i, h, H))
  set(7, 0, teeth.length)
  set(8, 0, all.length)
  ;([['<=0', -99, 0], ['1-2', 1, 2], ['3-4', 3, 4], ['5+', 5, 99]] as const).forEach(([k, lo, hi], i) => {
    const cal = bucket('cal', lo, hi)
    const pd = bucket('pd', lo, hi)
    set(7 + i, 1, k); set(7 + i, 2, cal); set(7 + i, 3, pct(cal))
    set(7 + i, 5, k); set(7 + i, 6, pd); set(7 + i, 7, pct(pd))
  })
  ;['Mobility', 'ซี่', '%'].forEach((h, i) => set(12, 1 + i, h, H))
  ;['1st', '2nd', '3rd'].forEach((k, i) => {
    set(13 + i, 1, k)
    set(13 + i, 2, mob(i + 1))
    set(13 + i, 3, teeth.length ? ((mob(i + 1) / teeth.length) * 100).toFixed(1) : '0.0')
  })
  set(17, 1, 'BI', H); set(17, 2, bi)
  set(21, 1, 'PI', H); set(21, 2, pi)
}


export function buildSitesRows(chart: ChartData) {
  const out: (string | number)[][] = []
  for (const id of [...UPPER_TEETH, ...LOWER_TEETH]) {
    const t = chart[id]
    if (!present(t)) continue
    const upper = UPPER_TEETH.includes(id)
    const inner = upper ? ['MP', 'P', 'DP'] : ['ML', 'L', 'DL']
    for (const [surf, name, pos] of [['buccal', 'buccal', ['MB', 'B', 'DB']], ['lingual', upper ? 'palatal' : 'lingual', inner]] as const)
      pos.forEach((p, i) => out.push([id, name, p, t[surf].pd[i]!, t[surf].rec[i]!, t[surf].cal[i]!, +t[surf].bop[i]!, +t[surf].pi[i]!, t.mo, t.fur[surf][i] ?? '']))
  }
  return out
}
export const SITES_HEAD = ['tooth_number', 'surface', 'position', 'pd', 'gingival_margin', 'cal', 'bop', 'plaque', 'mobility', 'furcation']
