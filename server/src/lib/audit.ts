import { prisma } from './prisma';
import { AuditAction } from '@prisma/client';

/**
 * Log an action to the server's audit log.
 */
export async function logAuditAction({
    serverId,
    actorId,
    action,
    targetType,
    targetId,
    changes,
    reason,
}: {
    serverId: string;
    actorId: string;
    action: AuditAction;
    targetType: 'USER' | 'CHANNEL' | 'MESSAGE' | 'ROLE' | 'SERVER' | 'INVITE';
    targetId: string;
    changes?: any;
    reason?: string;
}) {
    try {
        return await prisma.auditLog.create({
            data: {
                serverId,
                actorId,
                action,
                targetType,
                targetId,
                changes: changes ? JSON.parse(JSON.stringify(changes)) : undefined,
                reason,
            },
        });
    } catch (error) {
        console.error('[AuditLog] Error logging action:', error);
    }
}
