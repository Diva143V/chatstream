import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { logAuditAction } from '../lib/audit';
import { AuditAction } from '@prisma/client';

const router = Router();

const ROLE_HIERARCHY: Record<string, number> = {
    OWNER: 4,
    ADMIN: 3,
    MODERATOR: 2,
    MEMBER: 1,
};

// Helper to check permissions
async function getMember(userId: string, serverId: string) {
    return await prisma.serverMember.findUnique({
        where: { userId_serverId: { userId, serverId } },
    });
}

// POST /api/servers/:serverId/moderation/action
router.post('/:serverId/action', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { serverId } = req.params;
        const { targetId, type, reason, durationInSeconds } = z
            .object({
                targetId: z.string(),
                type: z.enum(['TIMEOUT', 'KICK', 'BAN', 'WARN', 'UNBAN']),
                reason: z.string().min(1).max(500),
                durationInSeconds: z.number().int().positive().nullable().optional(),
            })
            .parse(req.body);

        const moderator = await getMember(req.user!.id, serverId);
        if (!moderator || !['OWNER', 'ADMIN', 'MODERATOR'].includes(moderator.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const target = await getMember(targetId, serverId);

        // For UNBAN, target might not be a member anymore
        if (type !== 'UNBAN' && !target) {
            return res.status(404).json({ error: 'Target user is not a member of this server' });
        }

        if (target && moderator.role !== 'OWNER' && ROLE_HIERARCHY[moderator.role] <= ROLE_HIERARCHY[target.role]) {
            return res.status(403).json({ error: 'You cannot moderate someone with a higher or equal role' });
        }

        const expiresAt = durationInSeconds ? new Date(Date.now() + durationInSeconds * 1000) : null;

        // Execute action
        await prisma.$transaction(async (tx) => {
            // Log the moderation record
            await tx.moderationAction.create({
                data: {
                    type,
                    targetId,
                    moderatorId: req.user!.id,
                    serverId,
                    reason,
                    duration: durationInSeconds,
                    expiresAt,
                },
            });

            // Audit Log mapping
            let auditAction: AuditAction;
            switch (type) {
                case 'BAN': auditAction = 'MEMBER_BAN'; break;
                case 'KICK': auditAction = 'MEMBER_KICK'; break;
                case 'TIMEOUT': auditAction = 'MEMBER_TIMEOUT'; break;
                case 'UNBAN': auditAction = 'MEMBER_UNBAN'; break;
                default: auditAction = 'MEMBER_TIMEOUT'; // Default
            }

            await logAuditAction({
                serverId,
                actorId: req.user!.id,
                action: auditAction,
                targetType: 'USER',
                targetId,
                reason,
                changes: { duration: durationInSeconds },
            });

            if (type === 'KICK') {
                await tx.serverMember.delete({
                    where: { userId_serverId: { userId: targetId, serverId } },
                });
            } else if (type === 'BAN') {
                if (target) {
                    await tx.serverMember.delete({
                        where: { userId_serverId: { userId: targetId, serverId } },
                    });
                }
            }
        });

        return res.json({ message: `Action ${type} executed successfully` });
    } catch (error) {
        if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
        console.error('Moderation action error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/servers/:serverId/moderation/logs
router.get('/:serverId/logs', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { serverId } = req.params;

        const member = await getMember(req.user!.id, serverId);
        if (!member || !['OWNER', 'ADMIN', 'MODERATOR'].includes(member.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const logs = await prisma.moderationAction.findMany({
            where: { serverId },
            orderBy: { createdAt: 'desc' },
            include: {
                target: { select: { id: true, username: true, avatar: true } },
                moderator: { select: { id: true, username: true, avatar: true } },
            },
            take: 100,
        });

        return res.json({ logs });
    } catch (error) {
        console.error('Get moderation logs error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/servers/:serverId/audit-logs
router.get('/:serverId/audit-logs', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { serverId } = req.params;

        const member = await getMember(req.user!.id, serverId);
        if (!member || !['OWNER', 'ADMIN'].includes(member.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const logs = await prisma.auditLog.findMany({
            where: { serverId },
            orderBy: { createdAt: 'desc' },
            include: {
                actor: { select: { id: true, username: true, avatar: true } },
            },
            take: 50,
        });

        return res.json({ logs });
    } catch (error) {
        console.error('Get audit logs error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
