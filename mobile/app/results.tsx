import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { theme } from '../constants/theme';
import { useGameStore } from '../store/gameStore';

export default function ResultsScreen(): React.ReactElement {
  const router = useRouter();
  const { stats, players } = useGameStore(
    useShallow((state) => ({
      stats: state.stats,
      players: state.players,
    })),
  );

  const ranking = useMemo(() => {
    if (stats.length) {
      return stats;
    }
    return [...players]
      .sort((a, b) => a.shotsReceived - b.shotsReceived)
      .map((player) => ({
        id: player.id,
        name: player.name,
        emoji: player.emoji,
        shotsReceived: player.shotsReceived,
      }));
  }, [stats, players]);

  const winner = ranking[0];

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Resultados</Text>
      {winner ? (
        <View style={styles.winnerBox}>
          <Text style={styles.winnerLabel}>🏆 Menos borracho/a</Text>
          <Text style={styles.winnerName}>
            {winner.emoji} {winner.name} ({winner.shotsReceived})
          </Text>
        </View>
      ) : null}

      <View style={styles.list}>
        {ranking.map((player, index) => (
          <View key={player.id} style={styles.row}>
            <Text style={styles.position}>{index + 1}.</Text>
            <Text style={styles.name}>
              {player.emoji} {player.name}
            </Text>
            <Text style={styles.shots}>{player.shotsReceived} tragos</Text>
          </View>
        ))}
      </View>

      <Pressable style={styles.button} onPress={() => router.replace('/lobby')}>
        <Text style={styles.buttonText}>JUGAR DE NUEVO</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  title: {
    color: theme.colors.gold,
    fontSize: 30,
    fontWeight: '800',
  },
  winnerBox: {
    marginTop: 18,
    backgroundColor: 'rgba(201,168,76,0.18)',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.5)',
    padding: 14,
  },
  winnerLabel: {
    color: theme.colors.gold,
    fontWeight: '700',
    fontSize: 16,
  },
  winnerName: {
    color: theme.colors.text,
    marginTop: 4,
    fontSize: 18,
    fontWeight: '700',
  },
  list: {
    marginTop: 16,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
    backgroundColor: 'rgba(26,26,46,0.7)',
    padding: 10,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  position: {
    color: theme.colors.gold,
    width: 28,
    fontWeight: '800',
  },
  name: {
    flex: 1,
    color: theme.colors.text,
    fontWeight: '600',
  },
  shots: {
    color: theme.colors.muted,
    fontWeight: '600',
  },
  button: {
    marginTop: 18,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.gold,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#101021',
    fontWeight: '800',
  },
});
