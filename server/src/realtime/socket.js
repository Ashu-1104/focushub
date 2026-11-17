import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io = null;

const userRoom = (userId) => `user:${userId}`;

// Pull the access token from the handshake: socket auth payload first, then the auth cookie.
const tokenFromHandshake = (handshake) => {
  if (handshake.auth?.token) return handshake.auth.token;
  const cookie = handshake.headers.cookie || '';
  const match = cookie.match(/(?:^|;\s*)accessToken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

export const initRealtime = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true },
  });

  // Only signed-in users can connect; each joins a private room for their own updates.
  io.use((socket, next) => {
    try {
      const decoded = jwt.verify(tokenFromHandshake(socket.handshake), process.env.JWT_SECRET);
      socket.data.userId = decoded.userId;
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(userRoom(socket.data.userId));
  });

  return io;
};

// Send an event to all of a user's open tabs/devices, except the one that made the change.
export const emitToUser = (req, event, payload) => {
  if (!io) return;
  const sourceSocketId = req.get('X-Socket-Id');
  const target = io.to(userRoom(req.user.userId));
  (sourceSocketId ? target.except(sourceSocketId) : target).emit(event, payload);
};
