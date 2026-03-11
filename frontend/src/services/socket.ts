import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

const getSocketUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:5001';
  const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
  if (port === '5000' || port === '80' || port === '443') {
    return window.location.origin;
  }
  return `${window.location.protocol}//${window.location.hostname}:5001`;
};

export const initializeSocket = (): Socket => {
  if (!socket) {
    socket = io(getSocketUrl(), {
      transports: ['websocket'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      if (import.meta.env.DEV) console.log('Socket connected:', socket?.id);
    });

    socket.on('disconnect', () => {
      if (import.meta.env.DEV) console.log('Socket disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const joinLRIDS = () => {
  if (socket) {
    socket.emit('join-lrids');
  }
};

export const joinReception = () => {
  if (socket) {
    socket.emit('join-reception');
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};