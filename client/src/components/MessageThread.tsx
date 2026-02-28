import React, { useEffect, useState } from 'react';
import { Reply, X } from 'lucide-react';

interface User {
  id: string;
  username: string;
  avatar?: string;
  status: 'ONLINE' | 'IDLE' | 'DND' | 'OFFLINE';
}

interface Message {
  id: string;
  content: string;
  edited: boolean;
  author: User;
  createdAt: string;
  attachments: any[];
  reactions: any[];
  replyCount?: number;
}

interface MessageThreadProps {
  messageId: string;
  onClose: () => void;
}

export const MessageThread: React.FC<MessageThreadProps> = ({ messageId, onClose }) => {
  const [parentMessage, setParentMessage] = useState<Message | null>(null);
  const [replies, setReplies] = useState<Message[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchThread();
  }, [messageId]);

  const fetchThread = async () => {
    try {
      const res = await fetch(`/api/messages/${messageId}/thread`);
      const data = await res.json();
      setParentMessage(data.parent);
      setReplies(data.replies);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch thread:', error);
      setLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    setSending(true);
    try {
      // Send via socket or API
      const response = await fetch(`/api/messages/${messageId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent }),
      });

      if (response.ok) {
        setReplyContent('');
        // Refresh thread
        await fetchThread();
      }
    } catch (error) {
      console.error('Failed to send reply:', error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
          <div>Loading thread...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col z-50 shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="font-bold">Thread</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {parentMessage && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <ParentMessageView message={parentMessage} />
            {replies.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                </p>
                <div className="space-y-3">
                  {replies.map((reply) => (
                    <ReplyMessage key={reply.id} message={reply} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reply Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSendReply} className="flex gap-2">
          <input
            type="text"
            placeholder="Reply in thread..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            className="flex-1 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!replyContent.trim() || sending}
            className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded transition"
          >
            <Reply size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

interface ParentMessageViewProps {
  message: Message;
}

const ParentMessageView: React.FC<ParentMessageViewProps> = ({ message }) => {
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <img
          src={message.author.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.author.id}`}
          alt={message.author.username}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{message.author.username}</span>
            <span className="text-xs text-gray-500">
              {new Date(message.createdAt).toLocaleString()}
            </span>
            {message.edited && <span className="text-xs text-gray-400">(edited)</span>}
          </div>
          <p className="text-gray-900 dark:text-white mt-1">{message.content}</p>
          {message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm"
                >
                  📎 {attachment.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface ReplyMessageProps {
  message: Message;
}

const ReplyMessage: React.FC<ReplyMessageProps> = ({ message }) => {
  return (
    <div className="flex gap-2">
      <img
        src={message.author.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.author.id}`}
        alt={message.author.username}
        className="w-8 h-8 rounded-full object-cover"
      />
      <div className="flex-1 text-sm">
        <div className="font-semibold text-gray-900 dark:text-white">
          {message.author.username}
        </div>
        <p className="text-gray-700 dark:text-gray-300 mt-0.5">{message.content}</p>
        <div className="text-xs text-gray-500 mt-1">
          {new Date(message.createdAt).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};
