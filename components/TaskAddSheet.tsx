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
import { TASK_TYPES } from '../constants/taskTypes';
import { TASK_TYPE_IDS, type Task, type TaskTypeId } from '../types/Task';
import { fromISODate, toISODate } from '../utils/date';
import { todayISO } from '../utils/task';
import { BottomSheet } from './BottomSheet';

export interface TaskInput {
  id?: string;
  course: string;
  title: string;
  type: TaskTypeId;
  desc: string;
  start: string;
  end: string;
  done: boolean;
  remindDays: number;
}

interface Props {
  visible: boolean;
  theme: Theme;
  initial?: Task | null;
  courseSuggestions: string[];
  defaultCourse?: string;
  onClose: () => void;
  onSubmit: (input: TaskInput) => void;
  onDelete?: (id: string) => void;
}

const REMIND_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: '当日' },
  { value: 1, label: '前日' },
  { value: 3, label: '3日前' },
  { value: 7, label: '1週間前' },
  { value: -1, label: 'なし' },
];

export function TaskAddSheet({
  visible,
  theme,
  initial,
  courseSuggestions,
  defaultCourse,
  onClose,
  onSubmit,
  onDelete,
}: Props) {
  const isEdit = !!initial;
  const [course, setCourse] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<TaskTypeId>('report');
  const [desc, setDesc] = useState('');
  const [start, setStart] = useState(todayISO());
  const [end, setEnd] = useState(todayISO());
  const [done, setDone] = useState(false);
  const [remindDays, setRemindDays] = useState(3);
  const [error, setError] = useState('');

  const shake = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    if (initial) {
      setCourse(initial.course);
      setTitle(initial.title);
      setType(initial.type);
      setDesc(initial.desc);
      setStart(initial.start);
      setEnd(initial.end);
      setDone(initial.done);
      setRemindDays(initial.remindDays);
    } else {
      setCourse(defaultCourse ?? '');
      setTitle('');
      setType('report');
      setDesc('');
      const today = todayISO();
      setStart(today);
      setEnd(addDaysISO(today, 7));
      setDone(false);
      setRemindDays(3);
    }
    setError('');
  }, [visible, initial, defaultCourse]);

  const triggerShake = (which: 'course' | 'title' | 'date') => {
    setError(
      which === 'course'
        ? '講義名を入力してください'
        : which === 'title'
        ? 'タイトルを入力してください'
        : '締切は出題日以降にしてください'
    );
    shake.setValue(0);
    RNAnimated.sequence([
      RNAnimated.timing(shake, { toValue: 1, duration: 60, easing: RNEasing.linear, useNativeDriver: true }),
      RNAnimated.timing(shake, { toValue: -1, duration: 60, easing: RNEasing.linear, useNativeDriver: true }),
      RNAnimated.timing(shake, { toValue: 1, duration: 60, easing: RNEasing.linear, useNativeDriver: true }),
      RNAnimated.timing(shake, { toValue: 0, duration: 60, easing: RNEasing.linear, useNativeDriver: true }),
    ]).start();
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleSubmit = () => {
    const c = course.trim();
    const t = title.trim();
    if (!c) return triggerShake('course');
    if (!t) return triggerShake('title');
    if (start > end) return triggerShake('date');

    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onSubmit({
      id: initial?.id,
      course: c,
      title: t,
      type,
      desc: desc.trim(),
      start,
      end,
      done,
      remindDays,
    });
  };

  const handleDelete = () => {
    if (!initial?.id || !onDelete) return;
    onDelete(initial.id);
  };

  const shakeStyle = {
    transform: [
      {
        translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-8, 8] }),
      },
    ],
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} theme={theme} maxHeightRatio={0.94}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={[styles.headerBtn, { color: theme.accent }]}>キャンセル</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {isEdit ? '課題を編集' : '✨ 課題を追加'}
          </Text>
          <Pressable onPress={handleSubmit} hitSlop={10}>
            <Text style={[styles.headerBtn, styles.primary, { color: theme.accent }]}>
              {isEdit ? '保存' : '追加'}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <RNAnimated.View style={shakeStyle}>
            <Section label="🎓 講義名" theme={theme}>
              <TextInput
                value={course}
                onChangeText={(v) => {
                  setCourse(v);
                  if (error.includes('講義名')) setError('');
                }}
                placeholder="例: 細胞生物学、化学Ⅰ..."
                placeholderTextColor={theme.textTertiary}
                maxLength={40}
                style={[
                  styles.input,
                  { backgroundColor: theme.bgSecondary, color: theme.text },
                ]}
                returnKeyType="next"
              />
              {courseSuggestions.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.suggestionRow}
                >
                  {courseSuggestions.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => {
                        if (Platform.OS !== 'web') void Haptics.selectionAsync();
                        setCourse(c);
                      }}
                      style={[
                        styles.suggestionChip,
                        {
                          backgroundColor:
                            c === course ? theme.accent : theme.bgSecondary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.suggestionText,
                          { color: c === course ? '#fff' : theme.text },
                        ]}
                      >
                        {c}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
            </Section>

            <Section label="📝 タイトル" theme={theme}>
              <TextInput
                value={title}
                onChangeText={(v) => {
                  setTitle(v);
                  if (error.includes('タイトル')) setError('');
                }}
                placeholder="例: 第2回レポート"
                placeholderTextColor={theme.textTertiary}
                maxLength={40}
                style={[
                  styles.input,
                  { backgroundColor: theme.bgSecondary, color: theme.text },
                ]}
                returnKeyType="next"
              />
            </Section>

            <Section label="🏷 種別" theme={theme}>
              <View style={styles.typesGrid}>
                {TASK_TYPE_IDS.map((id) => {
                  const meta = TASK_TYPES[id];
                  const sel = type === id;
                  return (
                    <Pressable
                      key={id}
                      onPress={() => {
                        if (Platform.OS !== 'web') void Haptics.selectionAsync();
                        setType(id);
                      }}
                      style={[
                        styles.typeChip,
                        {
                          backgroundColor: sel ? meta.fg : theme.bgSecondary,
                          borderColor: sel ? meta.fg : theme.separator,
                        },
                      ]}
                    >
                      <Text style={styles.typeEmoji}>{meta.emoji}</Text>
                      <Text
                        style={[
                          styles.typeLabel,
                          { color: sel ? '#fff' : theme.text },
                        ]}
                      >
                        {meta.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Section>

            <Section label="💬 詳細（任意）" theme={theme}>
              <TextInput
                value={desc}
                onChangeText={setDesc}
                placeholder="メモや指示、ページ番号など"
                placeholderTextColor={theme.textTertiary}
                maxLength={400}
                multiline
                numberOfLines={3}
                style={[
                  styles.input,
                  styles.multiline,
                  { backgroundColor: theme.bgSecondary, color: theme.text },
                ]}
              />
            </Section>

            <View style={styles.dateRow}>
              <View style={{ flex: 1 }}>
                <Section label="🚩 出題日" theme={theme}>
                  <DateField
                    value={start}
                    onChange={(v) => {
                      setStart(v);
                      if (v > end) setEnd(v);
                      if (error.includes('締切')) setError('');
                    }}
                    theme={theme}
                  />
                </Section>
              </View>
              <View style={{ flex: 1 }}>
                <Section label="🏁 締切日" theme={theme}>
                  <DateField
                    value={end}
                    onChange={(v) => {
                      setEnd(v);
                      if (error.includes('締切')) setError('');
                    }}
                    theme={theme}
                    minISO={start}
                  />
                </Section>
              </View>
            </View>

            <Section label="🔔 リマインダー" theme={theme}>
              <View style={styles.remindRow}>
                {REMIND_OPTIONS.map((opt) => {
                  const sel = remindDays === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => {
                        if (Platform.OS !== 'web') void Haptics.selectionAsync();
                        setRemindDays(opt.value);
                      }}
                      style={[
                        styles.remindPill,
                        {
                          backgroundColor: sel ? theme.accent : theme.bgSecondary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.remindLabel,
                          { color: sel ? '#fff' : theme.text },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Section>

            <Pressable
              onPress={() => {
                if (Platform.OS !== 'web') void Haptics.selectionAsync();
                setDone((v) => !v);
              }}
              style={[
                styles.doneRow,
                {
                  backgroundColor: done ? theme.palette.green.bg : theme.bgSecondary,
                  borderColor: done ? theme.palette.green.fg : theme.separator,
                },
              ]}
            >
              <Ionicons
                name={done ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={done ? theme.palette.green.fg : theme.textTertiary}
              />
              <Text
                style={[
                  styles.doneLabel,
                  { color: done ? theme.palette.green.fg : theme.text },
                ]}
              >
                {done ? '完了' : '完了にする'}
              </Text>
            </Pressable>

            {error ? (
              <View style={[styles.errorRow, { backgroundColor: theme.palette.red.bg }]}>
                <Ionicons name="alert-circle" size={16} color={theme.palette.red.fg} />
                <Text style={[styles.errorText, { color: theme.palette.red.fg }]}>{error}</Text>
              </View>
            ) : null}

            {isEdit && onDelete ? (
              <Pressable
                onPress={handleDelete}
                style={({ pressed }) => [
                  styles.deleteBtn,
                  {
                    backgroundColor: theme.palette.red.bg,
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
              >
                <Ionicons name="trash-outline" size={16} color={theme.palette.red.fg} />
                <Text style={[styles.deleteLabel, { color: theme.palette.red.fg }]}>
                  この課題を削除
                </Text>
              </Pressable>
            ) : null}
          </RNAnimated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

function Section({
  label,
  theme,
  children,
}: {
  label: string;
  theme: Theme;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[styles.label, { color: theme.textTertiary }]}>{label}</Text>
      {children}
    </View>
  );
}

function DateField({
  value,
  onChange,
  theme,
  minISO,
}: {
  value: string;
  onChange: (iso: string) => void;
  theme: Theme;
  minISO?: string;
}) {
  const dateOptions = useMemo(() => {
    const today = todayISO();
    const base = minISO && minISO > today ? minISO : today;
    const baseD = fromISODate(base);
    return Array.from({ length: 35 }, (_, i) => {
      const d = new Date(baseD);
      d.setDate(baseD.getDate() + i);
      return toISODate(d);
    });
  }, [minISO]);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 12 }}>
      {dateOptions.map((iso) => {
        const sel = iso === value;
        const d = fromISODate(iso);
        const wd = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
        return (
          <Pressable
            key={iso}
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.selectionAsync();
              onChange(iso);
            }}
            style={[
              styles.datePill,
              {
                backgroundColor: sel ? theme.accent : theme.bgSecondary,
              },
            ]}
          >
            <Text
              style={[
                styles.datePillSub,
                { color: sel ? 'rgba(255,255,255,0.9)' : theme.textTertiary },
              ]}
            >
              {d.getMonth() + 1}/{d.getDate()}
            </Text>
            <Text
              style={[
                styles.datePillMain,
                { color: sel ? '#fff' : theme.text },
              ]}
            >
              {wd}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function addDaysISO(iso: string, days: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
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
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  suggestionRow: {
    gap: 6,
    paddingTop: 8,
    paddingRight: 12,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  suggestionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  typeEmoji: {
    fontSize: 13,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  datePill: {
    minWidth: 52,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  datePillSub: {
    fontSize: 10,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  datePillMain: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  remindRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  remindPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  remindLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  doneLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginTop: 18,
  },
  deleteLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
