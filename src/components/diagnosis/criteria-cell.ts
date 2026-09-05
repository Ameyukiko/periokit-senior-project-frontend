// The shading the two criteria tables share, so a cell means the same thing in
// both. A cell holding the answer reads as a pressed button whether the numbers
// put it there or the doctor ticked it — at a glance what the row says matters
// more than who said it. A tick of the doctor's own keeps a ring on top, so an
// override stays traceable without sitting at a different height.

export const CELL_BASE = 'px-3 py-2.5 align-top border border-slate-300 transition-all duration-150'

/** No answer yet, and open to being ticked. */
export const CELL_OPEN = 'border-dashed hover:border-solid hover:border-blue-300'

/** The band this row settled on. */
export const CELL_ANSWERED =
  'bg-[#FECE44] text-slate-900 font-bold border-t-2 border-t-white/80 border-b-[3px] border-b-amber-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_3px_5px_rgba(217,119,6,0.3)]'

/** The same, plus the ring that says the doctor put it there by hand. */
export const CELL_TICKED = `${CELL_ANSWERED} ring-1 ring-amber-500`

/** Not this row's answer, but sitting under the stage or grade in force. */
export const CELL_IN_COLUMN = 'bg-[#FECE44]/30 text-slate-900 border-x-2 border-x-[#FECE44]'

export const CELL_IDLE = 'text-black hover:bg-blue-100/70'
