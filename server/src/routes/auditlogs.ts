import express, { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = express.Router();

interface AuthRequest extends Request {
  userId?: string;
}

// Get audit logs for a server
router.get('/servers/:serverId/audit-logs', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { serverId } = req.params;
    const { limit = '50', cursor, action, userId: targetUserId } = req.query;
    const take = Math.min(parseInt(limit as string), 100);

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Verify user is admin/owner in server
    const server = await prisma.server.findUnique({
      where: { id: serverId },
      include: { members: { where: { userId } } },
    });

    if (!server || server.members.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const member = server.members[0];
    if (!['OWNER', 'ADMIN'].includes(member.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const logs = await prisma.auditLog.findMany({
      where: {
        serverId,
        ...(action && { action: action as any }),
        ...(targetUserId && { targetId: targetUserId as string }),
      },
      include: {
        actor: {
          select: { id: true, username: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take,
      ...(cursor && {
        cursor: { id: cursor as string },
        skip: 1,
      }),
    });

    const nextCursor = logs.length === take ? logs[logs.length - 1].id : null;

    res.json({
      logs,
      nextCursor,
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get single audit log
router.get('/audit-logs/:logId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { logId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const log = await prisma.auditLog.findUnique({
      where: { id: logId },
      include: {
        actor: {
          select: { id: true, username: true, avatar: true },
        },
        server: {
          include: { members: { where: { userId } } },
        },
      },
    });

    if (!log) return res.status(404).json({ error: 'Audit log not found' });

    if (log.server.members.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const member = log.server.members[0];
    if (!['OWNER', 'ADMIN'].includes(member.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    res.json(log);
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// Get log statistics for a server
router.get('/servers/:serverId/audit-stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { serverId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const server = await prisma.server.findUnique({
      where: { id: serverId },
      include: { members: { where: { userId } } },
    });

    if (!server || server.members.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const member = server.members[0];
    if (!['OWNER', 'ADMIN'].includes(member.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = {
      totalLogs: await prisma.auditLog.count({
        where: { serverId },
      }),
      logsToday: await prisma.auditLog.count({
        where: {
          serverId,
          createdAt: { gte: today },
        },
      }),
      actionCounts: {} as Record<string, number>,
      actorCounts: {} as Record<string, number>,
    };

    // Count by action type
    const actionCounts = await prisma.auditLog.groupBy({
      by: ['action'],
      where: { serverId },
      _count: true,
    });

    for (const item of actionCounts) {
      stats.actionCounts[item.action] = item._count;
    }

    // Count by actor
    const actorCounts = await prisma.auditLog.groupBy({
      by: ['actorId'],
      where: { serverId },
      _count: true,
      take: 10,
      orderBy: { _count: { createdAt: 'desc' } },
    });

    for (const item of actorCounts) {
      const actor = await prisma.user.findUnique({
        where: { id: item.actorId },
        select: { username: true },
      });
      stats.actorCounts[actor?.username || item.actorId] = item._count;
    }

    res.json(stats);
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({ error: 'Failed to fetch audit stats' });
  }
});

export default router;

