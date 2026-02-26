import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/invites/:code — resolve invite info (public/authorized)
router.get('/:code', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { code } = req.params;

        const invite = await prisma.invite.findUnique({
            where: { code },
            include: {
                server: {
                    select: {
                        id: true,
                        name: true,
                        icon: true,
                        description: true,
                        _count: { select: { members: true } }
                    }
                },
                creator: { select: { id: true, username: true, avatar: true } }
            }
        });

        if (!invite) return res.status(404).json({ error: 'Invalid invite' });

        // Check expiration
        if (invite.expiresAt && new Date() > invite.expiresAt) {
            return res.status(410).json({ error: 'Invite has expired' });
        }

        // Check usage limits
        if (invite.maxUses !== null && invite.uses >= invite.maxUses) {
            return res.status(410).json({ error: 'Invite has reached max uses' });
        }

        return res.json({ invite });
    } catch (error) {
        console.error('Resolve invite error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/invites/:code — revoke an invite
router.delete('/:code', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { code } = req.params;

        const invite = await prisma.invite.findUnique({
            where: { code },
        });

        if (!invite) return res.status(404).json({ error: 'Invite not found' });

        // Check permissions: owner or admin of the server, or the creator of the invite
        const member = await prisma.serverMember.findUnique({
            where: { userId_serverId: { userId: req.user!.id, serverId: invite.serverId } },
        });

        if (!member || (!['OWNER', 'ADMIN'].includes(member.role) && invite.creatorId !== req.user!.id)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        await prisma.invite.delete({
            where: { code },
        });

        return res.json({ message: 'Invite revoked' });
    } catch (error) {
        console.error('Revoke invite error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
