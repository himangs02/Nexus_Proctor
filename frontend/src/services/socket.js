import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5001';

let socket = null;

export const connectSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
  }
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) { socket.disconnect(); socket = null; }
};