import { AuditLog } from '../../models/audit-log.model';

export async function writeAudit(
  entity_type: string,
  entity_id: string,
  action: 'create' | 'update' | 'delete' | 'status_change',
  old_values: Record<string, unknown> | null,
  new_values: Record<string, unknown> | null,
  ip_address?: string | null,
  user_agent?: string | null,
) {
  try {
    await AuditLog.create({
      entity_type,
      entity_id: entity_id as any,
      action,
      actor_id: null as any,
      actor_type: 'system',
      old_values: old_values as any,
      new_values: new_values as any,
      ip_address: (ip_address || null) as any,
      user_agent: user_agent || null || undefined,
    } as any);
  } catch {
    // swallow auditing failures
  }
}
