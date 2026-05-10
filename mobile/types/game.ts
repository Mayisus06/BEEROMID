export type CardSuit = '♠' | '♥' | '♦' | '♣';

export type CardValue =
  | 'A'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K';

export interface Card {
  id: string;
  value: CardValue;
  suit: CardSuit;
}

export interface Player {
  id: string;
  name: string;
  emoji: string;
  shotsReceived: number;
  connected: boolean;
  handCount: number;
}

export interface PyramidCardPublic {
  row: number;
  position: number;
  faceUp: boolean;
  card: Card | null;
}

export type RowRule = 'TOMA' | 'REGALA' | 'TOMA_SECO+REGALA_SECO';

export interface GameConfig {
  cardsPerPlayer: number;
  pyramidRows: number;
  initialShots: number;
  shotsIncrement: 1 | 2;
}

export interface PendingAction {
  flipId: string;
  cardValue: CardValue;
  rule: RowRule;
  shots: number;
  matchingPlayerIds: string[];
  resolved: boolean;
}

export interface RoomPublic {
  code: string;
  hostId: string;
  config: GameConfig;
  status: 'LOBBY' | 'IN_PROGRESS' | 'FINISHED';
  currentFlipIndex: number;
  players: Player[];
  pyramid: PyramidCardPublic[][];
  log: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: number;
  }>;
  pendingAction: PendingAction | null;
}

export interface FlipPayload {
  flipId: string;
  card: Card;
  row: number;
  position: number;
  rowRule: RowRule;
  shots: number;
  matchingPlayerIds: string[];
  isLastCard: boolean;
  room: RoomPublic;
}

export interface BluffPayload {
  accuserId: string;
  targetPlayerId: string;
  claimedValue: CardValue;
  truthful: boolean;
  penaltyShots: number;
  penalizedPlayerId: string;
  reason: string;
  room: RoomPublic;
}
