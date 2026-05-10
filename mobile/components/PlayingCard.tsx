import React, { useEffect } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { theme } from '../constants/theme';
import { Card } from '../types/game';

type CardSize = 'sm' | 'md' | 'lg' | 'hand';

const dimensions: Record<CardSize, { width: number; height: number; fontSize: number }> = {
  sm: { width: 46, height: 66, fontSize: 15 },
  md: { width: 58, height: 82, fontSize: 18 },
  lg: { width: 72, height: 102, fontSize: 22 },
  hand: { width: 62, height: 92, fontSize: 20 },
};

interface PlayingCardProps {
  card: Card | null;
  faceUp: boolean;
  size?: CardSize;
  glow?: boolean;
  style?: StyleProp<ViewStyle>;
}

function isRedSuit(suit: string): boolean {
  return suit === '♥' || suit === '♦';
}

export default function PlayingCard({
  card,
  faceUp,
  size = 'md',
  glow = false,
  style,
}: PlayingCardProps): React.ReactElement {
  const progress = useSharedValue(faceUp ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(faceUp ? 1 : 0, { duration: 450 });
  }, [faceUp, progress]);

  const cardSize = dimensions[size];

  const frontStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(progress.value, [0, 1], [180, 360]);
    return {
      transform: [{ rotateY: `${rotateY}deg` }],
      opacity: progress.value,
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(progress.value, [0, 1], [0, 180]);
    return {
      transform: [{ rotateY: `${rotateY}deg` }],
      opacity: 1 - progress.value,
    };
  });

  const textColor = card && isRedSuit(card.suit) ? '#FF5571' : theme.colors.text;

  return (
    <View
      style={[
        styles.container,
        {
          width: cardSize.width,
          height: cardSize.height,
        },
        glow && styles.glow,
        style,
      ]}
    >
      <Animated.View style={[styles.face, styles.back, backStyle]}>
        <View style={styles.patternGrid}>
          {Array.from({ length: 10 }).map((_, index) => (
            <View key={`p-${index}`} style={styles.patternDot} />
          ))}
        </View>
      </Animated.View>

      <Animated.View style={[styles.face, styles.front, frontStyle]}>
        {card ? (
          <>
            <Text style={[styles.value, { color: textColor, fontSize: cardSize.fontSize }]}>
              {card.value}
            </Text>
            <Text style={[styles.suit, { color: textColor, fontSize: cardSize.fontSize + 8 }]}>
              {card.suit}
            </Text>
          </>
        ) : (
          <Text style={[styles.value, { color: theme.colors.muted, fontSize: cardSize.fontSize }]}>
            ?
          </Text>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    borderRadius: 10,
  },
  face: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
    borderWidth: 1.2,
  },
  front: {
    backgroundColor: '#121224',
    borderColor: theme.colors.gold,
  },
  back: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.gold,
    overflow: 'hidden',
  },
  value: {
    fontWeight: '700',
  },
  suit: {
    marginTop: 4,
    fontWeight: '700',
  },
  patternGrid: {
    width: '72%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 6,
  },
  patternDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.gold,
    opacity: 0.65,
  },
  glow: {
    shadowColor: theme.colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 7,
  },
});
