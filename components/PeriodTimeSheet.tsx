import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Theme } from '../constants/colors';
import { DEFAULT_PERIOD_TIMES } from '../constants/taskTypes';
import type { PeriodTime } from '../types/Task';
import { BottomSheet } from './BottomSheet';

interface Props {
  visible: boolean;
  theme: Theme;
  period: number;
  initial: PeriodTime;
  onClose: () => void;
  onSave: (value: PeriodTime) => void;
  onReset: () => void;
}

const TIME_RE = /^([0-1]?\d|2[0-3]):([0-5]\d)$/;

export function PeriodTimeSheet({ visible, theme, period, initial, onClose, onSave, onReset }: Props) {
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setStart(initial.start);
    setEnd(initial.end);
    setError('');
  }, [visible, initial]);

  const handleSave = () => {
    if (!TIME_RE.test(start) || !TIME_RE.test(end)) {
      setError('時刻は HH:MM 形式 (例: 09:00) で入力してください');
      return;
    }
    if (start >= end) {
      setError('終了時刻は開始時刻より後にしてください');
      return;
    }
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({ start, end });
  };

  const handleReset = () => {
    const def = DEFAULT_PERIOD_TIMES[period];
    if (def) {
      setStart(def.start);
      setEnd(def.end);
    }
    onReset();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} theme={theme} maxHeightRatio={0.5}>
      <View>
        <View style={styles.headerRow}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={[styles.headerBtn, { color: theme.accent }]}>キャンセル</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>⏰ {period}限の時間</Text>
          <Pressable onPress={handleSave} hitSlop={10}>
            <Text style={[styles.headerBtn, styles.primary, { color: theme.accent }]}>保存</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textTertiary }]}>開始</Text>
            <TextInput
              value={start}
              onChangeText={setStart}
              placeholder="09:00"
              placeholderTextColor={theme.textTertiary}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              style={[
                styles.input,
                { backgroundColor: theme.bgSecondary, color: theme.text },
              ]}
            />
          </View>
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textTertiary }]}>終了</Text>
            <TextInput
              value={end}
              onChangeText={setEnd}
              placeholder="10:30"
              placeholderTextColor={theme.textTertiary}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              style={[
                styles.input,
                { backgroundColor: theme.bgSecondary, color: theme.text },
              ]}
            />
          </View>

          {error ? (
            <Text style={[styles.error, { color: theme.palette.red.fg }]}>{error}</Text>
          ) : null}

          <Pressable
            onPress={handleReset}
            style={({ pressed }) => [
              styles.resetBtn,
              { backgroundColor: theme.bgSecondary, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Text style={[styles.resetLabel, { color: theme.textSecondary }]}>
              デフォルトに戻す ({DEFAULT_PERIOD_TIMES[period]?.start} – {DEFAULT_PERIOD_TIMES[period]?.end})
            </Text>
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerBtn: {
    fontSize: 15,
    minWidth: 80,
  },
  primary: {
    textAlign: 'right',
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  error: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 8,
  },
  resetBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  resetLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
});
