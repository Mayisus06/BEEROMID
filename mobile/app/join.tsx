import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import axios from 'axios';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { theme } from '../constants/theme';
import { joinRoom } from '../services/api';
import {
  BACKEND_URL,
  BACKEND_URL_IS_UNCONFIGURED,
  getBackendConfigHelpMessage,
} from '../services/backendUrl';
import { connectSocket } from '../services/socket';
import { useGameStore } from '../store/gameStore';

export default function JoinScreen(): React.ReactElement {
  const router = useRouter();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🍻');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const setMyPlayer = useGameStore((state) => state.setMyPlayer);
  const hydrateRoom = useGameStore((state) => state.hydrateRoom);

  const onJoin = async (): Promise<void> => {
    const roomCode = code.trim().toUpperCase();
    if (!name.trim() || roomCode.length !== 4) {
      Alert.alert('Datos incompletos', 'Ingresa tu nombre y un codigo de 4 caracteres.');
      return;
    }
    if (BACKEND_URL_IS_UNCONFIGURED) {
      Alert.alert('Backend no configurado', getBackendConfigHelpMessage());
      return;
    }

    try {
      setLoading(true);
      const response = await joinRoom({
        code: roomCode,
        name: name.trim(),
        emoji,
      });

      setMyPlayer({
        id: response.player.id,
        name: response.player.name,
        emoji: response.player.emoji,
      });
      hydrateRoom(response.room);

      const socket = connectSocket();
      socket.emit('room:join', {
        code: response.room.code,
        playerId: response.player.id,
      });

      router.replace('/lobby');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const serverMessage =
          typeof error.response?.data?.message === 'string'
            ? error.response.data.message
            : null;
        const message =
          serverMessage ||
          (error.response
            ? 'Revisa el codigo o que la sala exista.'
            : BACKEND_URL_IS_UNCONFIGURED
              ? getBackendConfigHelpMessage()
              : `No se pudo conectar al backend en ${BACKEND_URL}.`);
        Alert.alert('No se pudo unir', message);
      } else {
        Alert.alert('No se pudo unir', 'Ocurrio un error inesperado.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Pressable onPress={() => router.replace('/')} style={styles.backButton}>
        <Text style={styles.backText}>Volver al menu</Text>
      </Pressable>

      <Text style={styles.title}>Unirse a sala</Text>

      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Tu nombre"
        placeholderTextColor={theme.colors.muted}
        maxLength={18}
      />

      <TextInput
        style={[styles.input, styles.codeInput]}
        value={code}
        onChangeText={(value) => setCode(value.toUpperCase())}
        placeholder="CODIGO"
        autoCapitalize="characters"
        placeholderTextColor={theme.colors.muted}
        maxLength={4}
      />

      <View style={styles.emojiWrap}>
        {['🍻', '🥃', '🍺', '🍷', '🍸', '🍹'].map((item) => (
          <Pressable
            key={item}
            onPress={() => setEmoji(item)}
            style={[styles.emojiButton, emoji === item && styles.emojiSelected]}
          >
            <Text style={styles.emoji}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.joinButton} onPress={onJoin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#101021" />
        ) : (
          <Text style={styles.joinText}>UNIRME</Text>
        )}
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    paddingHorizontal: 18,
    paddingTop: (StatusBar.currentHeight ?? 0) + 12,
  },
  title: {
    color: theme.colors.gold,
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 18,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(240,230,211,0.35)',
    borderRadius: theme.radius.sm,
  },
  backText: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderColor: 'rgba(201,168,76,0.35)',
    borderWidth: 1,
    borderRadius: theme.radius.md,
    color: theme.colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 4,
  },
  emojiWrap: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  emojiButton: {
    width: 46,
    height: 46,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.24)',
  },
  emojiSelected: {
    borderColor: theme.colors.gold,
    backgroundColor: 'rgba(201,168,76,0.18)',
  },
  emoji: {
    fontSize: 23,
  },
  joinButton: {
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.gold,
    paddingVertical: 14,
    alignItems: 'center',
  },
  joinText: {
    color: '#101021',
    fontWeight: '800',
    fontSize: 16,
  },
});
