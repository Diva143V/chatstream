import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

interface AuthSocket extends Socket {
  userId?: string;
  username?: string;
}

export function registerSocketHandlers(io: Server) {
  // Auth middleware for Socket.IO
  io.use(async (socket: AuthSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: string;
        username: string;
      };

      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user) return next(new Error('User not found'));

      socket.userId = decoded.id;
      socket.username = decoded.username;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: AuthSocket) => {
    const userId = socket.userId!;
    console.log(`[Socket] User ${userId} connected`);

    // Update user status to online
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'ONLINE' },
    });

    // Broadcast status change to all users in shared servers
    const memberships = await prisma.serverMember.findMany({
      where: { userId },
      select: { serverId: true },
    });

    memberships.forEach(({ serverId }: { serverId: string }) => {
      socket.join(`server:${serverId}`);
    });

    // Broadcast online status
    socket.broadcast.emit('user:status', { userId, status: 'ONLINE' });

    // ─── Channel Events ───────────────────────────────────────────────────────

    socket.on('channel:join', async (channelId: string) => {
      // Verify access
      const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        include: { server: { include: { members: { where: { userId } } } } },
      });

      if (!channel || channel.server.members.length === 0) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      socket.join(`channel:${channelId}`);
      socket.emit('channel:joined', { channelId });
    });

    socket.on('channel:leave', (channelId: string) => {
      socket.leave(`channel:${channelId}`);
    });

    // ─── Message Events ───────────────────────────────────────────────────────

    socket.on('message:send', async (data: { channelId: string; content: string }) => {
      try {
        const { channelId, content } = data;

        if (!content?.trim()) return;

        const channel = await prisma.channel.findUnique({
          where: { id: channelId },
          include: { server: { include: { members: { where: { userId } } } } },
        });

        if (!channel || channel.server.members.length === 0) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        const message = await prisma.message.create({
          data: { content: content.trim(), authorId: userId, channelId },
          select: {
            id: true,
            content: true,
            edited: true,
            createdAt: true,
            author: { select: { id: true, username: true, avatar: true, status: true } },
            attachments: true,
            reactions: true,
          },
        });

        // Broadcast to channel
        io.to(`channel:${channelId}`).emit('message:new', message);
      } catch (error) {
        console.error('[Socket] message:send error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('message:edit', async (data: { messageId: string; content: string }) => {
      try {
        const message = await prisma.message.findUnique({ where: { id: data.messageId } });
        if (!message || message.authorId !== userId) {
          socket.emit('error', { message: 'Permission denied' });
          return;
        }

        const updated = await prisma.message.update({
          where: { id: data.messageId },
          data: { content: data.content, edited: true },
          select: {
            id: true,
            content: true,
            edited: true,
            channelId: true,
            createdAt: true,
            author: { select: { id: true, username: true, avatar: true } },
          },
        });

        io.to(`channel:${updated.channelId}`).emit('message:updated', updated);
      } catch (error) {
        console.error('[Socket] message:edit error:', error);
        socket.emit('error', { message: 'Failed to edit message' });
      }
    });

    socket.on('message:delete', async (data: { messageId: string; channelId: string }) => {
      try {
        const message = await prisma.message.findUnique({ where: { id: data.messageId } });
        if (!message || message.authorId !== userId) {
          socket.emit('error', { message: 'Permission denied' });
          return;
        }

        await prisma.message.delete({ where: { id: data.messageId } });
        io.to(`channel:${data.channelId}`).emit('message:deleted', { id: data.messageId, channelId: data.channelId });
      } catch (error) {
        console.error('[Socket] message:delete error:', error);
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    socket.on('message:react', async (data: { messageId: string; emoji: string }) => {
      try {
        const message = await prisma.message.findUnique({ where: { id: data.messageId } });
        if (!message) return;

        const existing = await prisma.messageReaction.findUnique({
          where: { messageId_userId_emoji: { messageId: data.messageId, userId, emoji: data.emoji } },
        });

        if (existing) {
          await prisma.messageReaction.delete({ where: { id: existing.id } });
        } else {
          await prisma.messageReaction.create({
            data: { messageId: data.messageId, userId, emoji: data.emoji },
          });
        }

        // Emit updated reactions
        const reactions = await prisma.messageReaction.findMany({
          where: { messageId: data.messageId },
          include: { user: { select: { id: true, username: true } } },
        });

        io.to(`channel:${message.channelId}`).emit('message:reactions_updated', {
          messageId: data.messageId,
          reactions,
        });
      } catch (error) {
        console.error('[Socket] message:react error:', error);
      }
    });

    // ─── Typing Events ────────────────────────────────────────────────────────

    socket.on('typing:start', (channelId: string) => {
      socket.to(`channel:${channelId}`).emit('typing:start', {
        userId,
        username: socket.username,
        channelId,
      });
    });

    socket.on('typing:stop', (channelId: string) => {
      socket.to(`channel:${channelId}`).emit('typing:stop', { userId, channelId });
    });

    // ─── DM Events ───────────────────────────────────────────────────────────

    socket.on('dm:join', (dmId: string) => {
      socket.join(`dm:${dmId}`);
    });

    socket.on('dm:send', async (data: { dmId: string; content: string }) => {
      try {
        if (!data.content?.trim()) return;

        // Verify participant
        const participant = await prisma.directMessageParticipant.findUnique({
          where: { dmId_userId: { dmId: data.dmId, userId } },
        });

        if (!participant) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        const message = await prisma.message.create({
          data: { content: data.content.trim(), authorId: userId, dmId: data.dmId },
          select: {
            id: true,
            content: true,
            edited: true,
            dmId: true,
            createdAt: true,
            author: { select: { id: true, username: true, avatar: true, status: true } },
            attachments: true,
            reactions: true,
          },
        });

        // Update DM updatedAt
        await prisma.directMessage.update({ where: { id: data.dmId }, data: { updatedAt: new Date() } });

        // Broadcast to DM room
        io.to(`dm:${data.dmId}`).emit('message:new', { ...message, channelId: data.dmId });
      } catch (error) {
        console.error('[Socket] dm:send error:', error);
        socket.emit('error', { message: 'Failed to send DM' });
      }
    });

    socket.on('dm:leave', (dmId: string) => {
      socket.leave(`dm:${dmId}`);
    });

    // ─── Disconnect ───────────────────────────────────────────────────────────

    socket.on('disconnect', async () => {
      console.log(`[Socket] User ${userId} disconnected`);

      await prisma.user.update({
        where: { id: userId },
        data: { status: 'OFFLINE' },
      });

      socket.broadcast.emit('user:status', { userId, status: 'OFFLINE' });
    });
  });
}
