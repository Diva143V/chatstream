import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { generateToken, authenticate, AuthRequest } from '../middleware/auth';
import { uploadAvatar } from '../lib/cloudinary';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(32, 'Username must be at most 32 characters')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Username can only contain letters, numbers, underscores, dots, and hyphens'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, username, password } = registerSchema.parse(req.body);

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with default settings
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        settings: { create: {} }, // Create default settings
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        banner: true,
        bio: true,
        status: true,
        statusText: true,
        createdAt: true,
      },
    });

    const token = generateToken({ id: user.id, email: user.email, username: user.username });

    return res.status(201).json({ user, token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        banner: true,
        bio: true,
        status: true,
        statusText: true,
        password: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update status to online
    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'ONLINE' },
    });

    const { password: _, ...userWithoutPassword } = user;
    const token = generateToken({ id: user.id, email: user.email, username: user.username });

    return res.json({ user: userWithoutPassword, token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        banner: true,
        bio: true,
        status: true,
        statusText: true,
        createdAt: true,
        settings: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user });
  } catch (error) {
    console.error('Get me error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/auth/profile
router.patch('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { username, bio, statusText, status } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(username && { username }),
        ...(bio !== undefined && { bio }),
        ...(statusText !== undefined && { statusText }),
        ...(status && { status }),
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        banner: true,
        bio: true,
        status: true,
        statusText: true,
        createdAt: true,
      },
    });

    return res.json({ user });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/avatar
router.post(
  '/avatar',
  authenticate,
  uploadAvatar.single('avatar'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const avatarUrl = (req.file as Express.Multer.File & { path: string }).path;

      const user = await prisma.user.update({
        where: { id: req.user!.id },
        data: { avatar: avatarUrl },
        select: { id: true, avatar: true },
      });

      return res.json({ avatar: user.avatar });
    } catch (error) {
      console.error('Upload avatar error:', error);
      return res.status(500).json({ error: 'Failed to upload avatar' });
    }
  }
);

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { status: 'OFFLINE' },
    });

    return res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
