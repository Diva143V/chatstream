import { Router, Response } from 'express';
import { AccessToken } from 'livekit-server-sdk';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// POST /api/voice/token
router.post('/token', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { roomName } = z.object({
            roomName: z.string().min(1)
        }).parse(req.body);

        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;
        const wsUrl = process.env.LIVEKIT_URL;

        if (!apiKey || !apiSecret || !wsUrl) {
            console.error('LiveKit configuration is missing');
            return res.status(500).json({ error: 'LiveKit not configured on server' });
        }

        const at = new AccessToken(apiKey, apiSecret, {
            identity: req.user!.username,
            name: req.user!.username,
        });

        at.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: true,
            canSubscribe: true,
        });

        const token = await at.toJwt();

        return res.json({ token, serverUrl: wsUrl });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors[0].message });
        }
        console.error('LiveKit token error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
