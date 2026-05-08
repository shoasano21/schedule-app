import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated as RNAnimated,
  Easing as RNEasing,
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
import { useTitlePresets } from '../hooks/useTitlePresets';
import type { ColorId, EventItem } from '../types/Event';
import { END_HOUR, START_HOUR, formatHour, fromISODate, toISODate } from '../utils/date';
import { BottomSheet } from './BottomSheet';
import { ColorPicker } from './ColorPicker';

export interface AddEventInput {
  id?: string;
  title: string;
  date: string;
  startH: number;
  endH: number;
  color: ColorId;
  location: string;
  memo: string;
}

interface Props {
  visible: boolean;
  theme: Theme;
  initial?: EventItem | null;
  defaultDate?: string;
  defaultStartH?: number;
  onClose: () => void;
  onSubmit: (input: AddEventInput) => void;
}

const HOUR_LIST = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

export function AddEventSheet({
  visible,
  theme,
  initial,
  defaultDate,
  defaultStartH,
  onClose,
  onSubmit,
}: Props) {
  const isEdit = !!initial;
  const presetsHook = useTitlePresets();
  const { presets, addPreset, removePreset } = presetsHook;

  const [title, setTitle] = useState('');
  const [date, setDate] = useState<string>(() => toISODate(new Date()));
  const [startH, setStartH] = useState<number>(9);
  const [endH, setEndH] = useState<number>(10);
  const [color, setColor] = useState<ColorId>('blue');
  const [location, setLocation] = useState('');
  const [memo, setMemo] = useState('');
  const [error, setError] = useState<string>('');
  const [showNewInput, setShowNewInput] = useState(false);
  const [newTitleDraft, setNewTitleDraft] = useState('');
  const [manageMode, setManageMode] = useState(false);

  const shakeAnim = useRef(new RNAnimated.Value(0)).current;

  // Lock fields that were already chosen by the cell/slot tap
  const lockDate = !isEdit && defaultDate != null;
  const lockStart = !isEdit && defaultStartH != null;

  useEffect(() => {
    if (!visible) return;
    if (initial) {
      setTitle(initial.title);
      setDate(initial.date);
      setStartH(initial.startH);
      setEndH(initial.endH);
      setColor(initial.color);
      setLocation(initial.location);
      setMemo(initial.memo);
    } else {
      const baseStart =
        defaultStartH != null && defaultStartH >= START_HOUR && defaultStartH < END_HOUR
          ? defaultStartH
          : 9;
      setTitle('');
      setDate(defaultDate ?? toISODate(new Date()));
      setStartH(baseStart);
      setEndH(Math.min(END_HOUR, baseStart + 1));
      setColor('blue');
      setLocation('');
      setMemo('');
    }
    setError('');
    setShowNewInput(false);
    setNewTitleDraft('');
    setManageMode(false);
  }, [visible, initial, defaultDate, defaultStartH]);

  const dateOptions = useMemo(() => {
    const base = fromISODate(date);
    const days: { iso: string; day: number; month: number; dow: string }[] = [];
    for (let i = -7; i <= 90; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const dow = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
      days.push({
        iso: toISODate(d),
        day: d.getDate(),
        month: d.getMonth() + 1,
        dow,
      });
    }
    return days;
    // intentionally only depend on visibility — keep options stable while sheet is open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const validEndHours = useMemo(
    () => HOUR_LIST.filter((h) => h > startH),
    [startH]
  );

  const triggerShake = () => {
    shakeAnim.setValue(0);
    RNAnimated.sequence([
      RNAnimated.timing(shakeAnim, { toValue: 1, duration: 60, easing: RNEasing.linear, useNativeDriver: true }),
      RNAnimated.timing(shakeAnim, { toValue: -1, duration: 60, easing: RNEasing.linear, useNativeDriver: true }),
      RNAnimated.timing(shakeAnim, { toValue: 1, duration: 60, easing: RNEasing.linear, useNativeDriver: true }),
      RNAnimated.timing(shakeAnim, { toValue: 0, duration: 60, easing: RNEasing.linear, useNativeDriver: true }),
    ]).start();
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleSelectChip = (t: string) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setTitle(t);
    setShowNewInput(false);
    setNewTitleDraft('');
    setError('');
  };

  const handleConfirmNewTitle = () => {
    const t = newTitleDraft.trim();
    if (!t) return;
    if (t.length > 20) {
      setError('タイトルは20文字以内にしてください');
      triggerShake();
      return;
    }
    addPreset(t);
    setTitle(t);
    setShowNewInput(false);
    setNewTitleDraft('');
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('タイトルを選択してください');
      triggerShake();
      return;
    }
    if (trimmed.length > 20) {
      setError('タイトルは20文字以内にしてください');
      triggerShake();
      return;
    }
    if (endH <= startH) {
      setError('終了時刻は開始時刻より後にしてください');
      triggerShake();
      return;
    }
    if (!presets.includes(trimmed)) addPreset(trimmed);

    setError('');
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onSubmit({
      id: initial?.id,
      title: trimmed,
      date,
      startH,
      endH,
      color,
      location: location.trim(),
      memo: memo.trim(),
    });
  };

  const titleTranslate = shakeAnim.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] });

  return (
    <BottomSheet visible={visible} onClose={onClose} theme={theme} maxHeightRatio={0.92}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={[styles.headerBtn, { color: theme.accent }]}>キャンセル</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {isEdit ? 'イベント編集' : '新しいイベント'}
          </Text>
          <Pressable onPress={handleSubmit} hitSlop={10}>
            <Text style={[styles.headerBtn, styles.primary, { color: theme.accent }]}>
              {isEdit ? '保存' : '追加'}
            </Text>
          </Pressable>
        </View>

        {lockDate ? (
          <View style={[styles.contextBar, { backgroundColor: theme.accentBg }]}>
            <Ionicons name="calendar-outline" size={14} color={theme.accent} />
            <Text style={[styles.contextText, { color: theme.accent }]}>
              {formatDateShort(date)}
              {lockStart ? `・${formatHour(startH)} に追加` : ' に追加'}
            </Text>
          </View>
        ) : null}

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Section
            label="タイトル"
            theme={theme}
            rightSlot={
              presets.length > 0 ? (
                <Pressable onPress={() => setManageMode((v) => !v)} hitSlop={6}>
                  <Text style={[styles.manageBtn, { color: theme.accent }]}>
                    {manageMode ? '完了' : '編集'}
                  </Text>
                </Pressable>
              ) : null
            }
          >
            <RNAnimated.View style={{ transform: [{ translateX: titleTranslate }] }}>
              <View style={styles.chipsWrap}>
                {presets.map((p) => {
                  const selected = title === p;
                  return (
                    <Pressable
                      key={p}
                      onPress={() => (manageMode ? null : handleSelectChip(p))}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected ? theme.accent : theme.bgSecondary,
                          borderColor: selected ? theme.accent : theme.separator,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: selected ? '#fff' : theme.text },
                        ]}
                      >
                        {p}
                      </Text>
                      {manageMode ? (
                        <Pressable
                          onPress={() => {
                            if (Platform.OS !== 'web') void Haptics.selectionAsync();
                            removePreset(p);
                            if (title === p) setTitle('');
                          }}
                          hitSlop={6}
                          style={[
                            styles.chipRemove,
                            { backgroundColor: theme.palette.red.fg },
                          ]}
                        >
                          <Ionicons name="close" size={11} color="#fff" />
                        </Pressable>
                      ) : null}
                    </Pressable>
                  );
                })}
                {!manageMode ? (
                  <Pressable
                    onPress={() => {
                      if (Platform.OS !== 'web') void Haptics.selectionAsync();
                      setShowNewInput(true);
                    }}
                    style={[
                      styles.chipAdd,
                      {
                        borderColor: theme.accent,
                      },
                    ]}
                  >
                    <Ionicons name="add" size={14} color={theme.accent} />
                    <Text style={[styles.chipAddText, { color: theme.accent }]}>新規追加</Text>
                  </Pressable>
                ) : null}
              </View>
            </RNAnimated.View>

            {showNewInput ? (
              <View style={styles.newRow}>
                <TextInput
                  value={newTitleDraft}
                  onChangeText={setNewTitleDraft}
                  placeholder="新しいタイトル..."
                  placeholderTextColor={theme.textTertiary}
                  maxLength={20}
                  autoFocus
                  onSubmitEditing={handleConfirmNewTitle}
                  returnKeyType="done"
                  style={[
                    styles.input,
                    { flex: 1, backgroundColor: theme.bgSecondary, color: theme.text },
                  ]}
                />
                <Pressable
                  onPress={handleConfirmNewTitle}
                  style={({ pressed }) => [
                    styles.confirmBtn,
                    {
                      backgroundColor: theme.accent,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text style={styles.confirmBtnText}>追加</Text>
                </Pressable>
              </View>
            ) : null}
          </Section>

          {!lockDate ? (
            <Section label="日付" theme={theme}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dateRow}
              >
                {dateOptions.map((d) => {
                  const selected = d.iso === date;
                  return (
                    <Pressable
                      key={d.iso}
                      onPress={() => {
                        if (Platform.OS !== 'web') void Haptics.selectionAsync();
                        setDate(d.iso);
                      }}
                      style={[
                        styles.datePill,
                        {
                          backgroundColor: selected ? theme.accent : theme.bgSecondary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.datePillDow,
                          { color: selected ? 'rgba(255,255,255,0.85)' : theme.textTertiary },
                        ]}
                      >
                        {d.month}/{d.day}
                      </Text>
                      <Text
                        style={[
                          styles.datePillNum,
                          { color: selected ? '#fff' : theme.text },
                        ]}
                      >
                        {d.dow}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Section>
          ) : null}

          {!lockStart ? (
            <Section label="開始時刻" theme={theme}>
              <HourPicker
                value={startH}
                hours={HOUR_LIST.filter((h) => h < END_HOUR)}
                theme={theme}
                onChange={(h) => {
                  setStartH(h);
                  if (endH <= h) setEndH(Math.min(END_HOUR, h + 1));
                }}
              />
            </Section>
          ) : null}

          <Section label="終了時刻" theme={theme}>
            <HourPicker
              value={endH}
              hours={validEndHours}
              theme={theme}
              onChange={setEndH}
            />
          </Section>

          <Section label="色" theme={theme}>
            <ColorPicker value={color} onChange={setColor} theme={theme} />
          </Section>

          <Section label="場所（任意）" theme={theme}>
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="例: カフェ、自宅、Zoom..."
              placeholderTextColor={theme.textTertiary}
              maxLength={40}
              style={[
                styles.input,
                { backgroundColor: theme.bgSecondary, color: theme.text },
              ]}
              returnKeyType="done"
            />
          </Section>

          <Section label="メモ（任意）" theme={theme}>
            <TextInput
              value={memo}
              onChangeText={setMemo}
              placeholder="メモを入力..."
              placeholderTextColor={theme.textTertiary}
              multiline
              numberOfLines={3}
              maxLength={200}
              style={[
                styles.input,
                styles.multiline,
                { backgroundColor: theme.bgSecondary, color: theme.text },
              ]}
            />
          </Section>

          {error ? (
            <View style={[styles.errorRow, { backgroundColor: theme.palette.red.bg }]}>
              <Ionicons name="alert-circle" size={16} color={theme.palette.red.fg} />
              <Text style={[styles.errorText, { color: theme.palette.red.fg }]}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

function Section({
  label,
  theme,
  children,
  rightSlot,
}: {
  label: string;
  theme: Theme;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 18 }}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.label, { color: theme.textTertiary }]}>{label}</Text>
        {rightSlot}
      </View>
      {children}
    </View>
  );
}

function HourPicker({
  value,
  hours,
  onChange,
  theme,
}: {
  value: number;
  hours: number[];
  onChange: (h: number) => void;
  theme: Theme;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingRight: 12 }}
    >
      {hours.map((h) => {
        const sel = h === value;
        return (
          <Pressable
            key={h}
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.selectionAsync();
              onChange(h);
            }}
            style={[
              styles.hourPill,
              {
                backgroundColor: sel ? theme.accent : theme.bgSecondary,
              },
            ]}
          >
            <Text style={[styles.hourPillText, { color: sel ? '#fff' : theme.text }]}>
              {String(h).padStart(2, '0')}:00
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function formatDateShort(iso: string) {
  const d = fromISODate(iso);
  const wd = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}(${wd})`;
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
    fontWeight: '600',
  },
  headerBtn: {
    fontSize: 15,
    minWidth: 70,
  },
  primary: {
    textAlign: 'right',
    fontWeight: '700',
  },
  contextBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 10,
  },
  contextText: {
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  manageBtn: {
    fontSize: 12,
    fontWeight: '600',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chipRemove: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  chipAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  chipAddText: {
    fontSize: 13,
    fontWeight: '600',
  },
  newRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  confirmBtn: {
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  multiline: {
    minHeight: 84,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 12,
  },
  datePill: {
    minWidth: 56,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  datePillDow: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  datePillNum: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  hourPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  hourPillText: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
