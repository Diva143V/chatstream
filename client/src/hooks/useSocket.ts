import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/useAuthStore';
import { useMessageStore } from '@/store/useMessageStore';
import { useServerStore } from '@/store/useServerStore';
import { useUIStore } from '@/store/useUIStore';
import type { Message } from '@/types';

let socketInstance: Socket | null = null;

export function useSocket() {
  const { token, isAuthenticated } = useAuthStore();
  const { addMessage, updateMessage, deleteMessage, updateReactions } = useMessageStore();
  const { updateServer } = useServerStore();
  const { setTyping } = useUIStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      // Disconnect if logged out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        socketInstance = null;
      }
      return;
    }

    // Reuse existing socket connection
    if (socketInstance?.connected) {
      socketRef.current = socketInstance;
      return;
    }

    const SOCKET_URL = import.meta.env.VITE_API_URL || '';

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'], // Prioritize websocket
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 20000,
      withCredentials: true,
    });

    socketRef.current = socket;
    socketInstance = socket;

    // ─── Message Events ───────────────────────────────────────────────────────

    socket.on('message:new', (message: Message) => {
      addMessage(message);
    });

    socket.on('message:updated', (message: Message) => {
      updateMessage(message);
    });

    socket.on('message:deleted', ({ id, channelId }: { id: string; channelId: string }) => {
      deleteMessage(id, channelId);
    });

    socket.on(
      'message:reactions_updated',
      ({ messageId, reactions, channelId }: { messageId: string; reactions: Message['reactions']; channelId: string }) => {
        updateReactions(messageId, channelId, reactions);
      }
    );

    // ─── User Status Events ───────────────────────────────────────────────────

    socket.on('user:status', ({ userId, status }: { userId: string; status: string }) => {
      // Update member status in all servers
      const { servers } = useServerStore.getState();
      servers.forEach((server) => {
        const hasMember = server.members.some((m) => m.userId === userId);
        if (hasMember) {
          updateServer(server.id, {
            members: server.members.map((m) =>
              m.userId === userId ? { ...m, user: { ...m.user, status: status as Message['author']['status'] } } : m
            ),
          });
        }
      });
    });

    // ─── Typing Events ────────────────────────────────────────────────────────

    socket.on(
      'typing:start',
      ({ username, channelId }: { userId: string; username: string; channelId: string }) => {
        setTyping(channelId, username, true);
      }
    );

    socket.on('typing:stop', ({ userId, channelId }: { userId: string; channelId: string }) => {
      // We stored by username, so map via userId. Simplification: store by userId key
      setTyping(channelId, userId, false);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    return () => {
      // Don't disconnect on component unmount — keep alive across page navigation
      // Only disconnect on logout (handled above)
    };
  }, [isAuthenticated, token]);

  // ─── Actions ─────────────────────────────────────────────────────────────────

  const getSocket = () => socketRef.current || socketInstance;

  const joinChannel = useCallback((channelId: string) => {
    const socket = getSocket();
    if (socket) {
      console.log(`[Socket] Joining channel: ${channelId}`);
      socket.emit('channel:join', channelId);
    }
  }, []);

  const leaveChannel = useCallback((channelId: string) => {
    const socket = getSocket();
    if (socket) {
      console.log(`[Socket] Leaving channel: ${channelId}`);
      socket.emit('channel:leave', channelId);
    }
  }, []);

  const sendMessage = useCallback((channelId: string, content: string) => {
    const socket = getSocket();
    if (socket) {
      console.log(`[Socket] Sending message to channel: ${channelId}`);
      socket.emit('message:send', { channelId, content });
    } else {
      console.warn('[Socket] Cannot send message: No socket connection');
    }
  }, []);

  const editMessage = useCallback((messageId: string, content: string) => {
    getSocket()?.emit('message:edit', { messageId, content });
  }, []);

  const deleteMessageSocket = useCallback((messageId: string, channelId: string) => {
    getSocket()?.emit('message:delete', { messageId, channelId });
  }, []);

  const reactToMessage = useCallback((messageId: string, emoji: string) => {
    getSocket()?.emit('message:react', { messageId, emoji });
  }, []);

  const startTyping = useCallback((channelId: string) => {
    getSocket()?.emit('typing:start', channelId);
  }, []);

  const stopTyping = useCallback((channelId: string) => {
    getSocket()?.emit('typing:stop', channelId);
  }, []);

  const joinDM = useCallback((dmId: string) => {
    const socket = getSocket();
    if (socket) {
      console.log(`[Socket] Joining DM: ${dmId}`);
      socket.emit('dm:join', dmId);
    }
  }, []);

  const sendDM = useCallback((dmId: string, content: string) => {
    const socket = getSocket();
    if (socket) {
      console.log(`[Socket] Sending DM to: ${dmId}`);
      socket.emit('dm:send', { dmId, content });
    } else {
      console.warn('[Socket] Cannot send DM: No socket connection');
    }
  }, []);

  return {
    socket: socketRef.current,
    joinChannel,
    leaveChannel,
    sendMessage,
    editMessage,
    deleteMessage: deleteMessageSocket,
    reactToMessage,
    startTyping,
    stopTyping,
    joinDM,
    sendDM,
  };
}
