import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { theme } from '../constants/theme';
import { PyramidCardPublic } from '../types/game';
import PlayingCard from './PlayingCard';

interface PyramidBoardProps {
  pyramid: PyramidCardPublic[][];
}

const BASE_CARD_WIDTH = 58;
const BASE_ROW_GAP = 8;
const BOARD_HORIZONTAL_PADDING = 24;

function PyramidCell({
  card,
  boardScale,
}: {
  card: PyramidCardPublic;
  boardScale: number;
}): React.ReactElement {
  const scale = useSharedValue(card.faceUp ? 1 : 0.92);

  useEffect(() => {
    scale.value = withSpring(card.faceUp ? 1 : 0.92, {
      damping: 9,
      stiffness: 120,
    });
  }, [card.faceUp, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * boardScale }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <PlayingCard card={card.faceUp ? card.card : null} faceUp={card.faceUp} size="md" />
    </Animated.View>
  );
}

export default function PyramidBoard({ pyramid }: PyramidBoardProps): React.ReactElement {
  const { width } = useWindowDimensions();

  if (!pyramid.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Esperando inicio de partida...</Text>
      </View>
    );
  }

  const maxCardsInRow = useMemo(
    () => pyramid.reduce((max, row) => Math.max(max, row.length), 0),
    [pyramid],
  );
  const availableWidth = Math.max(280, width - BOARD_HORIZONTAL_PADDING);
  const neededWidth =
    maxCardsInRow * BASE_CARD_WIDTH + Math.max(0, maxCardsInRow - 1) * BASE_ROW_GAP;
  const boardScale = neededWidth > 0 ? Math.min(1, availableWidth / neededWidth) : 1;
  const rowGap = Math.max(6, Math.round(BASE_ROW_GAP * boardScale));
  const verticalGap = Math.max(6, Math.round(8 * boardScale));

  return (
    <View style={[styles.container, { gap: verticalGap }]}>
      {pyramid.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={[styles.row, { gap: rowGap }]}>
          {row.map((card) => (
            <View key={`${card.row}-${card.position}`} style={styles.cardWrap}>
              <PyramidCell card={card} boardScale={boardScale} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  cardWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.35)',
    borderRadius: theme.radius.md,
    backgroundColor: 'rgba(26,26,46,0.35)',
  },
  emptyText: {
    color: theme.colors.muted,
    fontSize: 16,
  },
});
