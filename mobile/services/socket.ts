import { io, Socket } from 'socket.io-client';
import { BluffPayload, Card, CardValue, FlipPayload, RoomPublic } from '../types/game';
import { BACKEND_URL } from './backendUrl';

export type ServerToClientEvents = {
  'socket:ready': (payload: { socketId: string }) => void;
  'room:joined': (payload: { roomCode: string; playerId: string }) => void;
  'room:updated': (payload: { room: RoomPublic }) => void;
  'game:started': (payload: { room: RoomPublic }) => void;
  'player:hand': (payload: { roomCode: string; playerId: string; hand: Card[] }) => void;
  'pyramid:flipped': (payload: FlipPayload) => void;
  'drink:assigned': (payload: {
    type?: 'confirm';
    fromPlayerId?: string;
    toPlayerId?: string;
    playerId?: string;
    shots: number;
    room: RoomPublic;
  }) => void;
  'bluff:resolved': (payload: BluffPayload) => void;
  'error:message': (payload: { message: string }) => void;
};

export type ClientToServerEvents = {
  'room:join': (payload: {
    code: string;
    playerId?: string;
    name?: string;
    emoji?: string;
  }) => void;
  'game:start': (payload: { code: string; playerId: string }) => void;
  'pyramid:flip': (payload: { code: string; playerId: string }) => void;
  'pyramid:replace': (payload: { code: string; playerId: string }) => void;
  'drink:assign': (payload: {
    code: string;
    fromPlayerId: string;
    toPlayerId: string;
    shots?: number;
    claimedValue?: CardValue;
  }) => void;
  'drink:confirm': (payload: { code: string; playerId: string; shots?: number }) => void;
  'bluff:call': (payload: {
    code: string;
    accuserId: string;
    targetPlayerId: string;
    claimedValue: CardValue;
  }) => void;
};

export type PiramideSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socketInstance: PiramideSocket | null = null;

function buildSocket(): PiramideSocket {
  return io(BACKEND_URL, {
    transports: ['websocket'],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 700,
  }) as PiramideSocket;
}

export function getSocket(): PiramideSocket {
  if (!socketInstance) {
    socketInstance = buildSocket();
  }
  return socketInstance;
}

export function connectSocket(): PiramideSocket {
  const socket = getSocket();
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socketInstance?.connected) {
    socketInstance.disconnect();
  }
}
