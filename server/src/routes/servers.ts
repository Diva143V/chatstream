import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { ChannelType } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateInviteCode } from '../lib/utils';
import { logAuditAction } from '../lib/audit';

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
      },
      select: serverSelect,
    });

    // Create default channels
    const defaultChannels = [
      { serverId: server.id, name: 'general', type: 'GROUP_CHAT' as ChannelType, category: 'General', position: 0 },
      { serverId: server.id, name: 'announcements', type: 'NOTE' as ChannelType, category: 'General', position: 1 },
      { serverId: server.id, name: 'General Voice', type: 'VOICE_CALL' as ChannelType, category: 'Voice Channels', position: 2 },
    ];

    await prisma.channel.createMany({
      data: defaultChannels,
    });

    // Fetch server with channels
    const serverWithChannels = await prisma.server.findUnique({
      where: { id: server.id },
      select: serverSelect,
    });

    return res.status(201).json({ server: serverWithChannels });
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
        type: z.enum(['NOTE', 'GROUP_CHAT', 'VOICE_CALL']).default('GROUP_CHAT'),
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
      data: { name, type: type as ChannelType, serverId, category, position },
    });

    await logAuditAction({
      serverId,
      actorId: req.user!.id,
      action: 'CHANNEL_CREATE',
      targetType: 'CHANNEL',
      targetId: channel.id,
      changes: { name, type, category },
    });

    return res.status(201).json({ channel });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    console.error('Create channel error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/servers/:serverId/invites — list invites for a server
router.get('/:serverId/invites', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { serverId } = req.params;

    // Check permissions
    const member = await prisma.serverMember.findUnique({
      where: { userId_serverId: { userId: req.user!.id, serverId } },
    });

    if (!member || !['OWNER', 'ADMIN', 'MODERATOR'].includes(member.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const invites = await prisma.invite.findMany({
      where: { serverId },
      orderBy: { createdAt: 'desc' },
      include: { creator: { select: { id: true, username: true, avatar: true } } },
    });

    return res.json({ invites });
  } catch (error) {
    console.error('Get invites error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/servers/:serverId/invites — create an invite
router.post('/:serverId/invites', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { serverId } = req.params;
    const { maxUses, expirationInHours } = z
      .object({
        maxUses: z.number().int().min(1).max(100).nullable().optional(), // null = unlimited
        expirationInHours: z.number().int().min(1).max(720).nullable().optional(), // null = never
      })
      .parse(req.body);

    // Check permissions
    const member = await prisma.serverMember.findUnique({
      where: { userId_serverId: { userId: req.user!.id, serverId } },
    });

    if (!member || !['OWNER', 'ADMIN', 'MODERATOR'].includes(member.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const code = generateInviteCode();
    const expiresAt = expirationInHours ? new Date(Date.now() + expirationInHours * 60 * 60 * 1000) : null;

    const invite = await prisma.invite.create({
      data: {
        code,
        serverId,
        creatorId: req.user!.id,
        maxUses,
        expiresAt,
      },
      include: { creator: { select: { id: true, username: true, avatar: true } } },
    });

    await logAuditAction({
      serverId,
      actorId: req.user!.id,
      action: 'INVITE_CREATE',
      targetType: 'INVITE',
      targetId: invite.code,
      changes: { maxUses, expiresAt },
    });

    return res.status(201).json({ invite });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    console.error('Create invite error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/servers/join/:inviteCode
router.post('/join/:inviteCode', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { inviteCode } = req.params;

    const invite = await prisma.invite.findUnique({
      where: { code: inviteCode },
      include: {
        server: { select: serverSelect }
      }
    });

    if (!invite) return res.status(404).json({ error: 'Invalid invite code' });

    // Check expiration
    if (invite.expiresAt && new Date() > invite.expiresAt) {
      return res.status(410).json({ error: 'Invite has expired' });
    }

    // Check usage limits
    if (invite.maxUses !== null && invite.uses >= invite.maxUses) {
      return res.status(410).json({ error: 'Invite has reached max uses' });
    }

    const server = invite.server;

    // Check for active ban
    const latestBan = await prisma.moderationAction.findFirst({
      where: {
        targetId: req.user!.id,
        serverId: server.id,
        type: { in: ['BAN', 'UNBAN'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (latestBan && latestBan.type === 'BAN') {
      const isPermanent = latestBan.expiresAt === null;
      const isExpired = latestBan.expiresAt ? new Date() > latestBan.expiresAt : false;

      if (isPermanent || !isExpired) {
        return res.status(403).json({ error: 'You are banned from this server' });
      }
    }

    const existing = await prisma.serverMember.findUnique({
      where: { userId_serverId: { userId: req.user!.id, serverId: server.id } },
    });

    if (existing) return res.status(409).json({ error: 'Already a member' });

    // Transaction to increment usage and join
    const [updatedInvite, membership] = await prisma.$transaction([
      prisma.invite.update({
        where: { id: invite.id },
        data: { uses: { increment: 1 } },
      }),
      prisma.serverMember.create({
        data: { userId: req.user!.id, serverId: server.id, role: 'MEMBER', inviteId: invite.id },
      }),
    ]);

    return res.json({ server });
  } catch (error) {
    console.error('Join server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
