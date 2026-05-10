import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { theme } from '../constants/theme';
import { connectSocket, getSocket } from '../services/socket';
import { useGameStore } from '../store/gameStore';
import { RoomPublic } from '../types/game';

const MIN_PLAYERS_TO_START = 2;

export default function LobbyScreen(): React.ReactElement {
  const router = useRouter();
  const topPadding = (StatusBar.currentHeight ?? 0) + 12;
  const {
    roomCode,
    players,
    myPlayer,
    isHost,
    roomStatus,
    hydrateRoom,
  } = useGameStore(
    useShallow((state) => ({
      roomCode: state.roomCode,
      players: state.players,
      myPlayer: state.myPlayer,
      isHost: state.isHost,
      roomStatus: state.roomStatus,
      hydrateRoom: state.hydrateRoom,
    })),
  );

  useEffect(() => {
    if (!roomCode || !myPlayer) {
      router.replace('/');
      return;
    }

    const socket = connectSocket();
    socket.emit('room:join', { code: roomCode, playerId: myPlayer.id });

    const onRoomUpdated = (payload: { room: RoomPublic }) => {
      hydrateRoom(payload.room);
    };
    const onGameStarted = (payload: { room: RoomPublic }) => {
      hydrateRoom(payload.room);
      router.replace('/game');
    };
    const onError = (payload: { message: string }) => {
      Alert.alert('Error', payload.message);
    };

    socket.on('room:updated', onRoomUpdated);
    socket.on('game:started', onGameStarted);
    socket.on('error:message', onError);

    return () => {
      socket.off('room:updated', onRoomUpdated);
      socket.off('game:started', onGameStarted);
      socket.off('error:message', onError);
    };
  }, [roomCode, myPlayer, hydrateRoom, router]);

  const onStartGame = (): void => {
    if (!myPlayer) {
      return;
    }
    if (players.length < MIN_PLAYERS_TO_START) {
      Alert.alert(
        'Faltan jugadores',
        `Necesitan al menos ${MIN_PLAYERS_TO_START} para iniciar.`,
      );
      return;
    }
    const socket = getSocket();
    socket.emit('game:start', {
      code: roomCode,
      playerId: myPlayer.id,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { paddingTop: topPadding }]}>
        <Text style={styles.title}>Lobby</Text>
        <Text style={styles.code}>Codigo: {roomCode}</Text>
        <Text style={styles.status}>
          Estado: {roomStatus === 'LOBBY' ? 'Esperando jugadores' : 'Partida en curso'}
        </Text>

        <View style={styles.playersBox}>
          {players.map((player) => (
            <View key={player.id} style={styles.playerRow}>
              <Text style={styles.playerName}>
                {player.emoji} {player.name}
              </Text>
              <Text style={styles.playerMeta}>
                {player.connected ? 'Conectado' : 'Desconectado'}
              </Text>
            </View>
          ))}
        </View>

        {isHost ? (
          <Pressable
            style={[
              styles.startButton,
              players.length < MIN_PLAYERS_TO_START && styles.disabledButton,
            ]}
            onPress={onStartGame}
            disabled={players.length < MIN_PLAYERS_TO_START}
          >
            <Text style={styles.startText}>INICIAR PARTIDA</Text>
          </Pressable>
        ) : (
          <View style={styles.waitingWrap}>
            <Text style={styles.waiting}>
              Esperando que el host inicie la partida...
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
  },
  title: {
    color: theme.colors.gold,
    fontSize: 30,
    fontWeight: '800',
  },
  code: {
    color: theme.colors.text,
    marginTop: 8,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
  },
  status: {
    color: theme.colors.muted,
    marginTop: 6,
  },
  playersBox: {
    marginTop: 18,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
    backgroundColor: 'rgba(26,26,46,0.7)',
    padding: 12,
    gap: 10,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  playerMeta: {
    color: theme.colors.muted,
    fontSize: 13,
  },
  startButton: {
    marginTop: 18,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.gold,
    alignItems: 'center',
    paddingVertical: 14,
  },
  disabledButton: {
    opacity: 0.45,
  },
  startText: {
    color: '#101021',
    fontWeight: '800',
    fontSize: 16,
  },
  waiting: {
    textAlign: 'center',
    color: theme.colors.muted,
  },
  waitingWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 120,
  },
});
