import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { uploadAttachment } from '../lib/cloudinary';
import { MemberRole } from '@prisma/client';
const router = Router();

const messageSelect = {
  id: true,
  content: true,
  edited: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      id: true,
      username: true,
      avatar: true,
      status: true,
    },
  },
  attachments: {
    select: { id: true, type: true, url: true, name: true, size: true },
  },
  reactions: {
    select: {
      id: true,
      emoji: true,
      userId: true,
      user: { select: { id: true, username: true } },
    },
  },
};

// GET /api/messages/channel/:channelId
router.get('/channel/:channelId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { channelId } = req.params;
    const { cursor, limit = '50' } = req.query;
    const take = Math.min(parseInt(limit as string), 100);

    // Verify user is a member of the server that owns this channel
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: { server: { include: { members: { where: { userId: req.user!.id } } } } },
    });

    if (!channel || channel.server.members.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const messages = await prisma.message.findMany({
      where: { channelId },
      select: messageSelect,
      orderBy: { createdAt: 'desc' },
      take,
      ...(cursor && {
        cursor: { id: cursor as string },
        skip: 1,
      }),
    });

    // Return in chronological order
    const sorted = messages.reverse();

    return res.json({
      messages: sorted,
      nextCursor: messages.length === take ? sorted[0].id : null,
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/messages/channel/:channelId
router.post(
  '/channel/:channelId',
  authenticate,
  uploadAttachment.array('attachments', 10),
  async (req: AuthRequest, res: Response) => {
    try {
      const { channelId } = req.params;
      const { content } = req.body;
      const files = req.files as Array<Express.Multer.File & { path: string; originalname: string; size: number; mimetype: string }>;

      if (!content?.trim() && (!files || files.length === 0)) {
        return res.status(400).json({ error: 'Message must have content or attachments' });
      }

      // Verify channel access
      const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        include: { server: { include: { members: { where: { userId: req.user!.id } } } } },
      });

      if (!channel || channel.server.members.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const message = await prisma.message.create({
        data: {
          content: content?.trim() || '',
          authorId: req.user!.id,
          channelId,
          attachments: files?.length
            ? {
              create: files.map((file) => ({
                url: file.path,
                name: file.originalname,
                size: file.size,
                type: file.mimetype.startsWith('image/')
                  ? 'IMAGE'
                  : file.mimetype.startsWith('video/')
                    ? 'VIDEO'
                    : 'FILE',
              })),
            }
            : undefined,
        },
        select: messageSelect,
      });

      return res.status(201).json({ message });
    } catch (error) {
      console.error('Create message error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/messages/dm/:dmId
router.get('/dm/:dmId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { dmId } = req.params;
    const { cursor, limit = '50' } = req.query;
    const take = Math.min(parseInt(limit as string), 100);

    // Verify user is a participant of the DM
    const dm = await prisma.directMessage.findUnique({
      where: { id: dmId },
      include: { participants: { where: { userId: req.user!.id } } },
    });

    if (!dm || dm.participants.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const messages = await prisma.message.findMany({
      where: { dmId },
      select: messageSelect,
      orderBy: { createdAt: 'desc' },
      take,
      ...(cursor && {
        cursor: { id: cursor as string },
        skip: 1,
      }),
    });

    const sorted = messages.reverse();

    return res.json({
      messages: sorted,
      nextCursor: messages.length === take ? sorted[0].id : null,
    });
  } catch (error) {
    console.error('Get DM messages error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/messages/dm/:dmId
router.post(
  '/dm/:dmId',
  authenticate,
  uploadAttachment.array('attachments', 10),
  async (req: AuthRequest, res: Response) => {
    try {
      const { dmId } = req.params;
      const { content } = req.body;
      const files = req.files as Array<Express.Multer.File & { path: string; originalname: string; size: number; mimetype: string }>;

      if (!content?.trim() && (!files || files.length === 0)) {
        return res.status(400).json({ error: 'Message must have content or attachments' });
      }

      // Verify DM access
      const dm = await prisma.directMessage.findUnique({
        where: { id: dmId },
        include: { participants: { where: { userId: req.user!.id } } },
      });

      if (!dm || dm.participants.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const message = await prisma.message.create({
        data: {
          content: content?.trim() || '',
          authorId: req.user!.id,
          dmId,
          attachments: files?.length
            ? {
              create: files.map((file) => ({
                url: file.path,
                name: file.originalname,
                size: file.size,
                type: file.mimetype.startsWith('image/')
                  ? 'IMAGE'
                  : file.mimetype.startsWith('video/')
                    ? 'VIDEO'
                    : 'FILE',
              })),
            }
            : undefined,
        },
        select: messageSelect,
      });

      // Update DM updatedAt for sorting
      await prisma.directMessage.update({
        where: { id: dmId },
        data: { updatedAt: new Date() },
      });

      return res.status(201).json({ message });
    } catch (error) {
      console.error('Create DM message error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PATCH /api/messages/:messageId
router.patch('/:messageId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const { content } = z.object({ content: z.string().min(1) }).parse(req.body);

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (message.authorId !== req.user!.id) return res.status(403).json({ error: 'Cannot edit others\' messages' });

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { content, edited: true },
      select: messageSelect,
    });

    return res.json({ message: updated });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    console.error('Edit message error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/messages/:messageId
router.delete('/:messageId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { channel: { include: { server: { include: { members: { where: { userId: req.user!.id } } } } } } },
    });

    if (!message) return res.status(404).json({ error: 'Message not found' });

    const isAuthor = message.authorId === req.user!.id;
    const isAdmin = message.channel?.server.members.some((m) =>
      m.role === 'ADMIN' || m.role === 'OWNER'
    );

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    await prisma.message.delete({ where: { id: messageId } });
    return res.json({ message: 'Message deleted' });
  } catch (error) {
    console.error('Delete message error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/messages/:messageId/reactions
router.post('/:messageId/reactions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const { emoji } = z.object({ emoji: z.string().min(1).max(10) }).parse(req.body);

    // Toggle reaction
    const existing = await prisma.messageReaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId: req.user!.id, emoji } },
    });

    if (existing) {
      await prisma.messageReaction.delete({ where: { id: existing.id } });
      return res.json({ action: 'removed' });
    } else {
      const reaction = await prisma.messageReaction.create({
        data: { messageId, userId: req.user!.id, emoji },
        include: { user: { select: { id: true, username: true } } },
      });
      return res.json({ action: 'added', reaction });
    }
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    console.error('Reaction error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/messages/:messageId/thread - Get message and its replies
router.get('/:messageId/thread', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const { limit = '50' } = req.query;
    const take = Math.min(parseInt(limit as string), 100);

    const parentMessage = await prisma.message.findUnique({
      where: { id: messageId },
      select: messageSelect,
    });

    if (!parentMessage) return res.status(404).json({ error: 'Message not found' });

    // Get all replies
    const replies = await prisma.message.findMany({
      where: { parentId: messageId },
      select: messageSelect,
      orderBy: { createdAt: 'asc' },
      take,
    });

    return res.json({
      parent: parentMessage,
      replies,
    });
  } catch (error) {
    console.error('Get thread error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/messages/:messageId/pin - Pin a message
router.post('/:messageId/pin', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { channel: { include: { server: { include: { members: { where: { userId: req.user!.id } } } } } } },
    });

    if (!message) return res.status(404).json({ error: 'Message not found' });

    const member = message.channel?.server.members[0];
    if (!member || !['OWNER', 'ADMIN', 'MODERATOR'].includes(member.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { pinned: true, pinnedAt: new Date(), pinnedById: req.user!.id },
      select: messageSelect,
    });

    return res.json({ message: updated });
  } catch (error) {
    console.error('Pin message error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/messages/:messageId/pin - Unpin a message
router.delete('/:messageId/pin', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { channel: { include: { server: { include: { members: { where: { userId: req.user!.id } } } } } } },
    });

    if (!message) return res.status(404).json({ error: 'Message not found' });

    const member = message.channel?.server.members[0];
    if (!member || !['OWNER', 'ADMIN', 'MODERATOR'].includes(member.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { pinned: false, pinnedAt: null, pinnedById: null },
      select: messageSelect,
    });

    return res.json({ message: updated });
  } catch (error) {
    console.error('Unpin message error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/messages/channel/:channelId/pinned - Get pinned messages in channel
router.get('/channel/:channelId/pinned', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { channelId } = req.params;

    // Verify access
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: { server: { include: { members: { where: { userId: req.user!.id } } } } },
    });

    if (!channel || channel.server.members.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const pinnedMessages = await prisma.message.findMany({
      where: { channelId, pinned: true },
      select: messageSelect,
      orderBy: { pinnedAt: 'desc' },
    });

    return res.json({ messages: pinnedMessages });
  } catch (error) {
    console.error('Get pinned messages error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
