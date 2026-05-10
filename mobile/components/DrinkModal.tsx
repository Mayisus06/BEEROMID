import React, { useEffect, useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { theme } from '../constants/theme';
import { Player, RowRule } from '../types/game';

interface DrinkModalProps {
  visible: boolean;
  rule: RowRule | null;
  shots: number;
  players: Player[];
  currentPlayerId: string;
  onClose: () => void;
  onConfirmTake: () => void;
  onAssign: (targetPlayerId: string) => void;
}

export default function DrinkModal({
  visible,
  rule,
  shots,
  players,
  currentPlayerId,
  onClose,
  onConfirmTake,
  onAssign,
}: DrinkModalProps): React.ReactElement {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 420 }),
        withTiming(1, { duration: 420 }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const otherPlayers = useMemo(
    () => players.filter((player) => player.id !== currentPlayerId),
    [players, currentPlayerId],
  );

  const showTake = rule === 'TOMA' || rule === 'TOMA_SECO+REGALA_SECO';
  const showGive = rule === 'REGALA' || rule === 'TOMA_SECO+REGALA_SECO';
  const isSeco = rule === 'TOMA_SECO+REGALA_SECO';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card}>
          <Text style={styles.title}>Resolucion de ronda</Text>
          <Text style={styles.subtitle}>
            {isSeco ? 'AL SECO + REGALA' : rule ?? 'Sin regla'}
          </Text>
          <Text style={styles.shots}>Cantidad: {shots} trago(s)</Text>

          {showTake ? (
            <Animated.View style={bounceStyle}>
              <TouchableOpacity
                style={[styles.actionButton, styles.takeButton]}
                onPress={onConfirmTake}
              >
                <Text style={styles.actionText}>
                  {isSeco ? `TOMAR AL SECO (${shots * 2})` : `TOMAR (${shots})`}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ) : null}

          {showGive ? (
            <View style={styles.giveSection}>
              <Text style={styles.pickerTitle}>
                {isSeco ? `Regala ${shots * 2} trago(s)` : `Elegi a quien regalar ${shots}`}
              </Text>
              <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                {otherPlayers.map((player) => (
                  <TouchableOpacity
                    key={player.id}
                    style={styles.playerButton}
                    onPress={() => onAssign(player.id)}
                  >
                    <Text style={styles.playerText}>
                      {player.emoji} {player.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.gold,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: 18,
    gap: 12,
  },
  title: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 20,
  },
  subtitle: {
    color: theme.colors.gold,
    fontWeight: '700',
    fontSize: 16,
  },
  shots: {
    color: theme.colors.text,
    fontSize: 16,
  },
  actionButton: {
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  takeButton: {
    backgroundColor: theme.colors.toma,
  },
  giveSection: {
    marginTop: 4,
  },
  pickerTitle: {
    color: theme.colors.text,
    marginBottom: 8,
    fontSize: 15,
  },
  list: {
    maxHeight: 180,
  },
  listContent: {
    gap: 8,
  },
  playerButton: {
    backgroundColor: 'rgba(240,230,211,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.25)',
    borderRadius: theme.radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  playerText: {
    color: theme.colors.text,
    fontWeight: '600',
  },
});
