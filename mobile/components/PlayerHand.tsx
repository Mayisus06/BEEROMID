import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { theme } from '../constants/theme';
import { Card, CardValue } from '../types/game';
import PlayingCard from './PlayingCard';

interface PlayerHandProps {
  hand: Card[];
  matchValue: CardValue | null;
}

function FannedCard({
  card,
  index,
  total,
  isMatch,
}: {
  card: Card;
  index: number;
  total: number;
  isMatch: boolean;
}): React.ReactElement {
  const shake = useSharedValue(0);

  useEffect(() => {
    if (isMatch) {
      shake.value = withSequence(
        withTiming(-8, { duration: 80 }),
        withTiming(8, { duration: 80 }),
        withTiming(-6, { duration: 80 }),
        withTiming(0, { duration: 80 }),
      );
    }
  }, [isMatch, shake]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shake.value },
      { rotate: `${(index - (total - 1) / 2) * 4}deg` },
      { translateY: Math.abs(index - (total - 1) / 2) * 3 },
    ],
    marginLeft: index === 0 ? 0 : -14,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <PlayingCard card={card} faceUp size="hand" glow={isMatch} />
    </Animated.View>
  );
}

export default function PlayerHand({
  hand,
  matchValue,
}: PlayerHandProps): React.ReactElement {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tu mano</Text>
      {hand.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsRow}
        >
          {hand.map((card, index) => (
            <FannedCard
              key={card.id}
              card={card}
              index={index}
              total={hand.length}
              isMatch={matchValue === card.value}
            />
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.empty}>Todavia no recibiste cartas.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(26,26,46,0.7)',
    borderColor: 'rgba(201,168,76,0.35)',
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  title: {
    color: theme.colors.text,
    marginBottom: 10,
    fontWeight: '700',
    fontSize: 16,
  },
  cardsRow: {
    paddingVertical: 6,
    paddingRight: 12,
  },
  empty: {
    color: theme.colors.muted,
    fontSize: 14,
  },
});
