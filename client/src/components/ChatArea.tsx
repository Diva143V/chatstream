import { useEffect, useRef, useCallback, useState, memo } from 'react';
import {
  Hash, Bell, Pin, Users, Search, Volume2, Megaphone,
  Reply, Copy, Edit, Trash2
} from 'lucide-react';
import { useServerStore } from '@/store/useServerStore';
import { useUIStore } from '@/store/useUIStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useChannelMessages } from '@/hooks/useMessages';
import { useSocket } from '@/hooks/useSocket';
import { MessageInput } from './MessageInput';
import { cn, formatMessageTime, formatDateDivider } from '@/lib/utils';
import type { Message, MessageGroup } from '@/types';

// ─── Message Action Toolbar ───────────────────────────────────────────────────

function MessageActions({
  message,
  isOwn,
  onEdit,
  onDelete,
}: {
  message: Message;
  isOwn: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={cn(
      'absolute top-0 bg-surface-raised rounded-lg border border-white/10 shadow-xl flex items-center animate-fade-in z-10',
      isOwn ? 'right-full mr-2' : 'left-full ml-2'
    )}>
      <ActionBtn icon={Reply} title="Reply" />
      <ActionBtn icon={Copy} title="Copy" onClick={() => navigator.clipboard.writeText(message.content)} />
      {isOwn && (
        <>
          <ActionBtn icon={Edit} title="Edit" onClick={onEdit} />
          <ActionBtn icon={Trash2} title="Delete" onClick={onDelete} danger />
        </>
      )}
    </div>
  );
}

function ActionBtn({ icon: Icon, title, onClick, danger }: {
  icon: typeof Reply;
  title: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'p-2 transition-colors',
        danger
          ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
          : 'text-white/50 hover:text-white hover:bg-white/5'
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

// ─── Single Message ───────────────────────────────────────────────────────────

const MessageItem = memo(function MessageItem({
  message,
  isOwn,
  isFirst,
}: {
  message: Message;
  isOwn: boolean;
  isFirst: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const { editMessage, deleteMessage: deleteSocket } = useSocket();

  const handleEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      editMessage(message.id, editContent.trim());
    }
    setEditing(false);
  };

  return (
    <div
      className={cn('relative group', !isFirst && 'mt-0.5')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {editing ? (
        <div className="px-4">
          <textarea
            autoFocus
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit(); }
              if (e.key === 'Escape') { setEditing(false); setEditContent(message.content); }
            }}
            className="w-full bg-surface-overlay border border-brand/40 rounded-xl px-4 py-2 text-white text-sm focus:outline-none resize-none"
            rows={2}
          />
          <p className="text-xs text-white/30 mt-1">Enter to save · Esc to cancel</p>
        </div>
      ) : (
        <div className="px-4 py-0.5 hover:bg-white/[0.02] relative">
          <span className="text-white/90 text-sm break-words">{message.content}</span>
          {message.edited && <span className="text-xs text-white/25 ml-1.5">(edited)</span>}

          {/* Timestamp on hover */}
          <span className="ml-2 text-xs text-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
            {formatMessageTime(message.createdAt)}
          </span>

          {/* Reactions */}
          {message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {message.reactions.map((r) => (
                <button key={r.id} className="flex items-center gap-1 px-2 py-0.5 bg-brand/15 hover:bg-brand/25 rounded-full text-sm transition-colors">
                  <span>{r.emoji}</span>
                  <span className="text-white/50 text-xs">{message.reactions.filter(x => x.emoji === r.emoji).length}</span>
                </button>
              ))}
            </div>
          )}

          {/* Hover actions */}
          {hovered && (
            <MessageActions
              message={message}
              isOwn={isOwn}
              onEdit={() => setEditing(true)}
              onDelete={() => deleteSocket(message.id, message.channelId)}
            />
          )}
        </div>
      )}
    </div>
  );
});

// ─── Message Group ────────────────────────────────────────────────────────────

const MessageGroupItem = memo(function MessageGroupItem({
  group,
  currentUserId,
}: {
  group: MessageGroup;
  currentUserId: string | undefined;
}) {
  const { author, messages } = group;
  const isOwn = author.id === currentUserId;

  return (
    <div className="flex gap-3 pt-4 px-4 hover:bg-white/[0.01] transition-colors">
      {/* Avatar */}
      <div className="flex-shrink-0 pt-0.5">
        {author.avatar ? (
          <img src={author.avatar} alt={author.username} className="w-10 h-10 rounded-full" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-white font-bold">
            {author.username[0].toUpperCase()}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-baseline gap-2 mb-1">
          <span className={cn('font-semibold text-sm hover:underline cursor-pointer', isOwn ? 'text-brand-light' : 'text-white')}>
            {author.username}
          </span>
          <span className="text-xs text-white/30">{formatMessageTime(messages[0].createdAt)}</span>
        </div>

        {/* Messages */}
        <div className="-mx-4">
          {messages.map((msg, i) => (
            <MessageItem key={msg.id} message={msg} isOwn={isOwn} isFirst={i === 0} />
          ))}
        </div>
      </div>
    </div>
  );
});

// ─── Channel Header ───────────────────────────────────────────────────────────

function ChannelHeader() {
  const { selectedServer } = useServerStore();
  const { selectedChannel } = useServerStore();
  const { membersPanelOpen, toggleMembersPanel } = useUIStore();

  if (!selectedChannel) return null;

  const Icon = selectedChannel.type === 'VOICE' ? Volume2 : selectedChannel.type === 'ANNOUNCEMENT' ? Megaphone : Hash;

  return (
    <div className="h-14 px-4 flex items-center justify-between border-b border-white/5 bg-surface-base/80 backdrop-blur-sm flex-shrink-0">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-white/40" />
        <span className="font-semibold text-white">{selectedChannel.name}</span>
        {selectedChannel.topic && (
          <>
            <div className="w-px h-4 bg-white/20" />
            <span className="text-sm text-white/40 truncate max-w-xs">{selectedChannel.topic}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <button className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
          <Pin className="w-5 h-5" />
        </button>
        <button
          onClick={toggleMembersPanel}
          className={cn(
            'p-2 rounded-lg transition-colors flex items-center gap-1.5',
            membersPanelOpen ? 'text-white bg-white/10' : 'text-white/40 hover:text-white hover:bg-white/5'
          )}
        >
          <Users className="w-5 h-5" />
          <span className="text-sm">{selectedServer?.members.length ?? 0}</span>
        </button>
        <div className="w-px h-6 bg-white/10 mx-1" />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            placeholder="Search"
            className="pl-9 pr-3 py-1.5 bg-surface-raised border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-brand w-36 transition-all"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Date Divider ─────────────────────────────────────────────────────────────

function DateDivider({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-4 my-4 px-4">
      <div className="flex-1 h-px bg-white/10" />
      <span className="text-xs text-white/40 uppercase font-medium tracking-wider">
        {formatDateDivider(date)}
      </span>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator({ names }: { names: string[] }) {
  if (names.length === 0) return <div className="h-6" />;

  const label =
    names.length === 1
      ? `${names[0]} is typing...`
      : names.length === 2
      ? `${names[0]} and ${names[1]} are typing...`
      : `${names.length} people are typing...`;

  return (
    <div className="px-4 pb-1 flex items-center gap-2 h-6">
      <div className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
      <span className="text-xs text-white/40">{label}</span>
    </div>
  );
}

// ─── Main ChatArea ────────────────────────────────────────────────────────────

export function ChatArea() {
  const { selectedChannel, selectedChannelId } = useServerStore();
  const { user } = useAuthStore();
  const { typingUsers } = useUIStore();
  const { joinChannel, leaveChannel } = useSocket();

  const { groupedMessages, isLoading, hasMore, loadMore } = useChannelMessages(selectedChannelId);

  const bottomRef = useRef<HTMLDivElement>(null);
  const prevChannelRef = useRef<string | null>(null);

  // Join/leave channel socket room
  useEffect(() => {
    if (!selectedChannelId) return;
    if (prevChannelRef.current && prevChannelRef.current !== selectedChannelId) {
      leaveChannel(prevChannelRef.current);
    }
    joinChannel(selectedChannelId);
    prevChannelRef.current = selectedChannelId;
  }, [selectedChannelId, joinChannel, leaveChannel]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [groupedMessages.length]);

  // Load more on scroll to top
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop < 100 && hasMore && !isLoading) {
      loadMore();
    }
  }, [hasMore, isLoading, loadMore]);

  if (!selectedChannel) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-base">
        <div className="text-center">
          <Hash className="w-16 h-16 text-white/10 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white/30">Select a channel to start chatting</h3>
        </div>
      </div>
    );
  }

  const typingNames = typingUsers[selectedChannelId ?? ''] ?? [];

  // Find date separators
  const messageGroups = groupedMessages;

  return (
    <div className="flex-1 flex flex-col bg-surface-base overflow-hidden">
      <ChannelHeader />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-hide" onScroll={handleScroll}>
        {/* Load more indicator */}
        {isLoading && (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-white/20 border-t-brand rounded-full animate-spin" />
          </div>
        )}

        {/* Welcome message */}
        {!hasMore && (
          <div className="px-4 py-8">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-brand/15 mb-4">
              <Hash className="w-8 h-8 text-brand-light" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Welcome to #{selectedChannel.name}!</h2>
            <p className="text-white/40">This is the start of the #{selectedChannel.name} channel.</p>
          </div>
        )}

        {/* Message groups with date dividers */}
        {messageGroups.map((group, idx) => {
          const prevGroup = messageGroups[idx - 1];
          const showDate =
            !prevGroup ||
            formatDateDivider(group.messages[0].createdAt) !==
              formatDateDivider(prevGroup.messages[0].createdAt);

          return (
            <div key={`${group.author.id}-${group.messages[0].id}`}>
              {showDate && <DateDivider date={group.messages[0].createdAt} />}
              <MessageGroupItem group={group} currentUserId={user?.id} />
            </div>
          );
        })}

        <div className="h-4" />
        <div ref={bottomRef} />
      </div>

      {/* Typing indicator */}
      <TypingIndicator names={typingNames} />

      {/* Message input */}
      <MessageInput channel={selectedChannel} />
    </div>
  );
}
