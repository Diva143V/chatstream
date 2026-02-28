import React, { useEffect, useState } from 'react';
import { useNotificationStore } from '../../store/useNotificationStore';
import { Bell, X, Check, Settings } from 'lucide-react';

interface Notification {
  id: string;
  type: 'MESSAGE' | 'FRIEND_REQUEST' | 'MENTION' | 'REPLY' | 'SYSTEM';
  title: string;
  content: string;
  read: boolean;
  data?: Record<string, any>;
  createdAt: Date;
}

export const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    fetchNotifications,
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
    // Refresh every 10 seconds
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
  };

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-bold">Notifications</h2>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  title="Mark all as read"
                >
                  <Check size={18} />
                </button>
              )}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <Settings size={18} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {showSettings ? (
            <NotificationSettings onClose={() => setShowSettings(false)} />
          ) : (
            <>
              {/* Notifications List */}
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 dark:text-gray-500">
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onRead={() => handleNotificationClick(notification.id)}
                      onDismiss={() => removeNotification(notification.id)}
                    />
                  ))
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="p-3 text-center border-t border-gray-200 dark:border-gray-700">
                  <button className="text-sm text-blue-500 hover:underline">
                    View all notifications
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

interface NotificationItemProps {
  notification: Notification;
  onRead: () => void;
  onDismiss: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onRead,
  onDismiss,
}) => {
  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'MENTION':
        return '🔔';
      case 'FRIEND_REQUEST':
        return '👤';
      case 'REPLY':
        return '💬';
      case 'SYSTEM':
        return 'ℹ️';
      default:
        return '📨';
    }
  };

  const getTypeColor = (type: Notification['type']) => {
    switch (type) {
      case 'MENTION':
        return 'bg-blue-50 dark:bg-blue-900/20';
      case 'FRIEND_REQUEST':
        return 'bg-purple-50 dark:bg-purple-900/20';
      case 'REPLY':
        return 'bg-green-50 dark:bg-green-900/20';
      default:
        return 'bg-gray-50 dark:bg-gray-700/50';
    }
  };

  return (
    <div
      className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition ${getTypeColor(notification.type)} ${
        !notification.read ? 'font-semibold' : ''
      }`}
      onClick={onRead}
    >
      <div className="flex gap-3 items-start">
        <span className="text-xl">{getIcon(notification.type)}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {notification.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
            {notification.content}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            {formatTime(new Date(notification.createdAt))}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
        >
          <X size={16} />
        </button>
      </div>
      {!notification.read && (
        <div className="w-2 h-2 bg-blue-500 rounded-full ml-9 mt-2"></div>
      )}
    </div>
  );
};

interface NotificationSettingsProps {
  onClose: () => void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ onClose }) => {
  const {
    enableMentions,
    enableReplies,
    enableDMs,
    enableSounds,
    updateNotificationSettings,
  } = useNotificationStore();

  const handleToggle = async (key: string) => {
    const settings: Record<string, boolean> = {};
    switch (key) {
      case 'mentions':
        settings.enableMentions = !enableMentions;
        break;
      case 'replies':
        settings.enableReplies = !enableReplies;
        break;
      case 'dms':
        settings.enableDMs = !enableDMs;
        break;
      case 'sounds':
        settings.enableSounds = !enableSounds;
        break;
    }
    await updateNotificationSettings(settings);
  };

  return (
    <div className="p-4">
      <h3 className="font-bold text-sm mb-4">Notification Settings</h3>

      <div className="space-y-3">
        <SettingToggle
          label="Mentions"
          value={enableMentions}
          onChange={() => handleToggle('mentions')}
        />
        <SettingToggle
          label="Replies"
          value={enableReplies}
          onChange={() => handleToggle('replies')}
        />
        <SettingToggle
          label="Direct Messages"
          value={enableDMs}
          onChange={() => handleToggle('dms')}
        />
        <SettingToggle
          label="Notification Sounds"
          value={enableSounds}
          onChange={() => handleToggle('sounds')}
        />
      </div>

      <button
        onClick={onClose}
        className="w-full mt-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-semibold"
      >
        Done
      </button>
    </div>
  );
};

interface SettingToggleProps {
  label: string;
  value: boolean;
  onChange: () => void;
}

const SettingToggle: React.FC<SettingToggleProps> = ({ label, value, onChange }) => {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm text-gray-700 dark:text-gray-300">{label}</label>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          value ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            value ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
};

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
