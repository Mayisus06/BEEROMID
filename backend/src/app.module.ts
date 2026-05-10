import { Module } from '@nestjs/common';
import { DeckService } from './deck.service';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';

@Module({
  controllers: [RoomController],
  providers: [RoomService, DeckService, GameService, GameGateway],
})
export class AppModule {}
