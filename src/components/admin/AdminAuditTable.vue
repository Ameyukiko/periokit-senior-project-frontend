<script setup lang="ts">
import AdminRoleBadge from './AdminRoleBadge.vue'
import { formatDateTime, fullName } from './admin-format'
import { AUDIT_ACTION_LABELS, type AuditAction, type AuditLog } from '@/domain/admin/admin-audit.types'
import { ROLE_LABELS } from '@/domain/admin/admin-users.types'

defineProps<{ logs: AuditLog[]; loading: boolean }>()

const ACTION_STYLES: Record<AuditAction, string> = {
  profile_updated: 'bg-blue-50 text-[#0052ff]',
  role_changed: 'bg-violet-50 text-violet-600',
  deactivated: 'bg-amber-50 text-amber-600',
  reactivated: 'bg-emerald-50 text-emerald-600',
  deleted: 'bg-red-50 text-red-500',
  restored: 'bg-emerald-50 text-emerald-600',
}

const PROFILE_FIELDS = { firstName: 'First name', lastName: 'Last name', studentId: 'Student ID' } as const

/** Short human-readable summary of what changed on the target user. */
function details(log: AuditLog): string {
  if (log.action === 'role_changed' && log.roleBefore && log.roleAfter) {
    return `${ROLE_LABELS[log.roleBefore]} → ${ROLE_LABELS[log.roleAfter]}`
  }
  if (log.action !== 'profile_updated') return '—'
  const changes = (Object.keys(PROFILE_FIELDS) as (keyof typeof PROFILE_FIELDS)[])
    .filter((k) => log.before[k] !== log.after[k])
    .map((k) => `${PROFILE_FIELDS[k]}: ${log.before[k] ?? '—'} → ${log.after[k] ?? '—'}`)
  return changes.join(', ') || '—'
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [['day', 86400], ['hour', 3600], ['minute', 60]]
function timeAgo(iso: string): string {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit)
  }
  return 'just now'
}
</script>

<template>
  <table class="w-full text-[13px]" :aria-busy="loading">
    <thead class="bg-slate-50 text-[12px] text-slate-500 text-left border-b border-slate-200">
      <tr>
        <th scope="col" class="px-4 py-3 font-semibold rounded-tl-2xl">Date</th>
        <th scope="col" class="px-4 py-3 font-semibold">Performed by</th>
        <th scope="col" class="px-4 py-3 font-semibold">Target user</th>
        <th scope="col" class="px-4 py-3 font-semibold">Action</th>
        <th scope="col" class="px-4 py-3 font-semibold rounded-tr-2xl">Details</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-slate-100">
      <tr v-for="log in logs" :key="log.id" class="hover:bg-slate-50 align-top">
        <td class="px-4 py-3 whitespace-nowrap">
          <span class="block font-bold">{{ timeAgo(log.createdAt) }}</span>
          <span class="block text-[12px] text-slate-400">{{ formatDateTime(log.createdAt) }}</span>
        </td>
        <td class="px-4 py-3">
          <span class="flex items-center gap-2 font-bold">{{ fullName(log.actor) }}<AdminRoleBadge :role="log.actorRole" /></span>
          <span class="block text-[12px] text-slate-400">{{ log.actor.email }}</span>
        </td>
        <td class="px-4 py-3">
          <span class="block font-bold">{{ fullName(log.target) }}</span>
          <span class="block text-[12px] text-slate-400">{{ log.target.email }}</span>
        </td>
        <td class="px-4 py-3">
          <span class="text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" :class="ACTION_STYLES[log.action]">
            {{ AUDIT_ACTION_LABELS[log.action] }}
          </span>
        </td>
        <td class="px-4 py-3 text-slate-600">{{ details(log) }}</td>
      </tr>
    </tbody>
  </table>
</template>
