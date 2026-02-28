import express, { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Extend Express Request to include userId
interface AuthRequest extends Request {
  userId?: string;
}

// Get all notifications for current user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get unread count
router.get('/unread-count', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const count = await prisma.notification.count({
      where: { userId, read: false },
    });

    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Mark notification as read
router.patch('/:notificationId/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { notificationId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.patch('/read-all', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Get notification settings
router.get('/settings', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let settings = await prisma.notificationSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.notificationSettings.create({
        data: { userId },
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ error: 'Failed to fetch notification settings' });
  }
});

// Update notification settings
router.patch('/settings', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { muteAll, mentions, replies, dms, enableSounds } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let settings = await prisma.notificationSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.notificationSettings.create({
        data: { userId },
      });
    }

    const updated = await prisma.notificationSettings.update({
      where: { userId },
      data: {
        ...(muteAll !== undefined && { muteAll }),
        ...(mentions !== undefined && { mentions }),
        ...(replies !== undefined && { replies }),
        ...(dms !== undefined && { dms }),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
});

// Mute channel
router.post('/mute-channel', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { channelId, until } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let settings = await prisma.notificationSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.notificationSettings.create({
        data: { userId },
      });
    }

    const mutedChannels = new Set(settings.mutedChannels || []);
    mutedChannels.add(channelId);

    const updated = await prisma.notificationSettings.update({
      where: { userId },
      data: { mutedChannels: Array.from(mutedChannels) },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error muting channel:', error);
    res.status(500).json({ error: 'Failed to mute channel' });
  }
});

// Unmute channel
router.delete('/unmute-channel/:channelId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { channelId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let settings = await prisma.notificationSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      return res.status(404).json({ error: 'Notification settings not found' });
    }

    const mutedChannels = new Set(settings.mutedChannels || []);
    mutedChannels.delete(channelId);

    const updated = await prisma.notificationSettings.update({
      where: { userId },
      data: { mutedChannels: Array.from(mutedChannels) },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error unmuting channel:', error);
    res.status(500).json({ error: 'Failed to unmute channel' });
  }
});

// Mute server
router.post('/mute-server', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { serverId, until } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let settings = await prisma.notificationSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.notificationSettings.create({
        data: { userId },
      });
    }

    const mutedServers = new Set(settings.mutedServers || []);
    mutedServers.add(serverId);

    const updated = await prisma.notificationSettings.update({
      where: { userId },
      data: { mutedServers: Array.from(mutedServers) },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error muting server:', error);
    res.status(500).json({ error: 'Failed to mute server' });
  }
});

// Unmute server
router.delete('/unmute-server/:serverId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { serverId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let settings = await prisma.notificationSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      return res.status(404).json({ error: 'Notification settings not found' });
    }

    const mutedServers = new Set(settings.mutedServers || []);
    mutedServers.delete(serverId);

    const updated = await prisma.notificationSettings.update({
      where: { userId },
      data: { mutedServers: Array.from(mutedServers) },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error unmuting server:', error);
    res.status(500).json({ error: 'Failed to unmute server' });
  }
});

// Toggle mute all
router.patch('/mute-all', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let settings = await prisma.notificationSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.notificationSettings.create({
        data: { userId, muteAll: true },
      });
    } else {
      settings = await prisma.notificationSettings.update({
        where: { userId },
        data: { muteAll: !settings.muteAll },
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('Error toggling mute all:', error);
    res.status(500).json({ error: 'Failed to toggle mute all' });
  }
});

export default router;
