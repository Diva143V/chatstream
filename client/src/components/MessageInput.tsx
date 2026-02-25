import { useState, useRef, useCallback, useEffect } from 'react';
import { Paperclip, Smile, Send, Plus } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useSocket } from '@/hooks/useSocket';
import { cn } from '@/lib/utils';
import type { Channel } from '@/types';

interface MessageInputProps {
  channel: Channel;
}

const TYPING_DEBOUNCE_MS = 2000;

export function MessageInput({ channel }: MessageInputProps) {
  const { user } = useAuthStore();
  const { sendMessage, startTyping, stopTyping } = useSocket();
  const [content, setContent] = useState('');
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [content]);

  const handleTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      startTyping(channel.id);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      stopTyping(channel.id);
    }, TYPING_DEBOUNCE_MS);
  }, [channel.id, startTyping, stopTyping]);

  const handleSend = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed || !user) return;

    sendMessage(channel.id, trimmed);
    setContent('');

    // Stop typing indicator
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      stopTyping(channel.id);
    }
  }, [content, user, channel.id, sendMessage, stopTyping]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const placeholder =
    channel.type === 'VOICE'
      ? 'This is a voice channel'
      : `Message #${channel.name}`;

  const disabled = channel.type === 'VOICE';

  return (
    <div className="px-4 pb-4 pt-2">
      <div className={cn(
        'flex items-end gap-2 bg-surface-raised border border-white/10 rounded-xl p-2 focus-within:border-brand/40 transition-colors',
        disabled && 'opacity-50 cursor-not-allowed'
      )}>
        {/* Attach file */}
        <button
          type="button"
          disabled={disabled}
          className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex-shrink-0"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Message textarea */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            handleTyping();
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-white placeholder:text-white/30 focus:outline-none resize-none py-2 text-sm leading-relaxed scrollbar-hide"
        />

        {/* Emoji + send */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            disabled={disabled}
            className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <button
            type="button"
            disabled={disabled}
            className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <Smile className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={disabled || !content.trim()}
            className="p-2 bg-brand hover:bg-brand-dark disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-all"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
