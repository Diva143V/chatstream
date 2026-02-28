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

    // Join user-specific room for personal events
    socket.join(`user:${userId}`);

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

        // Check for active timeout
        const latestTimeout = await prisma.moderationAction.findFirst({
          where: {
            targetId: userId,
            serverId: channel.serverId,
            type: { in: ['TIMEOUT', 'UNTIMEOUT'] },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (latestTimeout && latestTimeout.type === 'TIMEOUT') {
          const isExpired = latestTimeout.expiresAt ? new Date() > latestTimeout.expiresAt : false;
          if (!isExpired) {
            socket.emit('error', {
              message: 'You are timed out from sending messages in this server',
              expiresAt: latestTimeout.expiresAt
            });
            return;
          }
        }

        const message = await prisma.message.create({
          data: { content: content.trim(), authorId: userId, channelId },
          select: {
            id: true,
            content: true,
            edited: true,
            channelId: true,
            createdAt: true,
            author: { select: { id: true, username: true, avatar: true, status: true } },
            attachments: true,
            reactions: true,
          },
        });

        // Check for mentions and emit notifications
        const mentionRegex = /<@(\w+)>/g;
        let mentionMatch;
        while ((mentionMatch = mentionRegex.exec(content)) !== null) {
          const mentionedUserId = mentionMatch[1];
          const mentionedUser = await prisma.user.findUnique({
            where: { id: mentionedUserId },
            include: { notificationSettings: true },
          });

          if (mentionedUser && mentionedUser.notificationSettings?.mentions) {
            const notification = await prisma.notification.create({
              data: {
                userId: mentionedUserId,
                type: 'MENTION',
                title: `${socket.username} mentioned you`,
                content: content.substring(0, 100),
                data: {
                  channelId,
                  messageId: message.id,
                  authorId: userId,
                  username: socket.username,
                },
              },
            });

            // Emit notification via socket
            io.to(`user:${mentionedUserId}`).emit('notification:new', {
              id: notification.id,
              type: 'MENTION',
              title: notification.title,
              content: notification.content,
              data: notification.data,
            });
          }
        }

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
            dmId: true,
            createdAt: true,
            author: { select: { id: true, username: true, avatar: true } },
          },
        });

        if (updated.dmId) {
          io.to(`dm:${updated.dmId}`).emit('message:updated', { ...updated, channelId: updated.dmId });
        } else {
          io.to(`channel:${updated.channelId}`).emit('message:updated', updated);
        }
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

        if (message.dmId) {
          io.to(`dm:${message.dmId}`).emit('message:deleted', { id: data.messageId, channelId: message.dmId });
        } else {
          io.to(`channel:${data.channelId}`).emit('message:deleted', { id: data.messageId, channelId: data.channelId });
        }
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

        if (message.dmId) {
          io.to(`dm:${message.dmId}`).emit('message:reactions_updated', {
            messageId: data.messageId,
            reactions,
            channelId: message.dmId
          });
        } else {
          io.to(`channel:${message.channelId}`).emit('message:reactions_updated', {
            messageId: data.messageId,
            reactions,
            channelId: message.channelId
          });
        }
      } catch (error) {
        console.error('[Socket] message:react error:', error);
      }
    });

    // ─── Message Reply/Threading ──────────────────────────────────────────────

    socket.on('message:reply', async (data: { parentId: string; content: string; channelId: string }) => {
      try {
        const { parentId, content, channelId } = data;

        if (!content?.trim()) return;

        // Verify parent message exists and access
        const parentMessage = await prisma.message.findUnique({
          where: { id: parentId },
          include: {
            channel: { include: { server: { include: { members: { where: { userId } } } } } },
            author: true,
          },
        });

        if (!parentMessage || parentMessage.channel?.server?.members?.length === 0) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        // Create reply message
        const reply = await prisma.message.create({
          data: {
            content: content.trim(),
            authorId: userId,
            channelId,
            parentId,
          },
          select: {
            id: true,
            content: true,
            edited: true,
            channelId: true,
            parentId: true,
            createdAt: true,
            author: { select: { id: true, username: true, avatar: true, status: true } },
            attachments: true,
            reactions: true,
          },
        });

        // Increment parent replyCount
        await prisma.message.update({
          where: { id: parentId },
          data: { replyCount: { increment: 1 } },
        });

        // Notify parent message author
        if (parentMessage.author.id !== userId) {
          const parentAuthor = await prisma.user.findUnique({
            where: { id: parentMessage.author.id },
            include: { notificationSettings: true },
          });

          if (parentAuthor && parentAuthor.notificationSettings?.replies) {
            const notification = await prisma.notification.create({
              data: {
                userId: parentMessage.author.id,
                type: 'MENTION', // Use MENTION for replies
                title: `${socket.username} replied to your message`,
                content: content.substring(0, 100),
                data: {
                  channelId,
                  messageId: reply.id,
                  parentId,
                  authorId: userId,
                  username: socket.username,
                },
              },
            });

            io.to(`user:${parentMessage.author.id}`).emit('notification:new', {
              id: notification.id,
              type: 'MENTION',
              title: notification.title,
              content: notification.content,
              data: notification.data,
            });
          }
        }

        // Broadcast reply to channel
        io.to(`channel:${channelId}`).emit('message:reply', reply);
      } catch (error) {
        console.error('[Socket] message:reply error:', error);
        socket.emit('error', { message: 'Failed to send reply' });
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

    // ─── Message Pinning ──────────────────────────────────────────────────────

    socket.on('message:pin', async (data: { messageId: string; channelId: string }) => {
      try {
        const message = await prisma.message.findUnique({
          where: { id: data.messageId },
          include: { channel: { include: { server: { include: { members: { where: { userId } } } } } } },
        });

        if (!message || !message.channel || message.channel.server.members.length === 0) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        // Check permissions (owner/admin/moderator can pin)
        const member = await prisma.serverMember.findUnique({
          where: { userId_serverId: { userId, serverId: message.channel.serverId } },
        });

        if (!member || !['OWNER', 'ADMIN', 'MODERATOR'].includes(member.role)) {
          socket.emit('error', { message: 'Insufficient permissions' });
          return;
        }

        const updated = await prisma.message.update({
          where: { id: data.messageId },
          data: { pinned: true, pinnedAt: new Date(), pinnedById: userId },
          select: {
            id: true,
            pinned: true,
            pinnedAt: true,
            channelId: true,
          },
        });

        io.to(`channel:${data.channelId}`).emit('message:pinned', updated);
      } catch (error) {
        console.error('[Socket] message:pin error:', error);
        socket.emit('error', { message: 'Failed to pin message' });
      }
    });

    socket.on('message:unpin', async (data: { messageId: string; channelId: string }) => {
      try {
        const message = await prisma.message.findUnique({
          where: { id: data.messageId },
          include: { channel: { include: { server: { include: { members: { where: { userId } } } } } } },
        });

        if (!message || !message.channel || message.channel.server.members.length === 0) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        const updated = await prisma.message.update({
          where: { id: data.messageId },
          data: { pinned: false, pinnedAt: null, pinnedById: null },
          select: {
            id: true,
            pinned: true,
            channelId: true,
          },
        });

        io.to(`channel:${data.channelId}`).emit('message:unpinned', updated);
      } catch (error) {
        console.error('[Socket] message:unpin error:', error);
        socket.emit('error', { message: 'Failed to unpin message' });
      }
    });

    // ─── User Presence ────────────────────────────────────────────────────────

    socket.on('user:setStatus', async (status: 'ONLINE' | 'IDLE' | 'DND' | 'OFFLINE') => {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { status },
        });

        socket.broadcast.emit('user:statusChanged', { userId, status });
      } catch (error) {
        console.error('[Socket] user:setStatus error:', error);
      }
    });

    socket.on('user:setCustomStatus', async (data: { status?: string; emoji?: string; expiresAt?: Date }) => {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: {
            customStatus: data.status,
            customStatusEmoji: data.emoji,
            statusExpiresAt: data.expiresAt,
          },
        });

        socket.broadcast.emit('user:customStatusChanged', {
          userId,
          customStatus: data.status,
          customStatusEmoji: data.emoji,
          statusExpiresAt: data.expiresAt,
        });
      } catch (error) {
        console.error('[Socket] user:setCustomStatus error:', error);
      }
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
        // We set channelId to the dmId for the client store
        io.to(`dm:${data.dmId}`).emit('message:new', { ...message, channelId: data.dmId });
      } catch (error) {
        console.error('[Socket] dm:send error:', error);
        socket.emit('error', { message: 'Failed to send DM' });
      }
    });

    socket.on('dm:leave', (dmId: string) => {
      socket.leave(`dm:${dmId}`);
    });

    socket.on('dm:call_initiate', (dmId: string) => {
      console.log(`[Socket] Call initiated in DM: ${dmId} by ${userId}`);
      // Notify others in the room about the incoming call
      socket.to(`dm:${dmId}`).emit('dm:incoming_call', { dmId, callerId: userId });
    });

    socket.on('dm:call_end', (dmId: string) => {
      console.log(`[Socket] Call ended in DM: ${dmId}`);
      io.to(`dm:${dmId}`).emit('dm:call_ended', { dmId });
    });

    // ─── Disconnect ───────────────────────────────────────────────────────────

    socket.on('disconnect', async () => {
      console.log(`[Socket] User ${userId} disconnected`);

      await prisma.user.update({
        where: { id: userId },
        data: { status: 'OFFLINE', lastSeenAt: new Date() },
      });

      socket.broadcast.emit('user:status', { userId, status: 'OFFLINE' });
    });
  });
}
