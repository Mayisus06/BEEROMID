import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { BadRequestException } from '@nestjs/common';
import { GameService } from './game.service';
import { RoomService } from './room.service';
import { CardValue, GameRoom } from './types';

type JoinPayload = {
  code: string;
  playerId?: string;
  name?: string;
  emoji?: string;
};

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly roomService: RoomService,
    private readonly gameService: GameService,
  ) {}

  handleConnection(client: Socket): void {
    client.emit('socket:ready', { socketId: client.id });
  }

  handleDisconnect(client: Socket): void {
    const room = this.roomService.setPlayerDisconnected(client.id);
    if (room) {
      this.server.to(room.code).emit('room:updated', {
        room: this.toPublicRoom(room),
      });
    }
  }

  @SubscribeMessage('room:join')
  handleRoomJoin(@ConnectedSocket() client: Socket, @MessageBody() payload: JoinPayload): void {
    try {
      const code = this.normalizeCode(payload.code);

      const room = this.roomService.getRoom(code);
      const player =
        payload.playerId && room.players.some((item) => item.id === payload.playerId)
          ? this.roomService.attachSocketToPlayer(code, payload.playerId, client.id)
          : this.roomService.joinRoom(
              code,
              payload.name || '',
              payload.emoji || '🍻',
              client.id,
            ).player;

      client.join(code);
      client.emit('room:joined', {
        roomCode: code,
        playerId: player.id,
      });
      this.server.to(code).emit('room:updated', { room: this.toPublicRoom(room) });
    } catch (error) {
      this.emitError(client, error);
    }
  }

  @SubscribeMessage('game:start')
  handleGameStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { code: string; playerId: string },
  ): void {
    try {
      const code = this.normalizeCode(payload.code);
      const room = this.roomService.getRoom(code);
      if (room.hostId !== payload.playerId) {
        throw new BadRequestException('Solo el host puede iniciar la partida.');
      }

      this.gameService.startGame(code);

      this.server.to(code).emit('game:started', {
        room: this.toPublicRoom(room),
      });
      this.server.to(code).emit('room:updated', {
        room: this.toPublicRoom(room),
      });

      room.players.forEach((player) => {
        this.server.to(player.socketId).emit('player:hand', {
          roomCode: room.code,
          playerId: player.id,
          hand: player.hand,
        });
      });
    } catch (error) {
      this.emitError(client, error);
    }
  }

  @SubscribeMessage('pyramid:flip')
  handlePyramidFlip(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { code: string; playerId: string },
  ): void {
    try {
      const code = this.normalizeCode(payload.code);
      const room = this.roomService.getRoom(code);
      this.ensureHost(room, payload.playerId);
      const result = this.gameService.flipNextCard(code);

      this.server.to(code).emit('pyramid:flipped', {
        ...result,
        room: this.toPublicRoom(room),
      });
      this.server.to(code).emit('room:updated', {
        room: this.toPublicRoom(room),
      });
    } catch (error) {
      this.emitError(client, error);
    }
  }

  @SubscribeMessage('pyramid:replace')
  handlePyramidReplace(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { code: string; playerId: string },
  ): void {
    try {
      const code = this.normalizeCode(payload.code);
      const room = this.roomService.getRoom(code);
      this.ensureHost(room, payload.playerId);
      const result = this.gameService.replaceLatestFlipCard(code);

      this.server.to(code).emit('pyramid:flipped', {
        ...result,
        room: this.toPublicRoom(room),
      });
      this.server.to(code).emit('room:updated', {
        room: this.toPublicRoom(room),
      });
    } catch (error) {
      this.emitError(client, error);
    }
  }

  @SubscribeMessage('drink:assign')
  handleDrinkAssign(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      code: string;
      fromPlayerId: string;
      toPlayerId: string;
      shots?: number;
      claimedValue?: CardValue;
    },
  ): void {
    try {
      const code = this.normalizeCode(payload.code);
      const assignment = this.gameService.assignDrink(
        code,
        payload.fromPlayerId,
        payload.toPlayerId,
        payload.shots,
        payload.claimedValue,
      );
      const room = this.roomService.getRoom(code);

      this.server.to(code).emit('drink:assigned', {
        ...assignment,
        room: this.toPublicRoom(room),
      });
      this.server.to(code).emit('room:updated', {
        room: this.toPublicRoom(room),
      });
    } catch (error) {
      this.emitError(client, error);
    }
  }

  @SubscribeMessage('drink:confirm')
  handleDrinkConfirm(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { code: string; playerId: string; shots?: number },
  ): void {
    try {
      const code = this.normalizeCode(payload.code);
      const confirmation = this.gameService.confirmDrink(
        code,
        payload.playerId,
        payload.shots,
      );
      const room = this.roomService.getRoom(code);

      this.server.to(code).emit('drink:assigned', {
        type: 'confirm',
        ...confirmation,
        room: this.toPublicRoom(room),
      });
      this.server.to(code).emit('room:updated', {
        room: this.toPublicRoom(room),
      });
    } catch (error) {
      this.emitError(client, error);
    }
  }

  @SubscribeMessage('bluff:call')
  handleBluffCall(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      code: string;
      accuserId: string;
      targetPlayerId: string;
      claimedValue: CardValue;
    },
  ): void {
    try {
      const code = this.normalizeCode(payload.code);
      const result = this.gameService.callBluff(
        code,
        payload.accuserId,
        payload.targetPlayerId,
        payload.claimedValue,
      );
      const room = this.roomService.getRoom(code);

      this.server.to(code).emit('bluff:resolved', {
        ...result,
        room: this.toPublicRoom(room),
      });
      this.server.to(code).emit('room:updated', {
        room: this.toPublicRoom(room),
      });
    } catch (error) {
      this.emitError(client, error);
    }
  }

  private emitError(client: Socket, error: unknown): void {
    const message =
      error instanceof Error ? error.message : 'Ocurrio un error inesperado.';
    client.emit('error:message', { message });
  }

  private normalizeCode(value: string | undefined): string {
    const code = value?.trim().toUpperCase();
    if (!code) {
      throw new BadRequestException('Debes indicar un codigo de sala.');
    }
    return code;
  }

  private ensureHost(room: GameRoom, playerId: string | undefined): void {
    if (!playerId) {
      throw new BadRequestException('Debes indicar el jugador que realiza la accion.');
    }
    if (room.hostId !== playerId) {
      throw new BadRequestException('Solo el host puede realizar esta accion.');
    }
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
        shotsReceived: player.shotsReceived,
        connected: player.connected,
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
