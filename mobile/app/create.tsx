import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import axios from 'axios';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { theme } from '../constants/theme';
import { createRoom } from '../services/api';
import {
  BACKEND_URL,
  BACKEND_URL_IS_UNCONFIGURED,
  getBackendConfigHelpMessage,
} from '../services/backendUrl';
import { connectSocket } from '../services/socket';
import { useGameStore } from '../store/gameStore';

const EMOJIS = ['🥃', '🍺', '🍷', '🍹', '🍸', '🍻'];

export default function CreateScreen(): React.ReactElement {
  const router = useRouter();
  const topPadding = (StatusBar.currentHeight ?? 0) + 12;
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🥃');
  const [cardsPerPlayer, setCardsPerPlayer] = useState(4);
  const [pyramidRows, setPyramidRows] = useState(5);
  const [initialShots, setInitialShots] = useState(1);
  const [shotsIncrement, setShotsIncrement] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);

  const setMyPlayer = useGameStore((state) => state.setMyPlayer);
  const hydrateRoom = useGameStore((state) => state.hydrateRoom);

  const previewRows = useMemo(() => {
    return Array.from({ length: pyramidRows }, (_, rowIndex) => pyramidRows - rowIndex);
  }, [pyramidRows]);

  const onCreate = async (): Promise<void> => {
    if (!name.trim()) {
      Alert.alert('Falta tu nombre', 'Escribi como te llamas para crear la sala.');
      return;
    }
    if (BACKEND_URL_IS_UNCONFIGURED) {
      Alert.alert('Backend no configurado', getBackendConfigHelpMessage());
      return;
    }

    try {
      setLoading(true);
      const response = await createRoom({
        name: name.trim(),
        emoji,
        config: {
          cardsPerPlayer,
          pyramidRows,
          initialShots,
          shotsIncrement,
        },
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
            ? 'El backend rechazo la solicitud.'
            : BACKEND_URL_IS_UNCONFIGURED
              ? getBackendConfigHelpMessage()
              : `No se pudo conectar al backend en ${BACKEND_URL}.`);
        Alert.alert('No se pudo crear la sala', message);
      } else {
        Alert.alert('No se pudo crear la sala', 'Ocurrio un error inesperado.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPadding }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.replace('/')} style={styles.backButton}>
          <Text style={styles.backText}>Volver al menu</Text>
        </Pressable>

        <Text style={styles.title}>Crear sala</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Tu nombre"
          placeholderTextColor={theme.colors.muted}
          maxLength={18}
        />

        <View style={styles.emojiRow}>
          {EMOJIS.map((item) => (
            <Pressable
              key={item}
              style={[styles.emojiButton, emoji === item && styles.emojiActive]}
              onPress={() => setEmoji(item)}
            >
              <Text style={styles.emojiText}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <SliderField
          label={`Cartas por jugador: ${cardsPerPlayer}`}
          value={cardsPerPlayer}
          min={2}
          max={6}
          step={1}
          onChange={setCardsPerPlayer}
        />
        <SliderField
          label={`Filas de piramide: ${pyramidRows}`}
          value={pyramidRows}
          min={3}
          max={6}
          step={1}
          onChange={setPyramidRows}
        />
        <SliderField
          label={`Tragos iniciales: ${initialShots}`}
          value={initialShots}
          min={1}
          max={3}
          step={1}
          onChange={setInitialShots}
        />

        <View style={styles.incrementRow}>
          <Text style={styles.sliderLabel}>Incremento por fila</Text>
          <View style={styles.incrementButtons}>
            {[1, 2].map((value) => (
              <Pressable
                key={value}
                style={[
                  styles.incrementButton,
                  shotsIncrement === value && styles.incrementButtonActive,
                ]}
                onPress={() => setShotsIncrement(value as 1 | 2)}
              >
                <Text
                  style={[
                    styles.incrementText,
                    shotsIncrement === value && styles.incrementTextActive,
                  ]}
                >
                  +{value}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.preview}>
          <Text style={styles.previewTitle}>Vista previa de piramide</Text>
          {previewRows.map((rowCount, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.previewRow}>
              {Array.from({ length: rowCount }).map((_, cardIndex) => (
                <View key={`c-${cardIndex}`} style={styles.previewCard} />
              ))}
            </View>
          ))}
        </View>

        <Pressable style={styles.createButton} onPress={onCreate} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#101021" />
          ) : (
            <Text style={styles.createText}>CREAR Y ENTRAR</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (nextValue: number) => void;
}): React.ReactElement {
  return (
    <View style={styles.sliderWrap}>
      <Text style={styles.sliderLabel}>{label}</Text>
      <Slider
        value={value}
        minimumValue={min}
        maximumValue={max}
        step={step}
        onValueChange={onChange}
        minimumTrackTintColor={theme.colors.gold}
        maximumTrackTintColor="rgba(240,230,211,0.22)"
        thumbTintColor={theme.colors.text}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 20,
  },
  title: {
    color: theme.colors.gold,
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 14,
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
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  emojiButton: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiActive: {
    borderColor: theme.colors.gold,
    backgroundColor: 'rgba(201,168,76,0.16)',
  },
  emojiText: {
    fontSize: 21,
  },
  sliderWrap: {
    marginBottom: 8,
  },
  sliderLabel: {
    color: theme.colors.text,
    marginBottom: 4,
    fontSize: 15,
    fontWeight: '600',
  },
  incrementRow: {
    marginTop: 8,
  },
  incrementButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 14,
  },
  incrementButton: {
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.25)',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  incrementButtonActive: {
    borderColor: theme.colors.gold,
    backgroundColor: 'rgba(201,168,76,0.2)',
  },
  incrementText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  incrementTextActive: {
    color: theme.colors.gold,
  },
  preview: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
    backgroundColor: 'rgba(26,26,46,0.65)',
    borderRadius: theme.radius.md,
    padding: 12,
    gap: 5,
  },
  previewTitle: {
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: 2,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  previewCard: {
    width: 18,
    height: 24,
    borderRadius: 4,
    backgroundColor: 'rgba(201,168,76,0.5)',
  },
  createButton: {
    marginTop: 16,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  createText: {
    color: '#101021',
    fontWeight: '800',
    fontSize: 16,
  },
});
