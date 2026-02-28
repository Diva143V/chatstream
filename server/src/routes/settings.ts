import express, { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = express.Router();

interface AuthRequest extends Request {
  userId?: string;
}

// ─── Server Settings ──────────────────────────────────────────────────────

// Get server settings
router.get('/servers/:serverId', authenticate, async (req: AuthRequest, res: Response) => {
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

    res.json(server);
  } catch (error) {
    console.error('Error fetching server settings:', error);
    res.status(500).json({ error: 'Failed to fetch server settings' });
  }
});

// Update server settings
router.patch('/servers/:serverId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { serverId } = req.params;
    const { name, description, icon, banner, rules, verificationLevel, explicitFilter, systemChannelId } = req.body;

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

    const updated = await prisma.server.update({
      where: { id: serverId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(icon !== undefined && { icon }),
        ...(banner !== undefined && { banner }),
        ...(rules !== undefined && { rules }),
        ...(verificationLevel && { verificationLevel }),
        ...(explicitFilter && { explicitFilter }),
        ...(systemChannelId !== undefined && { systemChannelId }),
      },
    });

    // Log audit action
    await prisma.auditLog.create({
      data: {
        serverId,
        actorId: userId,
        action: 'SERVER_UPDATE',
        targetType: 'SERVER',
        targetId: serverId,
        changes: {
          before: server,
          after: updated,
        },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating server settings:', error);
    res.status(500).json({ error: 'Failed to update server settings' });
  }
});

// ─── Channel Settings ─────────────────────────────────────────────────────

// Get channel settings
router.get('/channels/:channelId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { channelId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: { server: { include: { members: { where: { userId } } } } },
    });

    if (!channel || channel.server.members.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const member = channel.server.members[0];
    if (!['OWNER', 'ADMIN'].includes(member.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    res.json(channel);
  } catch (error) {
    console.error('Error fetching channel settings:', error);
    res.status(500).json({ error: 'Failed to fetch channel settings' });
  }
});

// Update channel settings
router.patch('/channels/:channelId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { channelId } = req.params;
    const { name, topic, slowmode, nsfw, userLimit } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: { server: { include: { members: { where: { userId } } } } },
    });

    if (!channel || channel.server.members.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const member = channel.server.members[0];
    if (!['OWNER', 'ADMIN'].includes(member.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const updated = await prisma.channel.update({
      where: { id: channelId },
      data: {
        ...(name !== undefined && { name }),
        ...(topic !== undefined && { topic }),
        ...(slowmode !== undefined && { slowmode }),
        ...(nsfw !== undefined && { nsfw }),
        ...(userLimit !== undefined && { userLimit }),
      },
    });

    // Log audit action
    await prisma.auditLog.create({
      data: {
        serverId: channel.serverId,
        actorId: userId,
        action: 'CHANNEL_UPDATE',
        targetType: 'CHANNEL',
        targetId: channelId,
        changes: {
          before: channel,
          after: updated,
        },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating channel settings:', error);
    res.status(500).json({ error: 'Failed to update channel settings' });
  }
});

export default router;

