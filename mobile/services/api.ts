import axios from 'axios';
import { GameConfig, RoomPublic } from '../types/game';
import { BACKEND_URL } from './backendUrl';

const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 12_000,
});

export type CreateRoomInput = {
  name: string;
  emoji: string;
  config: GameConfig;
};

export type JoinRoomInput = {
  code: string;
  name: string;
  emoji: string;
};

type RoomResponse = {
  room: RoomPublic;
  player: {
    id: string;
    socketId: string;
    name: string;
    emoji: string;
  };
};

export async function createRoom(input: CreateRoomInput): Promise<RoomResponse> {
  const { data } = await api.post<RoomResponse>('/rooms', input);
  return data;
}

export async function joinRoom(input: JoinRoomInput): Promise<RoomResponse> {
  const { data } = await api.post<RoomResponse>(`/rooms/${input.code}/join`, {
    name: input.name,
    emoji: input.emoji,
  });
  return data;
}

export async function getRoom(code: string): Promise<{ room: RoomPublic }> {
  const { data } = await api.get<{ room: RoomPublic }>(`/rooms/${code}`);
  return data;
}

export default api;
