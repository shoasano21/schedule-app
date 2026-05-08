import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Theme } from '../constants/colors';
import { DAY_LABELS_JA, SUBJECT_COLORS } from '../constants/taskTypes';
import type { Subject } from '../types/Task';
import { BottomSheet } from './BottomSheet';

interface Props {
  visible: boolean;
  theme: Theme;
  day: number;
  period: number;
  initial: Subject | null;
  suggestions: string[];
  onClose: () => void;
  onSave: (input: { id?: string; name: string; color: string; day: number; period: number }) => void;
  onDelete?: (id: string) => void;
}

export function SubjectEditSheet({
  visible,
  theme,
  day,
  period,
  initial,
  suggestions,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(SUBJECT_COLORS[0]);

  useEffect(() => {
    if (!visible) return;
    if (initial) {
      setName(initial.name);
      setColor(initial.color);
    } else {
      setName('');
      setColor(SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)]);
    }
  }, [visible, initial]);

  const filteredSuggestions = useMemo(
    () => suggestions.filter((s) => s !== name),
    [suggestions, name]
  );

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({ id: initial?.id, name: trimmed, color, day, period });
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} theme={theme} maxHeightRatio={0.8}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={[styles.headerBtn, { color: theme.accent }]}>キャンセル</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {DAY_LABELS_JA[day]}曜 {period}限
          </Text>
          <Pressable onPress={handleSave} hitSlop={10}>
            <Text style={[styles.headerBtn, styles.primary, { color: theme.accent }]}>保存</Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ marginBottom: 18 }}>
            <Text style={[styles.label, { color: theme.textTertiary }]}>科目名</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="例: 細胞生物学"
              placeholderTextColor={theme.textTertiary}
              maxLength={30}
              style={[
                styles.input,
                { backgroundColor: theme.bgSecondary, color: theme.text },
              ]}
              autoFocus
              returnKeyType="done"
            />
            {filteredSuggestions.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, paddingTop: 8 }}
              >
                {filteredSuggestions.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => {
                      if (Platform.OS !== 'web') void Haptics.selectionAsync();
                      setName(s);
                    }}
                    style={[styles.suggestChip, { backgroundColor: theme.bgSecondary }]}
                  >
                    <Text style={[styles.suggestText, { color: theme.text }]}>{s}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </View>

          <View style={{ marginBottom: 18 }}>
            <Text style={[styles.label, { color: theme.textTertiary }]}>色</Text>
            <View style={styles.colorGrid}>
              {SUBJECT_COLORS.map((c) => {
                const sel = color === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => {
                      if (Platform.OS !== 'web') void Haptics.selectionAsync();
                      setColor(c);
                    }}
                    style={[
                      styles.swatchOuter,
                      sel && { borderColor: c },
                    ]}
                  >
                    <View style={[styles.swatch, { backgroundColor: c }]} />
                  </Pressable>
                );
              })}
            </View>
          </View>

          {initial && onDelete ? (
            <Pressable
              onPress={() => onDelete(initial.id)}
              style={({ pressed }) => [
                styles.deleteBtn,
                {
                  backgroundColor: theme.palette.red.bg,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <Ionicons name="trash-outline" size={16} color={theme.palette.red.fg} />
              <Text style={[styles.deleteLabel, { color: theme.palette.red.fg }]}>削除</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
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
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  suggestChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  suggestText: {
    fontSize: 12,
    fontWeight: '600',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  swatchOuter: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  deleteLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
