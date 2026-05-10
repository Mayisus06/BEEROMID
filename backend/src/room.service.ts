import { Injectable, NotFoundException } from '@nestjs/common';
import { GameConfig, GameRoom, Player } from './types';

const DEFAULT_CONFIG: GameConfig = {
  cardsPerPlayer: 4,
  pyramidRows: 5,
  initialShots: 1,
  shotsIncrement: 1,
};

@Injectable()
export class RoomService {
  private readonly rooms = new Map<string, GameRoom>();

  createRoom(
    hostName: string,
    hostEmoji: string,
    socketId: string,
    config?: Partial<GameConfig>,
  ): { room: GameRoom; player: Player } {
    const roomCode = this.generateCode();
    const normalizedConfig = this.normalizeConfig(config);
    const hostPlayer: Player = {
      id: this.generatePlayerId(),
      socketId,
      name: hostName.trim() || 'Host',
      emoji: hostEmoji?.trim() || '🥃',
      hand: [],
      shotsReceived: 0,
      connected: true,
    };

    const room: GameRoom = {
      code: roomCode,
      hostId: hostPlayer.id,
      players: [hostPlayer],
      config: normalizedConfig,
      status: 'LOBBY',
      pyramid: [],
      currentFlipIndex: 0,
      deck: [],
      log: [],
      pendingAction: null,
    };

    this.rooms.set(roomCode, room);
    return { room, player: hostPlayer };
  }

  joinRoom(
    code: string,
    name: string,
    emoji: string,
    socketId: string,
  ): { room: GameRoom; player: Player } {
    const room = this.getRoom(code);
    const normalizedName = (name || '').trim();
    const desiredName = normalizedName || `Jugador ${room.players.length + 1}`;

    const reconnectable = room.players.find(
      (player) =>
        !player.connected &&
        player.name.toLowerCase() === desiredName.toLowerCase(),
    );

    if (reconnectable) {
      reconnectable.connected = true;
      reconnectable.socketId = socketId;
      reconnectable.emoji = emoji?.trim() || reconnectable.emoji || '🥃';
      return { room, player: reconnectable };
    }

    const newPlayer: Player = {
      id: this.generatePlayerId(),
      socketId,
      name: desiredName,
      emoji: emoji?.trim() || '🍻',
      hand: [],
      shotsReceived: 0,
      connected: true,
    };

    room.players.push(newPlayer);
    return { room, player: newPlayer };
  }

  getRoom(code: string): GameRoom {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) {
      throw new NotFoundException(`No existe la sala ${code.toUpperCase()}`);
    }
    return room;
  }

  getRoomIfExists(code: string): GameRoom | null {
    return this.rooms.get(code.toUpperCase()) ?? null;
  }

  attachSocketToPlayer(code: string, playerId: string, socketId: string): Player {
    const room = this.getRoom(code);
    const player = room.players.find((item) => item.id === playerId);
    if (!player) {
      throw new NotFoundException(`No existe el jugador ${playerId}`);
    }
    player.socketId = socketId;
    player.connected = true;
    return player;
  }

  setPlayerDisconnected(socketId: string): GameRoom | null {
    for (const room of this.rooms.values()) {
      const player = room.players.find((item) => item.socketId === socketId);
      if (player) {
        player.connected = false;
        return room;
      }
    }
    return null;
  }

  generateCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let generated = '';
    do {
      generated = Array.from({ length: 4 })
        .map(() => alphabet[Math.floor(Math.random() * alphabet.length)])
        .join('');
    } while (this.rooms.has(generated));
    return generated;
  }

  private generatePlayerId(): string {
    return `p_${Math.random().toString(36).slice(2, 10)}`;
  }

  private normalizeConfig(config?: Partial<GameConfig>): GameConfig {
    const cardsPerPlayer = this.clampNumber(
      config?.cardsPerPlayer ?? DEFAULT_CONFIG.cardsPerPlayer,
      2,
      6,
    );
    const pyramidRows = this.clampNumber(
      config?.pyramidRows ?? DEFAULT_CONFIG.pyramidRows,
      3,
      6,
    );
    const initialShots = this.clampNumber(
      config?.initialShots ?? DEFAULT_CONFIG.initialShots,
      1,
      3,
    );
    const shotsIncrement = config?.shotsIncrement === 2 ? 2 : 1;

    return {
      cardsPerPlayer,
      pyramidRows,
      initialShots,
      shotsIncrement,
    };
  }

  private clampNumber(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
  }
}
