export const fullName = (u: { firstName: string; lastName: string }) => `${u.firstName} ${u.lastName}`.trim()

export const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never'

export const STATUS_STYLES = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-600 border-slate-200',
  deleted: 'bg-red-50 text-red-600 border-red-200',
} as const
