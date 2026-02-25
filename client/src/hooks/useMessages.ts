import { useEffect, useMemo, useRef } from 'react';
import { useMessageStore } from '@/store/useMessageStore';
import type { Message, MessageGroup } from '@/types';

const GROUPING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Groups consecutive messages from the same author
 * within the time threshold into message groups.
 */
function groupMessages(messages: Message[]): MessageGroup[] {
  return messages.reduce<MessageGroup[]>((groups, message) => {
    const last = groups[groups.length - 1];
    const lastMsg = last?.messages[last.messages.length - 1];
    const timeDiff = lastMsg
      ? new Date(message.createdAt).getTime() - new Date(lastMsg.createdAt).getTime()
      : Infinity;

    if (last && last.author.id === message.author.id && timeDiff < GROUPING_THRESHOLD_MS) {
      last.messages.push(message);
    } else {
      groups.push({ author: message.author, messages: [message] });
    }

    return groups;
  }, []);
}

export function useChannelMessages(channelId: string | null) {
  const { messagesByChannel, cursorByChannel, loadingByChannel, fetchMessages } = useMessageStore();

  const messages = channelId ? (messagesByChannel[channelId] ?? []) : [];
  const nextCursor = channelId ? cursorByChannel[channelId] : null;
  const isLoading = channelId ? (loadingByChannel[channelId] ?? false) : false;
  const hasMore = nextCursor !== null && nextCursor !== undefined;

  // Fetch on channel change
  const prevChannelRef = useRef<string | null>(null);
  useEffect(() => {
    if (!channelId || prevChannelRef.current === channelId) return;
    prevChannelRef.current = channelId;

    // Only fetch if we don't have messages yet
    if (!messagesByChannel[channelId]) {
      fetchMessages(channelId);
    }
  }, [channelId, messagesByChannel, fetchMessages]);

  // Load older messages
  const loadMore = () => {
    if (channelId && hasMore && !isLoading && nextCursor) {
      fetchMessages(channelId, nextCursor);
    }
  };

  // Memoize grouped messages
  const groupedMessages = useMemo(() => groupMessages(messages), [messages]);

  return { messages, groupedMessages, isLoading, hasMore, loadMore };
}
