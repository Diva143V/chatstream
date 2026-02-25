import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/friends
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const friends = await prisma.friend.findMany({
      where: {
        OR: [{ requesterId: req.user!.id }, { receiverId: req.user!.id }],
      },
      include: {
        requester: { select: { id: true, username: true, avatar: true, status: true, statusText: true } },
        receiver: { select: { id: true, username: true, avatar: true, status: true, statusText: true } },
      },
    });

    return res.json({ friends });
  } catch (error) {
    console.error('Get friends error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/friends — send friend request
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { username } = z.object({ username: z.string().min(1) }).parse(req.body);

    const targetUser = await prisma.user.findUnique({ where: { username } });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });
    if (targetUser.id === req.user!.id) return res.status(400).json({ error: 'Cannot add yourself' });

    const existing = await prisma.friend.findFirst({
      where: {
        OR: [
          { requesterId: req.user!.id, receiverId: targetUser.id },
          { requesterId: targetUser.id, receiverId: req.user!.id },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') return res.status(409).json({ error: 'Already friends' });
      if (existing.status === 'PENDING') return res.status(409).json({ error: 'Friend request already sent' });
    }

    const friend = await prisma.friend.create({
      data: { requesterId: req.user!.id, receiverId: targetUser.id },
      include: {
        receiver: { select: { id: true, username: true, avatar: true } },
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: targetUser.id,
        type: 'FRIEND_REQUEST',
        title: 'New Friend Request',
        content: `${req.user!.username} sent you a friend request`,
        data: { requesterId: req.user!.id, friendId: friend.id },
      },
    });

    return res.status(201).json({ friend });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    console.error('Send friend request error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/friends/:friendId — accept/decline friend request
router.patch('/:friendId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { friendId } = req.params;
    const { action } = z.object({ action: z.enum(['accept', 'decline']) }).parse(req.body);

    const friend = await prisma.friend.findUnique({ where: { id: friendId } });
    if (!friend) return res.status(404).json({ error: 'Friend request not found' });
    if (friend.receiverId !== req.user!.id) return res.status(403).json({ error: 'Permission denied' });

    if (action === 'accept') {
      const updated = await prisma.friend.update({
        where: { id: friendId },
        data: { status: 'ACCEPTED' },
      });
      return res.json({ friend: updated });
    } else {
      await prisma.friend.delete({ where: { id: friendId } });
      return res.json({ message: 'Friend request declined' });
    }
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    console.error('Update friend error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/friends/:friendId — remove friend
router.delete('/:friendId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { friendId } = req.params;

    const friend = await prisma.friend.findFirst({
      where: {
        id: friendId,
        OR: [{ requesterId: req.user!.id }, { receiverId: req.user!.id }],
      },
    });

    if (!friend) return res.status(404).json({ error: 'Friend not found' });

    await prisma.friend.delete({ where: { id: friendId } });
    return res.json({ message: 'Friend removed' });
  } catch (error) {
    console.error('Remove friend error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/friends/dms
router.get('/dms', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const dms = await prisma.directMessage.findMany({
      where: { participants: { some: { userId: req.user!.id } } },
      include: {
        participants: {
          include: { user: { select: { id: true, username: true, avatar: true, status: true } } },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, content: true, createdAt: true, authorId: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return res.json({ dms });
  } catch (error) {
    console.error('Get DMs error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/friends/dms — open or create DM with a user
router.post('/dms', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = z.object({ userId: z.string() }).parse(req.body);

    // Check if DM already exists
    const existing = await prisma.directMessage.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: req.user!.id } } },
          { participants: { some: { userId } } },
        ],
      },
      include: {
        participants: {
          include: { user: { select: { id: true, username: true, avatar: true, status: true } } },
        },
      },
    });

    if (existing) return res.json({ dm: existing });

    const dm = await prisma.directMessage.create({
      data: {
        participants: {
          create: [{ userId: req.user!.id }, { userId }],
        },
      },
      include: {
        participants: {
          include: { user: { select: { id: true, username: true, avatar: true, status: true } } },
        },
      },
    });

    return res.status(201).json({ dm });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
    console.error('Create DM error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
