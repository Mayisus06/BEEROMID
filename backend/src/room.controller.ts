import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RoomService } from './room.service';
import { GameConfig, GameRoom } from './types';

type CreateRoomBody = {
  name: string;
  emoji?: string;
  socketId?: string;
  config?: Partial<GameConfig>;
};

type JoinRoomBody = {
  name: string;
  emoji?: string;
  socketId?: string;
};

@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  createRoom(@Body() body: CreateRoomBody): Record<string, unknown> {
    const response = this.roomService.createRoom(
      body.name || 'Host',
      body.emoji || '🥃',
      body.socketId || this.buildHttpSocketId(),
      body.config,
    );

    return {
      room: this.toPublicRoom(response.room),
      player: response.player,
    };
  }

  @Get(':code')
  getRoom(@Param('code') code: string): Record<string, unknown> {
    const room = this.roomService.getRoom(code.toUpperCase());
    return { room: this.toPublicRoom(room) };
  }

  @Post(':code/join')
  joinRoom(
    @Param('code') code: string,
    @Body() body: JoinRoomBody,
  ): Record<string, unknown> {
    const response = this.roomService.joinRoom(
      code.toUpperCase(),
      body.name || '',
      body.emoji || '🍻',
      body.socketId || this.buildHttpSocketId(),
    );

    return {
      room: this.toPublicRoom(response.room),
      player: response.player,
    };
  }

  private buildHttpSocketId(): string {
    return `http_${Math.random().toString(36).slice(2, 11)}`;
  }

  private toPublicRoom(room: GameRoom): Record<string, unknown> {
    return {
      code: room.code,
      hostId: room.hostId,
      config: room.config,
      status: room.status,
      currentFlipIndex: room.currentFlipIndex,
      players: room.players.map((player) => ({
        id: player.id,
        name: player.name,
        emoji: player.emoji,
        connected: player.connected,
        shotsReceived: player.shotsReceived,
        handCount: player.hand.length,
      })),
      pyramid: room.pyramid.map((row) =>
        row.map((card) => ({
          row: card.row,
          position: card.position,
          faceUp: card.faceUp,
          card: card.faceUp ? card.card : null,
        })),
      ),
      log: room.log,
      pendingAction: room.pendingAction,
    };
  }
}
