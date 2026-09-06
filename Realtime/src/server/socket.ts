import { Server } from 'socket.io';
import { RoomManager } from './room-manager';
import logger from '../../../shared/logger';
import { getSystemInfo } from '../../../shared/system';
import { MessageTypes, Roles, SocketType } from './types';

/** How often to push system metrics to the admin (ms). */
const INFO_INTERVAL_MS = 5_000;
/** Percentage threshold above which a resource-usage alert is sent. */
const ALERT_THRESHOLD = 70;

const rooms = new RoomManager();

export function registerSocketEvents(socket: SocketType, _io: Server): void {
  // ── join ───────────────────────────────────────────────────────────────────
  socket.on('join', async ({ pcName, room, role }, callback) => {
    if (!pcName?.trim() || !room?.trim()) {
      return callback({ error: 'pcName and room are required.' });
    }

    // Prevent duplicate PC names in the same room (user side only)
    if (role === Roles.User && rooms.hasUser(pcName, room)) {
      return callback({ error: `PC name "${pcName}" is already taken in room "${room}".` });
    }

    socket.join(room);
    socket.data.pcName = pcName;
    socket.data.room   = room;
    socket.data.role   = role;

    if (role === Roles.Admin) {
      rooms.setAdmin(room, socket);
      // Send currently connected users to the new admin
      socket.emit('userList', rooms.getUsersInRoom(room));

    } else if (role === Roles.User) {
      rooms.addUser(pcName, room, socket);

      const admin = rooms.getAdmin(room);
      admin?.emit('message', `${pcName} joined the room.`, MessageTypes.System, 'System');
      admin?.emit('join', { pcName, room });

      // Push system metrics every INFO_INTERVAL_MS (non-blocking CPU measurement)
      socket.data.infoInterval = setInterval(async () => {
        const currentAdmin = rooms.getAdmin(room);
        if (!currentAdmin) return; // No admin online — skip the measurement

        try {
          const info = await getSystemInfo();
          currentAdmin.emit('info', info, pcName);

          if (info.cpu.usedCpu >= ALERT_THRESHOLD) {
            currentAdmin.emit(
              'message',
              `${pcName}: CPU at ${info.cpu.usedCpu.toFixed(1)}%`,
              MessageTypes.Warning, 'System'
            );
          }
          if (info.memory.memoryUsagePercentage >= ALERT_THRESHOLD) {
            currentAdmin.emit(
              'message',
              `${pcName}: Memory at ${info.memory.memoryUsagePercentage.toFixed(1)}%`,
              MessageTypes.Warning, 'System'
            );
          }
        } catch (err) {
          logger.error(`System info error for ${pcName}`, err);
        }
      }, INFO_INTERVAL_MS);

      socket.emit('message', `Welcome, ${pcName}!`, MessageTypes.System, 'System');
    }

    logger.info(`Joined → ${pcName} in room "${room}" as ${role}`);
    callback({ success: true });
  });

  // ── selectChat ─────────────────────────────────────────────────────────────
  socket.on('selectChat', (selectedPcName, callback) => {
    if (socket.data.role !== Roles.Admin) {
      return callback({ error: 'Only admins can select chats.' });
    }

    rooms.selectChat(socket.id, selectedPcName);
    socket.emit('message', `Now chatting with ${selectedPcName}.`, MessageTypes.System, 'System');
    callback({ success: true });
  });

  // ── closeChat ──────────────────────────────────────────────────────────────
  socket.on('closeChat', (callback) => {
    if (socket.data.role !== Roles.Admin) {
      return callback({ error: 'Only admins can close chats.' });
    }

    rooms.clearSelectedChat(socket.id);
    socket.emit('message', 'Chat closed.', MessageTypes.System, 'System');
    callback({ success: true });
  });

  // ── message ────────────────────────────────────────────────────────────────
  socket.on('message', (msg, callback) => {
    const { pcName, room, role } = socket.data;

    if (!msg?.trim()) {
      return callback({ error: 'Message cannot be empty.' });
    }

    logger.debug(`Message from ${pcName}: ${msg}`);

    if (role === Roles.User) {
      const admin = rooms.getAdmin(room);
      admin?.emit('message', msg, MessageTypes.OtherSide, pcName);
      socket.emit('message', msg, MessageTypes.Normal, 'You');

    } else if (role === Roles.Admin) {
      const targetName = rooms.getSelectedChat(socket.id);
      if (!targetName) {
        return callback({ error: 'No chat selected. Use broadcast to message everyone.' });
      }

      const target = rooms.getUser(targetName, room);
      if (!target) {
        // Target disconnected since selection — clear stale selection
        rooms.clearSelectedChat(socket.id);
        return callback({ error: `${targetName} is no longer connected.` });
      }

      target.emit('message', msg, MessageTypes.OtherSide, 'Admin');
      socket.emit('message', msg, MessageTypes.Normal, `You → ${targetName}`);
    }

    callback({ success: true });
  });

  // ── broadcast ──────────────────────────────────────────────────────────────
  socket.on('broadcast', (msg, callback) => {
    if (!msg?.trim()) {
      return callback({ error: 'Broadcast message cannot be empty.' });
    }

    logger.debug(`Broadcast from ${socket.data.pcName}: ${msg}`);
    socket.broadcast.to(socket.data.room).emit('message', msg, MessageTypes.Broadcast, socket.data.pcName);
    socket.emit('message', msg, MessageTypes.Broadcast, 'You');
    callback({ success: true });
  });

  // ── disconnect ─────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const { pcName, room, role } = socket.data;
    if (!pcName) return; // Socket never completed the join handshake

    if (role === Roles.User) {
      rooms.removeUser(pcName, room);
      clearInterval(socket.data.infoInterval);

      const admin = rooms.getAdmin(room);
      admin?.emit('dis', pcName);
      admin?.emit('message', `${pcName} disconnected.`, MessageTypes.System, 'System');

    } else if (role === Roles.Admin) {
      // Bug fix: was deleting by socket.id — must delete by room key
      rooms.removeAdmin(room);
      rooms.clearSelectedChat(socket.id);
    }

    logger.info(`Disconnected → ${pcName} (${role}) from room "${room}"`);
  });
}