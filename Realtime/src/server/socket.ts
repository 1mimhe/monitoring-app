import { Server, Socket } from 'socket.io';
import logger from '../utils/logger';
import { MessageTypes, Roles, SocketType } from './types';
import { SystemUtilities } from '../utils/system';

const userSockets = new Map<string, SocketType>();
const adminSockets = new Map<string, SocketType>();
const adminSelectedChats = new Map<string, string>();
const systemUtilities = new SystemUtilities();

export function registerSocketEvents(
  socket: SocketType,
  io: Server
) {
  socket.on('join', async ({ pcName, room, role }, callback) => {
    if (userSockets.has(`${pcName}:${room}`)) return callback({ error: 'This pc name already exists.' });
   
    socket.join(room);
    socket.data.pcName = pcName;
    socket.data.room = room;
    socket.data.role = role;
    
    if (role === Roles.Admin) {
      adminSockets.set(room, socket);
      const connectedUsers: string[] = [];
      userSockets.forEach((_, key) => {
        const [userPcName, userRoom] = key.split(':');
        if (userRoom === room) {
          connectedUsers.push(userPcName);
        }
      });
      socket.emit('userList', connectedUsers);
    }
    
    if (role === Roles.User) {
      userSockets.set(`${pcName}:${room}`, socket);
      
      const adminSocket = adminSockets.get(room);
      adminSocket?.emit('message', `User ${pcName} joined to the room.`, MessageTypes.System, 'System');
      adminSocket?.emit('join', { pcName, room });

      socket.data.infoInterval = setInterval(async () => {
        try {
          const info = await systemUtilities.getSystemInfo();
          adminSocket?.emit('info', info, pcName);          
        } catch (error) {
          logger.error(`Error getting system info for ${pcName}:`, error);
        }
      }, 5000);
      
      socket.emit('message', `Welcome ${pcName}`, MessageTypes.System, 'System');
    }
   
    logger.info(`User joined -> ${pcName} in Room ${room} as ${role}`);
    callback({ success: true });
  });

  socket.on('selectChat', (selectedPcName, callback) => {
    if (socket.data.role !== Roles.Admin) {
      return callback({ error: 'Only admins can select chats' });
    }
    
    adminSelectedChats.set(socket.id, selectedPcName);
    socket.emit('message', `Chatting with ${selectedPcName}`, MessageTypes.System, 'System');
    callback({ success: true });
  });

  socket.on('closeChat', (callback) => {
    if (socket.data.role !== Roles.Admin) {
      return callback({ error: 'Only admins can clear chats' });
    }
    
    adminSelectedChats.delete(socket.id);
    socket.emit('message', 'Chat closed.', MessageTypes.System, 'System');
    callback({ success: true });
  });

  socket.on('message', (msg, callback) => {
    logger.info(`Message - from ${socket.data.pcName} -> ${msg}`);
    
    if (socket.data.role === Roles.User) {
      const adminSocket = adminSockets.get(socket.data.room);
      adminSocket?.emit('message', msg, MessageTypes.OtherSide, socket.data.pcName);

      socket.emit('message', msg, MessageTypes.Normal, 'You');
    } else if (socket.data.role === Roles.Admin) {
      const selectedPcName = adminSelectedChats.get(socket.id);
      if (selectedPcName) {
        const targetSocket = userSockets.get(`${selectedPcName}:${socket.data.room}`);
        if (targetSocket) {
          targetSocket.emit('message', msg, MessageTypes.OtherSide, 'Admin');
          socket.emit('message', msg, MessageTypes.Normal, `You to ${targetSocket.data.pcName}`);
        } else {
          socket.emit('error', `User ${selectedPcName} not found or disconnected`);
        }
      } else {
        socket.emit('error', 'No chat selected. Use broadcast to send to all users.');
      }
    }
    
    callback({ success: true });
  });

  socket.on('broadcast', (msg, callback) => {
    logger.info(`Broadcast - from ${socket.data.pcName} -> ${msg}`);
    
    socket.broadcast.to(socket.data.room).emit('message', msg, MessageTypes.Broadcast, socket.data.pcName);
    socket.emit('message', msg, MessageTypes.Broadcast, 'You');
    
    callback({ success: true });
  });

  socket.on('disconnect', () => {
    const { pcName, room, role } = socket.data;
    
    if (role === Roles.User) {
      userSockets.delete(`${pcName}:${room}`);
      
      if (socket.data.infoInterval) {
        clearInterval(socket.data.infoInterval);
      }
      
      const adminSocket = adminSockets.get(room);
      adminSocket?.emit('dis', pcName);
      adminSocket?.emit('message', `User ${pcName} disconnected.`, MessageTypes.System, 'System');
    } else if (role === Roles.Admin) {
      adminSockets.delete(socket.id);
      adminSelectedChats.delete(socket.id);
    }
    
    logger.warn(`User ${pcName} disconnected.`);
  });
}