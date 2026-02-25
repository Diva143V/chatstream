import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const serverSelect = {
  id: true,
  name: true,
  icon: true,
  banner: true,
  description: true,
  ownerId: true,
  createdAt: true,
  members: {
    select: {
      userId: true,
      role: true,
      user: { select: { id: true, username: true, avatar: true, status: true, statusText: true } },
    },
  },
  channels: {
    select: { id: true, name: true, type: true, category: true, position: true, topic: true },
    orderBy: { position: 'asc' as const },
  },
};

// GET /api/servers — list servers for current user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const memberships = await prisma.serverMember.findMany({
      where: { userId: req.user!.id },
      include: { server: { select: serverSelect } },
    });

    const servers = memberships.map((m) => m.server);
    return res.json({ servers });
  } catch (error) {
    console.error('Get servers error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/servers — create a server
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description } = z
      .object({
        name: z.string().min(2).max(100),
        description: z.string().max(500).optional(),
      })
      .parse(req.body);

    const server = await prisma.server.create({
      data: {
        name,
        description,
        icon: `https://api.dicebear.com/7.x/identicon/svg?seed=${name}`,
        ownerId: req.user!.id,
        members: {
          create: { userId: req.user!.id, role: 'OWNER' },
        },
        channels: {
          create: [
            { name: 'general', type: 'TEXT', category: 'General', position: 0 },
            { name: 'announcements', type: 'ANNOUNCEMENT', category: 'General', position: 1 },
            { name: 'General Voice', type: 'VOICE', category: 'Voice Channels', position: 2 },
          ],
        },
      },
      select: serverSelect,
    });

    return res.status(201).json({ server });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    console.error('Create server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/servers/:serverId
router.get('/:serverId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { serverId } = req.params;

    const membership = await prisma.serverMember.findUnique({
      where: { userId_serverId: { userId: req.user!.id, serverId } },
    });

    if (!membership) return res.status(403).json({ error: 'Access denied' });

    const server = await prisma.server.findUnique({
      where: { id: serverId },
      select: serverSelect,
    });

    if (!server) return res.status(404).json({ error: 'Server not found' });
    return res.json({ server });
  } catch (error) {
    console.error('Get server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/servers/:serverId/channels — create a channel
router.post('/:serverId/channels', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { serverId } = req.params;
    const { name, type, category } = z
      .object({
        name: z.string().min(1).max(100),
        type: z.enum(['TEXT', 'VOICE', 'ANNOUNCEMENT']).default('TEXT'),
        category: z.string().optional(),
      })
      .parse(req.body);

    // Check admin permissions
    const member = await prisma.serverMember.findUnique({
      where: { userId_serverId: { userId: req.user!.id, serverId } },
    });

    if (!member || !['OWNER', 'ADMIN'].includes(member.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const position = await prisma.channel.count({ where: { serverId } });

    const channel = await prisma.channel.create({
      data: { name, type, serverId, category, position },
    });

    return res.status(201).json({ channel });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    console.error('Create channel error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/servers/join/:inviteCode
router.post('/join/:inviteCode', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // In a full implementation, invite codes would be stored in a separate table
    // For now, use server ID as invite code
    const { inviteCode } = req.params;

    const server = await prisma.server.findUnique({
      where: { id: inviteCode },
      select: serverSelect,
    });

    if (!server) return res.status(404).json({ error: 'Invalid invite' });

    const existing = await prisma.serverMember.findUnique({
      where: { userId_serverId: { userId: req.user!.id, serverId: server.id } },
    });

    if (existing) return res.status(409).json({ error: 'Already a member' });

    await prisma.serverMember.create({
      data: { userId: req.user!.id, serverId: server.id, role: 'MEMBER' },
    });

    return res.json({ server });
  } catch (error) {
    console.error('Join server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
