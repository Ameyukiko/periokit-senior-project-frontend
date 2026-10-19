import { UserCheck, UserMinus, Trash2, RotateCcw, Shield } from 'lucide-vue-next'
import type { LifecycleAction } from '@/domain/admin/admin-users.types'
import type { ConfirmTone } from '@/domain/admin/admin-users.confirm'

export const fullName = (u: { firstName: string; lastName: string }) => `${u.firstName} ${u.lastName}`.trim()

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** 2026-10-18 */
export const formatDate = (iso: string | null | undefined) => (iso ? ymd(new Date(iso)) : 'Never')

/** 2026-10-18 09:12 */
export const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) return 'Never'
  const d = new Date(iso)
  return `${ymd(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const ACTION_ICONS = {
  deactivate: UserMinus,
  reactivate: UserCheck,
  delete: Trash2,
  restore: RotateCcw,
  role: Shield,
} satisfies Record<LifecycleAction | 'role', unknown>

export const TONES: Record<ConfirmTone, { soft: string; solid: string; outline: string }> = {
  amber: { soft: 'bg-amber-50 text-amber-600', solid: 'bg-amber-500 hover:bg-amber-600', outline: 'border-amber-200 text-amber-600 hover:bg-amber-50' },
  emerald: { soft: 'bg-emerald-50 text-emerald-600', solid: 'bg-emerald-600 hover:bg-emerald-700', outline: 'border-emerald-200 text-emerald-600 hover:bg-emerald-50' },
  red: { soft: 'bg-red-50 text-red-500', solid: 'bg-red-500 hover:bg-red-600', outline: 'border-red-200 text-red-500 hover:bg-red-50' },
  blue: { soft: 'bg-blue-50 text-[#0052ff]', solid: 'bg-[#0052ff] hover:bg-[#0042cc]', outline: 'border-blue-200 text-[#0052ff] hover:bg-blue-50' },
}

/** Gray, non-interactive look for actions the signed-in user cannot take. */
export const OFF = 'text-slate-300 border-slate-200 cursor-not-allowed'
