import express, { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

interface AuthRequest extends Request {
  userId?: string;
}

// Get user presence/status
router.get('/user/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        avatar: true,
        status: true,
        lastSeenAt: true,
        customStatus: true,
        customStatusEmoji: true,
        statusExpiresAt: true,
        activeDevice: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user presence:', error);
    res.status(500).json({ error: 'Failed to fetch user presence' });
  }
});

// Get multiple users presence
router.post('/users', async (req: AuthRequest, res: Response) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds)) {
      return res.status(400).json({ error: 'userIds must be an array' });
    }

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        avatar: true,
        status: true,
        lastSeenAt: true,
        customStatus: true,
        customStatusEmoji: true,
        statusExpiresAt: true,
        activeDevice: true,
      },
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users presence:', error);
    res.status(500).json({ error: 'Failed to fetch users presence' });
  }
});

// Update current user presence
router.patch('/update', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { status, customStatus, customStatusEmoji, statusExpiresAt, activeDevice } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(status && { status }),
        ...(customStatus !== undefined && { customStatus }),
        ...(customStatusEmoji !== undefined && { customStatusEmoji }),
        ...(statusExpiresAt !== undefined && { statusExpiresAt }),
        ...(activeDevice && { activeDevice }),
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        status: true,
        lastSeenAt: true,
        customStatus: true,
        customStatusEmoji: true,
        statusExpiresAt: true,
        activeDevice: true,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating user presence:', error);
    res.status(500).json({ error: 'Failed to update user presence' });
  }
});

// Clear custom status
router.delete('/custom-status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        customStatus: null,
        customStatusEmoji: null,
        statusExpiresAt: null,
      },
      select: {
        id: true,
        customStatus: true,
        customStatusEmoji: true,
        statusExpiresAt: true,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error clearing custom status:', error);
    res.status(500).json({ error: 'Failed to clear custom status' });
  }
});

export default router;
