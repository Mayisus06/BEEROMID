import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import PlayingCard from '../components/PlayingCard';
import { theme } from '../constants/theme';
import { useGameStore } from '../store/gameStore';

function FloatingCard({
  delay,
  top,
  left,
}: {
  delay: number;
  top: number;
  left: number;
}): React.ReactElement {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      progress.value = withRepeat(withTiming(1, { duration: 3200 }), -1, true);
    }, delay);
    return () => clearTimeout(timeout);
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.value * -16 }],
  }));

  return (
    <Animated.View style={[styles.floatCard, { top, left }, style]}>
      <PlayingCard
        faceUp
        card={{
          id: `float-${delay}`,
          value: 'A',
          suit: '♠',
        }}
        size="sm"
      />
    </Animated.View>
  );
}

export default function HomeScreen(): React.ReactElement {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const resetRoom = useGameStore((state) => state.resetRoom);

  React.useEffect(() => {
    resetRoom();
  }, [resetRoom]);

  const sidePadding = 24;
  const maxLeft = Math.max(sidePadding, width - 96);
  const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

  const floatingCards = useMemo(
    () => [
      {
        delay: 0,
        top: clamp(height * 0.08, 70, height - 160),
        left: clamp(width * 0.08, sidePadding, maxLeft),
      },
      {
        delay: 260,
        top: clamp(height * 0.15, 120, height - 160),
        left: clamp(width * 0.75, sidePadding, maxLeft),
      },
      {
        delay: 510,
        top: clamp(height * 0.36, 260, height - 160),
        left: clamp(width * 0.12, sidePadding, maxLeft),
      },
      {
        delay: 740,
        top: clamp(height * 0.47, 360, height - 160),
        left: clamp(width * 0.68, sidePadding, maxLeft),
      },
      {
        delay: 980,
        top: clamp(height * 0.69, 510, height - 140),
        left: clamp(width * 0.22, sidePadding, maxLeft),
      },
      {
        delay: 1220,
        top: clamp(height * 0.74, 560, height - 120),
        left: clamp(width * 0.60, sidePadding, maxLeft),
      },
    ],
    [height, maxLeft, width],
  );

  return (
    <View style={styles.container}>
      {floatingCards.map((item) => (
        <FloatingCard
          key={`${item.delay}-${item.top}-${item.left}`}
          delay={item.delay}
          top={item.top}
          left={item.left}
        />
      ))}

      <View style={styles.content}>
        <Text style={styles.title}>BEEROMID</Text>
        <Text style={styles.subtitle}>El único juego donde perder tiene mejor sabor</Text>

        <Pressable style={styles.primaryButton} onPress={() => router.push('/create')}>
          <Text style={styles.primaryText}>CREAR SALA</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => router.push('/join')}>
          <Text style={styles.secondaryText}>UNIRSE</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    justifyContent: 'center',
  },
  content: {
    marginHorizontal: 24,
    padding: 20,
    backgroundColor: 'rgba(26,26,46,0.85)',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.4)',
  },
  title: {
    color: theme.colors.gold,
    fontSize: 42,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1.4,
  },
  subtitle: {
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 24,
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: theme.colors.gold,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: {
    color: '#101021',
    fontWeight: '800',
    fontSize: 16,
  },
  secondaryButton: {
    marginTop: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.text,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryText: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  floatCard: {
    position: 'absolute',
    opacity: 0.32,
  },
});
