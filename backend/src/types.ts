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
  socketId: string;
  name: string;
  emoji: string;
  hand: Card[];
  shotsReceived: number;
  connected: boolean;
}

export interface PyramidCard {
  card: Card;
  faceUp: boolean;
  row: number;
  position: number;
}

export interface GameConfig {
  cardsPerPlayer: number;
  pyramidRows: number;
  initialShots: number;
  shotsIncrement: 1 | 2;
}

export type GameStatus = 'LOBBY' | 'IN_PROGRESS' | 'FINISHED';

export type RowRule =
  | 'TOMA'
  | 'REGALA'
  | 'TOMA_SECO+REGALA_SECO';

export interface PendingDrinkAction {
  flipId: string;
  cardValue: CardValue;
  rule: RowRule;
  shots: number;
  matchingPlayerIds: string[];
  resolved: boolean;
}

export interface GameLogEntry {
  id: string;
  type:
    | 'SYSTEM'
    | 'FLIP'
    | 'DRINK_ASSIGNED'
    | 'DRINK_CONFIRMED'
    | 'BLUFF_RESOLVED';
  message: string;
  timestamp: number;
  payload?: Record<string, unknown>;
}

export interface GameRoom {
  code: string;
  hostId: string;
  players: Player[];
  config: GameConfig;
  status: GameStatus;
  pyramid: PyramidCard[][];
  currentFlipIndex: number;
  deck: Card[];
  log: GameLogEntry[];
  pendingAction: PendingDrinkAction | null;
}

export interface FlipResult {
  flipId: string;
  card: Card;
  row: number;
  position: number;
  rowRule: RowRule;
  shots: number;
  matchingPlayerIds: string[];
  isLastCard: boolean;
}

export interface BluffResult {
  accuserId: string;
  targetPlayerId: string;
  claimedValue: CardValue;
  truthful: boolean;
  penaltyShots: number;
  penalizedPlayerId: string;
  reason: string;
}
