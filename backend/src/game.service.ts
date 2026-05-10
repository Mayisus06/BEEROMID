import { BadRequestException, Injectable } from '@nestjs/common';
import { DeckService } from './deck.service';
import { RoomService } from './room.service';
import {
  BluffResult,
  CardValue,
  FlipResult,
  GameLogEntry,
  GameRoom,
  Player,
  RowRule,
} from './types';

@Injectable()
export class GameService {
  constructor(
    private readonly roomService: RoomService,
    private readonly deckService: DeckService,
  ) {}

  startGame(
    code: string,
  ): { room: GameRoom; hands: Array<{ playerId: string; hand: Player['hand'] }> } {
    const room = this.roomService.getRoom(code);
    if (room.players.length < 2) {
      throw new BadRequestException(
        'Se necesitan al menos 2 jugadores para iniciar.',
      );
    }

    room.players.forEach((player) => {
      player.hand = [];
      player.shotsReceived = 0;
    });

    let deck = this.deckService.shuffle(this.deckService.buildDeck());
    const { hands, remainingDeck } = this.deckService.deal(
      deck,
      room.players.length,
      room.config.cardsPerPlayer,
    );

    room.players.forEach((player, index) => {
      player.hand = hands[index];
    });

    const pyramidResult = this.deckService.buildPyramid(
      remainingDeck,
      room.config.pyramidRows,
    );
    deck = pyramidResult.remainingDeck;

    room.pyramid = pyramidResult.pyramid;
    room.deck = deck;
    room.currentFlipIndex = 0;
    room.status = 'IN_PROGRESS';
    room.pendingAction = null;
    room.log = [];
    this.pushLog(
      room,
      'SYSTEM',
      `Partida iniciada con ${room.players.length} jugadores.`,
    );

    return {
      room,
      hands: room.players.map((player) => ({
        playerId: player.id,
        hand: player.hand,
      })),
    };
  }

  flipNextCard(code: string): FlipResult {
    const room = this.roomService.getRoom(code);
    if (room.status !== 'IN_PROGRESS') {
      throw new BadRequestException('La partida no esta en curso.');
    }

    const totalCards = this.getTotalPyramidCards(room);
    if (room.currentFlipIndex >= totalCards) {
      room.status = 'FINISHED';
      throw new BadRequestException('La piramide ya se completo.');
    }

    const next = this.getCardByFlipIndex(room, room.currentFlipIndex);
    if (!next) {
      throw new BadRequestException('No se pudo encontrar la proxima carta.');
    }

    const { card, row, position } = next;
    card.faceUp = true;

    const rowRule = this.getRowRule(row, room.config.pyramidRows);
    const shots = room.config.initialShots + row * room.config.shotsIncrement;
    const matchingPlayerIds = room.players
      .filter((player) =>
        player.hand.some((handCard) => handCard.value === card.card.value),
      )
      .map((player) => player.id);

    const flipId = `flip_${Date.now()}_${room.currentFlipIndex}`;
    room.pendingAction = {
      flipId,
      cardValue: card.card.value,
      rule: rowRule,
      shots,
      matchingPlayerIds,
      resolved: true,
    };
    room.currentFlipIndex += 1;

    const isLastCard = room.currentFlipIndex >= totalCards;
    this.tryFinishGame(room);

    this.pushLog(
      room,
      'FLIP',
      `Se volteo ${card.card.value}${card.card.suit} (fila ${row + 1}).`,
      {
        row,
        position,
        rule: rowRule,
        shots,
        matchingPlayerIds,
      },
    );

    return {
      flipId,
      card: card.card,
      row,
      position,
      rowRule,
      shots,
      matchingPlayerIds,
      isLastCard,
    };
  }

  replaceLatestFlipCard(code: string): FlipResult {
    const room = this.roomService.getRoom(code);
    if (room.status !== 'IN_PROGRESS') {
      throw new BadRequestException('La partida no esta en curso.');
    }
    if (room.currentFlipIndex <= 0 || !room.pendingAction) {
      throw new BadRequestException('Aun no hay una carta para reemplazar.');
    }
    if (room.pendingAction.matchingPlayerIds.length > 0) {
      throw new BadRequestException('No puedes reemplazar: alguien si tiene esta carta.');
    }
    if (!room.deck.length) {
      throw new BadRequestException('No quedan cartas para reemplazar.');
    }

    const latest = this.getCardByFlipIndex(room, room.currentFlipIndex - 1);
    if (!latest || !latest.card.faceUp) {
      throw new BadRequestException('No se encontro la carta actual para reemplazar.');
    }

    const previousCard = latest.card.card;
    const nextCard = room.deck.pop();
    if (!nextCard) {
      throw new BadRequestException('No quedan cartas para reemplazar.');
    }

    latest.card.card = nextCard;

    const rowRule = this.getRowRule(latest.row, room.config.pyramidRows);
    const shots = room.config.initialShots + latest.row * room.config.shotsIncrement;
    const matchingPlayerIds = room.players
      .filter((player) =>
        player.hand.some((handCard) => handCard.value === nextCard.value),
      )
      .map((player) => player.id);

    const flipId = `replace_${Date.now()}_${latest.row}_${latest.position}`;
    room.pendingAction = {
      flipId,
      cardValue: nextCard.value,
      rule: rowRule,
      shots,
      matchingPlayerIds,
      resolved: true,
    };

    this.pushLog(
      room,
      'FLIP',
      `Carta reemplazada ${previousCard.value}${previousCard.suit} -> ${nextCard.value}${nextCard.suit}.`,
      {
        row: latest.row,
        position: latest.position,
        rule: rowRule,
        shots,
        matchingPlayerIds,
        replaced: true,
      },
    );

    return {
      flipId,
      card: nextCard,
      row: latest.row,
      position: latest.position,
      rowRule,
      shots,
      matchingPlayerIds,
      isLastCard: room.currentFlipIndex >= this.getTotalPyramidCards(room),
    };
  }

  getRowRule(rowIndex: number, totalRows: number): RowRule {
    if (rowIndex === totalRows - 1) {
      return 'TOMA_SECO+REGALA_SECO';
    }
    return rowIndex % 2 === 0 ? 'TOMA' : 'REGALA';
  }

  assignDrink(
    code: string,
    fromPlayerId: string,
    toPlayerId: string,
    shots?: number,
    claimedValue?: CardValue,
  ): { fromPlayerId: string; toPlayerId: string; shots: number } {
    const room = this.roomService.getRoom(code);
    const fromPlayer = this.findPlayer(room, fromPlayerId);
    const toPlayer = this.findPlayer(room, toPlayerId);
    if (!room.pendingAction) {
      throw new BadRequestException('No hay una accion pendiente para asignar.');
    }
    if (!room.pendingAction.rule.includes('REGALA')) {
      throw new BadRequestException('La regla actual no permite regalar tragos.');
    }
    if (!room.pendingAction.matchingPlayerIds.includes(fromPlayerId)) {
      throw new BadRequestException(
        'Solo quien matchea la carta puede regalar en esta ronda.',
      );
    }

    const pendingShots = shots ?? room.pendingAction.shots;
    if (pendingShots <= 0) {
      throw new BadRequestException('La cantidad de tragos debe ser mayor a 0.');
    }

    toPlayer.shotsReceived += pendingShots;
    room.pendingAction.resolved = true;
    this.tryFinishGame(room);
    this.pushLog(
      room,
      'DRINK_ASSIGNED',
      `${fromPlayer.name} le regalo ${pendingShots} trago(s) a ${toPlayer.name}.`,
      {
        fromPlayerId,
        toPlayerId,
        shots: pendingShots,
        claimedValue: claimedValue ?? room.pendingAction.cardValue,
      },
    );

    return {
      fromPlayerId,
      toPlayerId,
      shots: pendingShots,
    };
  }

  confirmDrink(
    code: string,
    playerId: string,
    shots?: number,
  ): { playerId: string; shots: number } {
    const room = this.roomService.getRoom(code);
    const player = this.findPlayer(room, playerId);
    if (!room.pendingAction) {
      throw new BadRequestException('No hay una accion pendiente para confirmar.');
    }
    if (!room.pendingAction.rule.includes('TOMA')) {
      throw new BadRequestException('La regla actual no requiere tomar.');
    }
    if (!room.pendingAction.matchingPlayerIds.includes(playerId)) {
      throw new BadRequestException('Solo quien matchea la carta puede tomar.');
    }
    const pendingShots = shots ?? room.pendingAction?.shots ?? room.config.initialShots;
    if (pendingShots <= 0) {
      throw new BadRequestException('La cantidad de tragos debe ser mayor a 0.');
    }

    player.shotsReceived += pendingShots;
    if (room.pendingAction) {
      room.pendingAction.resolved = true;
    }
    this.tryFinishGame(room);
    this.pushLog(
      room,
      'DRINK_CONFIRMED',
      `${player.name} confirmo ${pendingShots} trago(s).`,
      {
        playerId,
        shots: pendingShots,
      },
    );

    return { playerId, shots: pendingShots };
  }

  callBluff(
    code: string,
    accuserId: string,
    targetPlayerId: string,
    claimedValue: CardValue,
  ): BluffResult {
    const room = this.roomService.getRoom(code);
    const accuser = this.findPlayer(room, accuserId);
    const target = this.findPlayer(room, targetPlayerId);
    if (!room.pendingAction) {
      throw new BadRequestException('No hay una accion pendiente para desafiar.');
    }

    const hasClaimedCard = target.hand.some((card) => card.value === claimedValue);
    const baseShots = room.pendingAction?.shots ?? room.config.initialShots;
    const penaltyShots = baseShots * 2;
    const truthful = hasClaimedCard;

    const penalizedPlayer = truthful ? accuser : target;
    penalizedPlayer.shotsReceived += penaltyShots;

    const reason = truthful
      ? `${accuser.name} acuso mal y toma doble.`
      : `${target.name} mintio y toma doble.`;

    const result: BluffResult = {
      accuserId: accuser.id,
      targetPlayerId: target.id,
      claimedValue,
      truthful,
      penaltyShots,
      penalizedPlayerId: penalizedPlayer.id,
      reason,
    };

    this.pushLog(room, 'BLUFF_RESOLVED', reason, { ...result });
    if (room.pendingAction) {
      room.pendingAction.resolved = true;
    }
    this.tryFinishGame(room);
    return result;
  }

  getStats(code: string): {
    ranking: Array<{ id: string; name: string; emoji: string; shotsReceived: number }>;
    leastDrunkPlayerId: string | null;
  } {
    const room = this.roomService.getRoom(code);
    const ranking = [...room.players]
      .sort((a, b) => a.shotsReceived - b.shotsReceived)
      .map((player) => ({
        id: player.id,
        name: player.name,
        emoji: player.emoji,
        shotsReceived: player.shotsReceived,
      }));

    return {
      ranking,
      leastDrunkPlayerId: ranking[0]?.id ?? null,
    };
  }

  private getTotalPyramidCards(room: GameRoom): number {
    return room.pyramid.reduce((acc, row) => acc + row.length, 0);
  }

  private getCardByFlipIndex(
    room: GameRoom,
    flipIndex: number,
  ): { card: GameRoom['pyramid'][number][number]; row: number; position: number } | null {
    let index = 0;
    for (let row = 0; row < room.pyramid.length; row += 1) {
      for (let position = 0; position < room.pyramid[row].length; position += 1) {
        if (index === flipIndex) {
          return {
            card: room.pyramid[row][position],
            row,
            position,
          };
        }
        index += 1;
      }
    }
    return null;
  }

  private findPlayer(room: GameRoom, playerId: string): Player {
    const player = room.players.find((item) => item.id === playerId);
    if (!player) {
      throw new BadRequestException(`No existe el jugador ${playerId}`);
    }
    return player;
  }

  private pushLog(
    room: GameRoom,
    type: GameLogEntry['type'],
    message: string,
    payload?: Record<string, unknown>,
  ): void {
    room.log.push({
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      message,
      timestamp: Date.now(),
      payload,
    });
  }

  private tryFinishGame(room: GameRoom): void {
    const totalCards = this.getTotalPyramidCards(room);
    const revealedCards = room.currentFlipIndex;
    const pendingResolved = room.pendingAction ? room.pendingAction.resolved : true;
    if (revealedCards >= totalCards && pendingResolved) {
      room.status = 'FINISHED';
    }
  }
}
