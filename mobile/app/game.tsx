import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
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
import PlayerHand from '../components/PlayerHand';
import PyramidBoard from '../components/PyramidBoard';
import { theme } from '../constants/theme';
import { connectSocket, getSocket } from '../services/socket';
import { useGameStore } from '../store/gameStore';
import { Card, FlipPayload, RoomPublic } from '../types/game';

export default function GameScreen(): React.ReactElement {
  const router = useRouter();
  const topPadding = (StatusBar.currentHeight ?? 0) + 18;

  const {
    roomCode,
    myPlayer,
    isHost,
    players,
    myHand,
    pyramid,
    currentCard,
    pendingAction,
    roomStatus,
    hydrateRoom,
    applyFlip,
    setMyHand,
    setStats,
  } = useGameStore(
    useShallow((state) => ({
      roomCode: state.roomCode,
      myPlayer: state.myPlayer,
      isHost: state.isHost,
      players: state.players,
      myHand: state.myHand,
      pyramid: state.pyramid,
      currentCard: state.currentCard,
      pendingAction: state.pendingAction,
      roomStatus: state.roomStatus,
      hydrateRoom: state.hydrateRoom,
      applyFlip: state.applyFlip,
      setMyHand: state.setMyHand,
      setStats: state.setStats,
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
      if (payload.room.status === 'FINISHED') {
        const ranking = [...payload.room.players]
          .sort((a, b) => a.shotsReceived - b.shotsReceived)
          .map((player) => ({
            id: player.id,
            name: player.name,
            emoji: player.emoji,
            shotsReceived: player.shotsReceived,
          }));
        setStats(ranking);
        router.replace('/results');
      }
    };

    const onHand = (payload: { playerId: string; hand: Card[] }) => {
      if (payload.playerId === myPlayer.id) {
        setMyHand(payload.hand);
      }
    };

    const onFlipped = (payload: FlipPayload) => {
      applyFlip(payload);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const onError = (payload: { message: string }) => {
      Alert.alert('Error', payload.message);
    };

    socket.on('room:updated', onRoomUpdated);
    socket.on('player:hand', onHand);
    socket.on('pyramid:flipped', onFlipped);
    socket.on('error:message', onError);

    return () => {
      socket.off('room:updated', onRoomUpdated);
      socket.off('player:hand', onHand);
      socket.off('pyramid:flipped', onFlipped);
      socket.off('error:message', onError);
    };
  }, [roomCode, myPlayer, hydrateRoom, applyFlip, setMyHand, setStats, router]);

  const canHostControl = isHost && roomStatus === 'IN_PROGRESS' && Boolean(myPlayer);
  const pendingMatchesCount = pendingAction?.matchingPlayerIds.length ?? 0;
  const canReplace =
    canHostControl &&
    Boolean(currentCard) &&
    Boolean(pendingAction) &&
    pendingMatchesCount === 0;

  const emitFlip = (): void => {
    if (!canHostControl || !myPlayer) {
      return;
    }
    getSocket().emit('pyramid:flip', {
      code: roomCode,
      playerId: myPlayer.id,
    });
  };

  const emitReplace = (): void => {
    if (!canReplace || !myPlayer) {
      return;
    }
    getSocket().emit('pyramid:replace', {
      code: roomCode,
      playerId: myPlayer.id,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { paddingTop: topPadding }]}>
        <View style={styles.boardSection}>
          <PyramidBoard pyramid={pyramid} />
        </View>

        <View style={styles.controlsSection}>
          {isHost ? (
            <View style={styles.actionRow}>
              <Pressable
                style={[styles.actionButton, styles.flipButton, !canHostControl && styles.disabled]}
                onPress={emitFlip}
                disabled={!canHostControl}
              >
                <Text style={styles.actionText}>VOLTEAR</Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.replaceButton, !canReplace && styles.disabled]}
                onPress={emitReplace}
                disabled={!canReplace}
              >
                <Text style={styles.actionText}>REEMPLAZAR</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={styles.handSection}>
          <PlayerHand hand={myHand} matchValue={currentCard?.value ?? null} />
        </View>
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
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  boardSection: {
    flex: 3.8,
    justifyContent: 'flex-start',
  },
  controlsSection: {
    paddingHorizontal: 6,
    paddingTop: 2,
    paddingBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  actionText: {
    color: '#101021',
    fontWeight: '800',
    fontSize: 15,
  },
  flipButton: {
    backgroundColor: theme.colors.gold,
  },
  replaceButton: {
    backgroundColor: '#E3B94A',
  },
  disabled: {
    opacity: 0.42,
  },
  handSection: {
    flex: 1.5,
    justifyContent: 'flex-end',
  },
});
