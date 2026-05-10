import { Injectable } from '@nestjs/common';
import { Card, CardSuit, CardValue, PyramidCard } from './types';

const SUITS: CardSuit[] = ['♠', '♥', '♦', '♣'];
const VALUES: CardValue[] = [
  'A',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
];

@Injectable()
export class DeckService {
  buildDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
      for (const value of VALUES) {
        deck.push({
          id: `${value}${suit}_${deck.length}`,
          value,
          suit,
        });
      }
    }
    return deck;
  }

  shuffle(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  deal(
    deck: Card[],
    playersCount: number,
    cardsPerPlayer: number,
  ): { hands: Card[][]; remainingDeck: Card[] } {
    const workingDeck = [...deck];
    const hands: Card[][] = Array.from({ length: playersCount }, () => []);

    for (let round = 0; round < cardsPerPlayer; round += 1) {
      for (let playerIndex = 0; playerIndex < playersCount; playerIndex += 1) {
        const nextCard = workingDeck.shift();
        if (!nextCard) {
          throw new Error('No hay suficientes cartas para repartir.');
        }
        hands[playerIndex].push(nextCard);
      }
    }

    return { hands, remainingDeck: workingDeck };
  }

  buildPyramid(
    deck: Card[],
    rows: number,
  ): { pyramid: PyramidCard[][]; remainingDeck: Card[] } {
    const workingDeck = [...deck];
    const pyramid: PyramidCard[][] = [];

    for (let row = 0; row < rows; row += 1) {
      const rowLength = rows - row;
      const cardsInRow: PyramidCard[] = [];

      for (let position = 0; position < rowLength; position += 1) {
        const nextCard = workingDeck.shift();
        if (!nextCard) {
          throw new Error('No hay suficientes cartas para construir la piramide.');
        }
        cardsInRow.push({
          card: nextCard,
          faceUp: false,
          row,
          position,
        });
      }

      pyramid.push(cardsInRow);
    }

    return { pyramid, remainingDeck: workingDeck };
  }
}
