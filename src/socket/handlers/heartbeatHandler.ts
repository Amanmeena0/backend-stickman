import { Socket } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents, SocketData } from '../../types/socket';
import { pingSchema } from '../validators';

export function registerHeartbeatHandlers(
  socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>
): void {
  socket.on('ping', (rawPayload) => {
    try {
      const payload = pingSchema.parse(rawPayload);
      const serverTimestamp = Date.now();
      const latency = Math.max(0, serverTimestamp - payload.clientTimestamp);

      socket.emit('pong', {
        clientTimestamp: payload.clientTimestamp,
        serverTimestamp,
        latency,
      });
    } catch {
      // Ignore invalid ping format
    }
  });
}
