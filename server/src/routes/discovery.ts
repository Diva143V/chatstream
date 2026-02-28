import express, { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

interface AuthRequest extends Request {
  userId?: string;
}

// Get featured servers
router.get('/featured', async (req: Request, res: Response) => {
  try {
    const { limit = '10' } = req.query;
    const take = Math.min(parseInt(limit as string), 50);

    const servers = await prisma.server.findMany({
      where: { isPublic: true, featured: true },
      select: {
        id: true,
        name: true,
        icon: true,
        description: true,
        memberCount: true,
        tags: true,
      },
      orderBy: { memberCount: 'desc' },
      take,
    });

    res.json(servers);
  } catch (error) {
    console.error('Error fetching featured servers:', error);
    res.status(500).json({ error: 'Failed to fetch featured servers' });
  }
});

// Get trending/popular servers
router.get('/trending', async (req: Request, res: Response) => {
  try {
    const { limit = '10', category } = req.query;
    const take = Math.min(parseInt(limit as string), 50);

    const servers = await prisma.server.findMany({
      where: {
        isPublic: true,
        ...(category && { tags: { has: category as string } }),
      },
      select: {
        id: true,
        name: true,
        icon: true,
        description: true,
        memberCount: true,
        tags: true,
      },
      orderBy: { memberCount: 'desc' },
      take,
    });

    res.json(servers);
  } catch (error) {
    console.error('Error fetching trending servers:', error);
    res.status(500).json({ error: 'Failed to fetch trending servers' });
  }
});

// Search public servers
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, limit = '20', category } = req.query;
    const take = Math.min(parseInt(limit as string), 100);

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchQuery = q.toLowerCase();

    const servers = await prisma.server.findMany({
      where: {
        isPublic: true,
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { description: { contains: searchQuery, mode: 'insensitive' } },
        ],
        ...(category && { tags: { has: category as string } }),
      },
      select: {
        id: true,
        name: true,
        icon: true,
        description: true,
        memberCount: true,
        tags: true,
      },
      orderBy: { memberCount: 'desc' },
      take,
    });

    res.json(servers);
  } catch (error) {
    console.error('Error searching servers:', error);
    res.status(500).json({ error: 'Failed to search servers' });
  }
});

// Get servers by category/tag
router.get('/category/:category', async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const { limit = '20', sort = 'members' } = req.query;
    const take = Math.min(parseInt(limit as string), 100);

    const servers = await prisma.server.findMany({
      where: {
        isPublic: true,
        tags: { has: category },
      },
      select: {
        id: true,
        name: true,
        icon: true,
        description: true,
        memberCount: true,
        tags: true,
        createdAt: true,
      },
      orderBy:
        sort === 'new'
          ? { createdAt: 'desc' }
          : { memberCount: 'desc' },
      take,
    });

    res.json(servers);
  } catch (error) {
    console.error('Error fetching category servers:', error);
    res.status(500).json({ error: 'Failed to fetch servers' });
  }
});

// Get discovery page data
router.get('/', async (req: Request, res: Response) => {
  try {
    const [featured, trending, categories] = await Promise.all([
      prisma.server.findMany({
        where: { isPublic: true, featured: true },
        select: {
          id: true,
          name: true,
          icon: true,
          description: true,
          memberCount: true,
          tags: true,
        },
        take: 6,
      }),
      prisma.server.findMany({
        where: { isPublic: true },
        select: {
          id: true,
          name: true,
          icon: true,
          description: true,
          memberCount: true,
          tags: true,
        },
        orderBy: { memberCount: 'desc' },
        take: 10,
      }),
      // Get popular tags
      prisma.server
        .findMany({
          where: { isPublic: true },
          select: { tags: true },
          take: 100,
        })
        .then((servers) => {
          const tagCount: Record<string, number> = {};
          for (const server of servers) {
            for (const tag of server.tags) {
              tagCount[tag] = (tagCount[tag] || 0) + 1;
            }
          }
          return Object.entries(tagCount)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 12)
            .map(([tag]) => tag);
        }),
    ]);

    res.json({
      featured,
      trending,
      categories,
    });
  } catch (error) {
    console.error('Error fetching discovery page:', error);
    res.status(500).json({ error: 'Failed to fetch discovery page' });
  }
});

// Publish a server (make it public)
router.post('/publish/:serverId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { serverId } = req.params;
    const { description, tags } = req.body;

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
      return res.status(403).json({ error: 'Only server owner can publish' });
    }

    if (!Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ error: 'At least one tag is required' });
    }

    const updated = await prisma.server.update({
      where: { id: serverId },
      data: {
        isPublic: true,
        description: description || server.description,
        tags: tags.slice(0, 5), // Limit to 5 tags
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error publishing server:', error);
    res.status(500).json({ error: 'Failed to publish server' });
  }
});

// Unpublish a server
router.post('/unpublish/:serverId', authenticateToken, async (req: AuthRequest, res: Response) => {
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
    if (member.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only server owner can unpublish' });
    }

    const updated = await prisma.server.update({
      where: { id: serverId },
      data: { isPublic: false },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error unpublishing server:', error);
    res.status(500).json({ error: 'Failed to unpublish server' });
  }
});

export default router;
