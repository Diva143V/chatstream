import { create } from 'zustand';
import type { Message } from '@/types';
import api from '@/api/axios';

interface MessageStore {
  // Map of channelId -> Message[]
  messagesByChannel: Record<string, Message[]>;
  // Map of channelId -> next cursor for pagination
  cursorByChannel: Record<string, string | null>;
  // Map of channelId -> loading state
  loadingByChannel: Record<string, boolean>;

  // Actions
  fetchMessages: (channelId: string, cursor?: string) => Promise<void>;
  addMessage: (message: Message) => void;
  updateMessage: (message: Partial<Message> & { id: string }) => void;
  deleteMessage: (messageId: string, channelId: string) => void;
  updateReactions: (messageId: string, channelId: string, reactions: Message['reactions']) => void;
  reset: () => void;
}

export const useMessageStore = create<MessageStore>((set, get) => ({
  messagesByChannel: {},
  cursorByChannel: {},
  loadingByChannel: {},

  fetchMessages: async (channelId, cursor) => {
    // Prevent duplicate fetches
    if (get().loadingByChannel[channelId]) return;

    set((state) => ({
      loadingByChannel: { ...state.loadingByChannel, [channelId]: true },
    }));

    try {
      const params: Record<string, string> = { limit: '50' };
      if (cursor) params.cursor = cursor;

      const { data } = await api.get<{ messages: Message[]; nextCursor: string | null }>(
        `/messages/channel/${channelId}`,
        { params }
      );

      set((state) => {
        const existing = state.messagesByChannel[channelId] ?? [];
        // Prepend older messages if paginating
        const merged = cursor ? [...data.messages, ...existing] : data.messages;
        // Deduplicate
        const deduped = merged.filter(
          (m, i, arr) => arr.findIndex((x) => x.id === m.id) === i
        );

        return {
          messagesByChannel: { ...state.messagesByChannel, [channelId]: deduped },
          cursorByChannel: { ...state.cursorByChannel, [channelId]: data.nextCursor },
        };
      });
    } finally {
      set((state) => ({
        loadingByChannel: { ...state.loadingByChannel, [channelId]: false },
      }));
    }
  },

  addMessage: (message) => {
    const channelId = message.channelId;
    set((state) => {
      const existing = state.messagesByChannel[channelId] ?? [];
      // Avoid duplicates from socket + REST race
      if (existing.find((m) => m.id === message.id)) return state;
      return {
        messagesByChannel: { ...state.messagesByChannel, [channelId]: [...existing, message] },
      };
    });
  },

  updateMessage: (update) => {
    set((state) => {
      const updatedChannels = { ...state.messagesByChannel };
      for (const channelId in updatedChannels) {
        updatedChannels[channelId] = updatedChannels[channelId].map((m) =>
          m.id === update.id ? { ...m, ...update } : m
        );
      }
      return { messagesByChannel: updatedChannels };
    });
  },

  deleteMessage: (messageId, channelId) => {
    set((state) => ({
      messagesByChannel: {
        ...state.messagesByChannel,
        [channelId]: (state.messagesByChannel[channelId] ?? []).filter((m) => m.id !== messageId),
      },
    }));
  },

  updateReactions: (messageId, channelId, reactions) => {
    set((state) => ({
      messagesByChannel: {
        ...state.messagesByChannel,
        [channelId]: (state.messagesByChannel[channelId] ?? []).map((m) =>
          m.id === messageId ? { ...m, reactions } : m
        ),
      },
    }));
  },

  reset: () => set({ messagesByChannel: {}, cursorByChannel: {}, loadingByChannel: {} }),
}));
