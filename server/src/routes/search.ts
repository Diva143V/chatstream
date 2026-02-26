import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/search/messages
router.get('/messages', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { query, serverId, channelId, authorId, before, after, hasAttachments } = z
            .object({
                query: z.string().min(1),
                serverId: z.string().optional(),
                channelId: z.string().optional(),
                authorId: z.string().optional(),
                before: z.string().datetime().optional(),
                after: z.string().datetime().optional(),
                hasAttachments: z.string().transform(v => v === 'true').optional(),
            })
            .parse(req.query);

        // Build the query
        const where: any = {
            content: {
                contains: query,
                mode: 'insensitive',
            },
        };

        if (channelId) {
            where.channelId = channelId;
        } else if (serverId) {
            // If serverId is provided but not channelId, search all channels in that server
            where.channel = {
                serverId: serverId,
            };
        }

        if (authorId) {
            where.authorId = authorId;
        }

        if (before || after) {
            where.createdAt = {};
            if (before) where.createdAt.lte = new Date(before);
            if (after) where.createdAt.gte = new Date(after);
        }

        if (hasAttachments) {
            where.attachments = {
                some: {},
            };
        }

        const results = await prisma.message.findMany({
            where,
            take: 50,
            orderBy: { createdAt: 'desc' },
            include: {
                author: {
                    select: { id: true, username: true, avatar: true },
                },
                attachments: true,
                channel: {
                    select: { id: true, name: true },
                },
            },
        });

        return res.json({ results });
    } catch (error) {
        if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors[0].message });
        console.error('Search error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
