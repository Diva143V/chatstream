import express, { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { Permissions, getUserChannelPermissions } from '../lib/permissions';

const router = express.Router();

interface AuthRequest extends Request {
  userId?: string;
}

// Get channel permissions for current user
router.get('/channel/:channelId/permissions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { channelId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const permissions = await getUserChannelPermissions(userId, channelId);

    // Convert bitfield to readable permissions
    const permissionsList = Object.entries(Permissions).filter(
      ([_, mask]) => (permissions & mask) !== 0
    );

    res.json({
      permissions,
      permissionsList: permissionsList.map(([name]) => name),
    });
  } catch (error) {
    console.error('Error fetching channel permissions:', error);
    res.status(500).json({ error: 'Failed to fetch channel permissions' });
  }
});

// Get all role permissions in a channel
router.get('/channel/:channelId/role-permissions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { channelId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Verify user has permission to manage channel
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

    const permissions = await prisma.channelPermission.findMany({
      where: { channelId, roleId: { not: null } },
      include: { channel: true },
    });

    res.json(permissions);
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    res.status(500).json({ error: 'Failed to fetch role permissions' });
  }
});

// Set role permissions in a channel
router.post('/channel/:channelId/role/:roleId/permissions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { channelId, roleId } = req.params;
    const { allow, deny } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (typeof allow !== 'number' || typeof deny !== 'number') {
      return res.status(400).json({ error: 'allow and deny must be numbers' });
    }

    // Verify user has permission
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

    // Check if role belongs to the server
    const role = await prisma.role.findFirst({
      where: { id: roleId, serverId: channel.serverId },
    });

    if (!role) return res.status(404).json({ error: 'Role not found' });

    const existing = await prisma.channelPermission.findFirst({
      where: { channelId, roleId },
    });

    let permission;
    if (existing) {
      permission = await prisma.channelPermission.update({
        where: { id: existing.id },
        data: { allow, deny },
      });
    } else {
      permission = await prisma.channelPermission.create({
        data: { channelId, roleId, allow, deny },
      });
    }

    res.json(permission);
  } catch (error) {
    console.error('Error setting role permissions:', error);
    res.status(500).json({ error: 'Failed to set role permissions' });
  }
});

// Set user permissions in a channel
router.post('/channel/:channelId/user/:targetUserId/permissions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { channelId, targetUserId } = req.params;
    const { allow, deny } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (typeof allow !== 'number' || typeof deny !== 'number') {
      return res.status(400).json({ error: 'allow and deny must be numbers' });
    }

    // Verify user has permission
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

    const existing = await prisma.channelPermission.findFirst({
      where: { channelId, userId: targetUserId },
    });

    let permission;
    if (existing) {
      permission = await prisma.channelPermission.update({
        where: { id: existing.id },
        data: { allow, deny },
      });
    } else {
      permission = await prisma.channelPermission.create({
        data: { channelId, userId: targetUserId, allow, deny },
      });
    }

    res.json(permission);
  } catch (error) {
    console.error('Error setting user permissions:', error);
    res.status(500).json({ error: 'Failed to set user permissions' });
  }
});

// Delete permission override
router.delete('/channel/:channelId/permissions/:permissionId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { channelId, permissionId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Verify user has permission
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

    const permission = await prisma.channelPermission.findUnique({
      where: { id: permissionId },
    });

    if (!permission || permission.channelId !== channelId) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    await prisma.channelPermission.delete({
      where: { id: permissionId },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting permission:', error);
    res.status(500).json({ error: 'Failed to delete permission' });
  }
});

export default router;
