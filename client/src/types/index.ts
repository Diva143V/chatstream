// ─── User ─────────────────────────────────────────────────────────────────────

export type UserStatus = 'ONLINE' | 'IDLE' | 'DND' | 'OFFLINE';

export interface User {
  id: string;
  email: string;
  username: string;
  avatar: string | null;
  banner: string | null;
  bio: string | null;
  status: UserStatus;
  statusText: string | null;
  createdAt: string;
}

// ─── Server ───────────────────────────────────────────────────────────────────

export type ChannelType = 'TEXT' | 'VOICE' | 'ANNOUNCEMENT';
export type MemberRole = 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER';

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  serverId: string;
  category: string | null;
  position: number;
  topic: string | null;
}

export interface ServerMember {
  userId: string;
  role: MemberRole;
  user: Pick<User, 'id' | 'username' | 'avatar' | 'status' | 'statusText'>;
}

export interface Server {
  id: string;
  name: string;
  icon: string | null;
  banner: string | null;
  description: string | null;
  ownerId: string;
  createdAt: string;
  members: ServerMember[];
  channels: Channel[];
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export type AttachmentType = 'IMAGE' | 'VIDEO' | 'FILE';

export interface Attachment {
  id: string;
  type: AttachmentType;
  url: string;
  name: string;
  size: number | null;
}

export interface MessageReaction {
  id: string;
  emoji: string;
  userId: string;
  user: Pick<User, 'id' | 'username'>;
}

export interface Message {
  id: string;
  content: string;
  edited: boolean;
  channelId: string;
  dmId?: string | null;
  createdAt: string;
  author: Pick<User, 'id' | 'username' | 'avatar' | 'status'>;
  attachments: Attachment[];
  reactions: MessageReaction[];
}

export interface MessageGroup {
  author: Message['author'];
  messages: Message[];
}

// ─── Friends ──────────────────────────────────────────────────────────────────

export type FriendStatus = 'PENDING' | 'ACCEPTED' | 'BLOCKED';

export interface Friend {
  id: string;
  status: FriendStatus;
  requesterId: string;
  receiverId: string;
  requester: Pick<User, 'id' | 'username' | 'avatar' | 'status' | 'statusText'>;
  receiver: Pick<User, 'id' | 'username' | 'avatar' | 'status' | 'statusText'>;
  createdAt: string;
}

// ─── Direct Messages ──────────────────────────────────────────────────────────

export interface DmParticipant {
  userId: string;
  user: Pick<User, 'id' | 'username' | 'avatar' | 'status'>;
}

export interface DirectMessage {
  id: string;
  participants: DmParticipant[];
  messages: Pick<Message, 'id' | 'content' | 'createdAt' | 'author'>[];
  updatedAt: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType = 'MESSAGE' | 'FRIEND_REQUEST' | 'MENTION' | 'SYSTEM';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  read: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export type Theme = 'DARK' | 'LIGHT' | 'SYSTEM';
export type FontSize = 'SMALL' | 'MEDIUM' | 'LARGE';
export type MessageDisplay = 'COZY' | 'COMPACT';
export type DMPrivacy = 'EVERYONE' | 'FRIENDS' | 'NONE';

export interface UserSettings {
  theme: Theme;
  accentColor: string;
  fontSize: FontSize;
  messageDisplay: MessageDisplay;
  showAvatars: boolean;
  playNotificationSounds: boolean;
  showNotifications: boolean;
  showStatus: boolean;
  allowFriendRequests: boolean;
  allowDMs: DMPrivacy;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiError {
  error: string;
}

export interface PaginatedMessages {
  messages: Message[];
  nextCursor: string | null;
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

export interface TypingUser {
  userId: string;
  username: string;
  channelId: string;
}
