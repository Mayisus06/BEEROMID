import { create } from 'zustand';
import { Card, FlipPayload, Player, RoomPublic, RowRule } from '../types/game';

type StatsItem = {
  id: string;
  name: string;
  emoji: string;
  shotsReceived: number;
};

interface GameState {
  roomCode: string;
  hostId: string;
  myPlayer: {
    id: string;
    name: string;
    emoji: string;
  } | null;
  players: Player[];
  isHost: boolean;
  myHand: Card[];
  pyramid: RoomPublic['pyramid'];
  currentCard: Card | null;
  currentRule: RowRule | null;
  currentShots: number;
  gameLog: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: number;
  }>;
  stats: StatsItem[];
  roomStatus: RoomPublic['status'] | 'IDLE';
  pendingAction: RoomPublic['pendingAction'];
  hydrateRoom: (room: RoomPublic) => void;
  setMyPlayer: (player: { id: string; name: string; emoji: string }) => void;
  setMyHand: (hand: Card[]) => void;
  applyFlip: (payload: FlipPayload) => void;
  appendGameLog: (entry: {
    id: string;
    type: string;
    message: string;
    timestamp: number;
  }) => void;
  setStats: (items: StatsItem[]) => void;
  resetRoom: () => void;
}

const initialState = {
  roomCode: '',
  hostId: '',
  myPlayer: null,
  players: [],
  isHost: false,
  myHand: [],
  pyramid: [],
  currentCard: null,
  currentRule: null,
  currentShots: 0,
  gameLog: [],
  stats: [],
  roomStatus: 'IDLE' as const,
  pendingAction: null,
};

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,
  hydrateRoom: (room) => {
    const me = get().myPlayer;
    set({
      roomCode: room.code,
      hostId: room.hostId,
      players: room.players,
      pyramid: room.pyramid,
      gameLog: room.log,
      roomStatus: room.status,
      pendingAction: room.pendingAction,
      isHost: me ? room.hostId === me.id : false,
    });
  },
  setMyPlayer: (player) => {
    set((state) => ({
      myPlayer: player,
      isHost: state.hostId === player.id,
    }));
  },
  setMyHand: (hand) => set({ myHand: hand }),
  applyFlip: (payload) => {
    set({
      currentCard: payload.card,
      currentRule: payload.rowRule,
      currentShots: payload.shots,
      pyramid: payload.room.pyramid,
      players: payload.room.players,
      roomStatus: payload.room.status,
      pendingAction: payload.room.pendingAction,
      gameLog: payload.room.log,
    });
  },
  appendGameLog: (entry) => {
    set((state) => ({
      gameLog: [...state.gameLog, entry],
    }));
  },
  setStats: (items) => set({ stats: items }),
  resetRoom: () => set(initialState),
}));
