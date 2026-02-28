// Permission Bitflags
export const Permissions = {
  VIEW_CHANNEL: 1 << 0,        // 1
  SEND_MESSAGES: 1 << 1,       // 2
  SEND_TTS_MESSAGES: 1 << 2,   // 4
  EMBED_LINKS: 1 << 3,         // 8
  ATTACH_FILES: 1 << 4,        // 16
  READ_MESSAGE_HISTORY: 1 << 5, // 32
  MENTION_EVERYONE: 1 << 6,    // 64
  USE_EXTERNAL_EMOJIS: 1 << 7, // 128
  MANAGE_MESSAGES: 1 << 8,     // 256
  MANAGE_CHANNELS: 1 << 9,     // 512
  MANAGE_GUILD: 1 << 10,       // 1024
  ADMINISTRATOR: 1 << 11,      // 2048
} as const;

import { prisma } from './prisma';

export async function canUserAccessChannel(
  userId: string,
  channelId: string,
  requiredPermission: number
): Promise<boolean> {
  try {
    // Get channel and server
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: { server: true },
    });

    if (!channel) return false;

    // Check if user is server member
    const member = await prisma.serverMember.findUnique({
      where: { userId_serverId: { userId, serverId: channel.serverId } },
      include: { roles: true },
    });

    if (!member) return false;

    // Server owner has all permissions
    if (member.role === 'OWNER') return true;

    // Get all permissions for the user
    let allowedPermissions = 0;
    let deniedPermissions = 0;

    // 1. Get default server permissions from roles
    for (const role of member.roles) {
      allowedPermissions |= role.permissions;
    }

    // 2. Check channel-level overrides for roles
    const roleOverrides = await prisma.channelPermission.findMany({
      where: {
        channelId,
        roleId: { in: member.roles.map((r) => r.id) },
      },
    });

    for (const override of roleOverrides) {
      allowedPermissions |= override.allow;
      deniedPermissions |= override.deny;
    }

    // 3. Check channel-level overrides for user
    const userOverride = await prisma.channelPermission.findUnique({
      where: { id: `${channelId}_${userId}` },
    });

    if (userOverride) {
      allowedPermissions |= userOverride.allow;
      deniedPermissions |= userOverride.deny;
    }

    // Check if permission is denied (deny takes precedence)
    if (deniedPermissions & requiredPermission) {
      return false;
    }

    // Check if permission is allowed
    return (allowedPermissions & requiredPermission) !== 0;
  } catch (error) {
    console.error('Error checking channel access:', error);
    return false;
  }
}

export async function getUserChannelPermissions(userId: string, channelId: string): Promise<number> {
  try {
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: { server: true },
    });

    if (!channel) return 0;

    const member = await prisma.serverMember.findUnique({
      where: { userId_serverId: { userId, serverId: channel.serverId } },
      include: { roles: true },
    });

    if (!member) return 0;

    // Server owner has all permissions
    if (member.role === 'OWNER') {
      return Object.values(Permissions).reduce((a, b) => a | b, 0);
    }

    let permissions = 0;

    // Get role permissions
    for (const role of member.roles) {
      permissions |= role.permissions;
    }

    // Apply channel overrides for roles
    const roleOverrides = await prisma.channelPermission.findMany({
      where: {
        channelId,
        roleId: { in: member.roles.map((r) => r.id) },
      },
    });

    for (const override of roleOverrides) {
      permissions |= override.allow;
      permissions &= ~override.deny; // Remove denied permissions
    }

    // Apply user override if exists
    const userOverride = await prisma.channelPermission.findFirst({
      where: {
        channelId,
        userId,
      },
    });

    if (userOverride) {
      permissions |= userOverride.allow;
      permissions &= ~userOverride.deny;
    }

    return permissions;
  } catch (error) {
    console.error('Error getting user channel permissions:', error);
    return 0;
  }
}
