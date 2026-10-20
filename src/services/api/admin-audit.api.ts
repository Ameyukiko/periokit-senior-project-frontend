import { apiRequest } from './http'
import type { AuditLog, AuditLogPage, AuditLogQuery, AuditUser } from '@/domain/admin/admin-audit.types'

type ApiAuditUser = { userId: string; firstName: string; lastName: string; email: string }
type ApiAuditLog = Omit<AuditLog, 'id' | 'actor' | 'target' | 'roleBefore' | 'roleAfter'> & {
  auditId: string
  targetRoleBefore: AuditLog['roleBefore']
  targetRoleAfter: AuditLog['roleAfter']
  actor: ApiAuditUser
  target: ApiAuditUser
}

const toAuditUser = ({ userId, ...rest }: ApiAuditUser): AuditUser => ({ id: userId, ...rest })

export async function listAuditLogs(query: AuditLogQuery, signal?: AbortSignal): Promise<AuditLogPage> {
  const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) })
  if (query.search.trim()) params.set('search', query.search.trim())
  if (query.action !== 'all') params.set('action', query.action)
  const res = await apiRequest<{ logs: ApiAuditLog[]; total: number }>(`/admin/audit-logs?${params}`, { auth: true, signal })
  const { logs, total } = res.data!
  return {
    items: logs.map(({ auditId, actor, target, targetRoleBefore, targetRoleAfter, ...rest }) => ({
      ...rest,
      id: auditId,
      roleBefore: targetRoleBefore,
      roleAfter: targetRoleAfter,
      actor: toAuditUser(actor),
      target: toAuditUser(target),
    })),
    total,
  }
}
