import type { SocketType } from './types';

/**
 * Encapsulates all runtime state for connected users and admins.
 * Replaces the three module-level Maps that made socket.ts untestable.
 *
 * Key convention:  userSockets → "<pcName>:<room>"
 *                  adminSockets → "<room>"
 *                  adminSelectedChats → "<socket.id>" → pcName
 */
export class RoomManager {
  private readonly userSockets    = new Map<string, SocketType>();
  private readonly adminSockets   = new Map<string, SocketType>();
  private readonly selectedChats  = new Map<string, string>();

  // ── Users ──────────────────────────────────────────────────────────────────

  addUser(pcName: string, room: string, socket: SocketType): void {
    this.userSockets.set(this.userKey(pcName, room), socket);
  }

  removeUser(pcName: string, room: string): void {
    this.userSockets.delete(this.userKey(pcName, room));
  }

  hasUser(pcName: string, room: string): boolean {
    return this.userSockets.has(this.userKey(pcName, room));
  }

  getUser(pcName: string, room: string): SocketType | undefined {
    return this.userSockets.get(this.userKey(pcName, room));
  }

  /** Returns PC names of all online users in a room. */
  getUsersInRoom(room: string): string[] {
    const users: string[] = [];
    for (const key of this.userSockets.keys()) {
      const [name, r] = key.split(':');
      if (r === room) users.push(name);
    }
    return users;
  }

  // ── Admins ─────────────────────────────────────────────────────────────────

  setAdmin(room: string, socket: SocketType): void {
    this.adminSockets.set(room, socket);
  }

  /** Bug fix: original code used socket.id as the key — should be room. */
  removeAdmin(room: string): void {
    this.adminSockets.delete(room);
  }

  getAdmin(room: string): SocketType | undefined {
    return this.adminSockets.get(room);
  }

  // ── Selected Chats (admin → user) ──────────────────────────────────────────

  selectChat(socketId: string, pcName: string): void {
    this.selectedChats.set(socketId, pcName);
  }

  clearSelectedChat(socketId: string): void {
    this.selectedChats.delete(socketId);
  }

  getSelectedChat(socketId: string): string | undefined {
    return this.selectedChats.get(socketId);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private userKey(pcName: string, room: string): string {
    return `${pcName}:${room}`;
  }
}
