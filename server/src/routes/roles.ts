import express, { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = express.Router();

interface AuthRequest extends Request {
  userId?: string;
}

// Get all roles in a server
router.get('/servers/:serverId/roles', authenticate, async (req: AuthRequest, res: Response) => {
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

    const roles = await prisma.role.findMany({
      where: { serverId },
      orderBy: { position: 'desc' },
      include: {
        members: {
          select: { id: true, userId: true },
        },
      },
    });

    res.json(roles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Create a new role
router.post('/servers/:serverId/roles', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { serverId } = req.params;
    const { name, color = '#99AAB5', permissions = 0, hoisted = false, mentionable = false } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    const server = await prisma.server.findUnique({
      where: { id: serverId },
      include: { members: { where: { userId } } },
    });

    if (!server || server.members.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const member = server.members[0];
    if (member.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only server owner can create roles' });
    }

    // Get highest position
    const highestRole = await prisma.role.findFirst({
      where: { serverId },
      orderBy: { position: 'desc' },
    });

    const newPosition = (highestRole?.position ?? 0) + 1;

    const role = await prisma.role.create({
      data: {
        serverId,
        name,
        color,
        permissions,
        hoisted,
        mentionable,
        position: newPosition,
      },
    });

    // Log audit action
    await prisma.auditLog.create({
      data: {
        serverId,
        actorId: userId,
        action: 'MEMBER_ROLE_UPDATE',
        targetType: 'ROLE',
        targetId: role.id,
        changes: { created: role },
      },
    });

    res.status(201).json(role);
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// Update a role
router.patch('/servers/:serverId/roles/:roleId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { serverId, roleId } = req.params;
    const { name, color, permissions, hoisted, mentionable, position } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const server = await prisma.server.findUnique({
      where: { id: serverId },
      include: { members: { where: { userId } } },
    });

    if (!server || server.members.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const member = server.members[0];
    if (member.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only server owner can edit roles' });
    }

    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role || role.serverId !== serverId) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const updated = await prisma.role.update({
      where: { id: roleId },
      data: {
        ...(name !== undefined && { name }),
        ...(color !== undefined && { color }),
        ...(permissions !== undefined && { permissions }),
        ...(hoisted !== undefined && { hoisted }),
        ...(mentionable !== undefined && { mentionable }),
        ...(position !== undefined && { position }),
      },
    });

    // Log audit action
    await prisma.auditLog.create({
      data: {
        serverId,
        actorId: userId,
        action: 'MEMBER_ROLE_UPDATE',
        targetType: 'ROLE',
        targetId: roleId,
        changes: {
          before: role,
          after: updated,
        },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Delete a role
router.delete('/servers/:serverId/roles/:roleId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { serverId, roleId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const server = await prisma.server.findUnique({
      where: { id: serverId },
      include: { members: { where: { userId } } },
    });

    if (!server || server.members.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const member = server.members[0];
    if (member.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only server owner can delete roles' });
    }

    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role || role.serverId !== serverId) {
      return res.status(404).json({ error: 'Role not found' });
    }

    await prisma.role.delete({
      where: { id: roleId },
    });

    // Log audit action
    await prisma.auditLog.create({
      data: {
        serverId,
        actorId: userId,
        action: 'MEMBER_ROLE_UPDATE',
        targetType: 'ROLE',
        targetId: roleId,
        changes: { deleted: role },
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

// Add role to a member
router.post('/servers/:serverId/members/:memberId/roles/:roleId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { serverId, memberId, roleId } = req.params;

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

    const targetMember = await prisma.serverMember.findUnique({
      where: { id: memberId },
      include: { roles: true },
    });

    if (!targetMember || targetMember.serverId !== serverId) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role || role.serverId !== serverId) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Check if member already has role
    const hasRole = targetMember.roles?.some((r: any) => r.id === roleId);
    if (hasRole) {
      return res.status(400).json({ error: 'Member already has this role' });
    }

    const updated = await prisma.serverMember.update({
      where: { id: memberId },
      data: {
        roles: {
          connect: { id: roleId },
        },
      },
      include: { roles: true },
    });

    // Log audit action
    await prisma.auditLog.create({
      data: {
        serverId,
        actorId: userId,
        action: 'MEMBER_ROLE_UPDATE',
        targetType: 'USER',
        targetId: targetMember.userId,
        changes: { roleAdded: roleId },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error adding role:', error);
    res.status(500).json({ error: 'Failed to add role' });
  }
});

// Remove role from a member
router.delete('/servers/:serverId/members/:memberId/roles/:roleId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { serverId, memberId, roleId } = req.params;

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

    const targetMember = await prisma.serverMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.serverId !== serverId) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const updated = await prisma.serverMember.update({
      where: { id: memberId },
      data: {
        roles: {
          disconnect: { id: roleId },
        },
      },
      include: { roles: true },
    });

    // Log audit action
    await prisma.auditLog.create({
      data: {
        serverId,
        actorId: userId,
        action: 'MEMBER_ROLE_UPDATE',
        targetType: 'USER',
        targetId: targetMember.userId,
        changes: { roleRemoved: roleId },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error removing role:', error);
    res.status(500).json({ error: 'Failed to remove role' });
  }
});

export default router;

