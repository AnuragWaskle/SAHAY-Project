import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';

export function initSocketIO(io: SocketIOServer): void {
  io.on('connection', (socket: Socket) => {
    logger.debug(`Socket connected: ${socket.id}`);

    // Join city room for city-wide updates
    socket.on('join:city', (cityId: string) => {
      socket.join(`city:${cityId}`);
      logger.debug(`Socket ${socket.id} joined city:${cityId}`);
    });

    // Join demand room for real-time demand updates
    socket.on('join:demand', (demandId: string) => {
      socket.join(`demand:${demandId}`);
    });

    // Join incident room
    socket.on('join:incident', (incidentId: string) => {
      socket.join(`incident:${incidentId}`);
    });

    // Join user notification room
    socket.on('join:user', (userId: string) => {
      socket.join(`user:${userId}`);
    });

    socket.on('leave:demand', (demandId: string) => {
      socket.leave(`demand:${demandId}`);
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  logger.info('Socket.IO initialized with rooms: city, demand, incident, user');
}

// Helper to emit events from routes
export const emitToCity = (io: SocketIOServer, cityId: string, event: string, data: unknown) => {
  io.to(`city:${cityId}`).emit(event, data);
};

export const emitToUser = (io: SocketIOServer, userId: string, event: string, data: unknown) => {
  io.to(`user:${userId}`).emit(event, data);
};
