import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Theme } from '../constants/colors';
import { STATUS_COLORS, STATUS_LABELS_JA, TASK_TYPES } from '../constants/taskTypes';
import { useColorScheme } from 'react-native';
import type { Task } from '../types/Task';
import type { ReminderItem } from '../hooks/useReminders';

interface Props {
  items: ReminderItem[];
  theme: Theme;
  onPressTask: (task: Task) => void;
}

export function ReminderBanner({ items, theme, onPressTask }: Props) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  if (items.length === 0) return null;

  const past = items.filter((i) => i.status === 'past').length;
  const urgent = items.filter((i) => i.status === 'urgent').length;
  const soon = items.filter((i) => i.status === 'soon').length;

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Ionicons name="notifications" size={16} color={theme.palette.red.fg} />
        <Text style={[styles.title, { color: theme.text }]}>締切が近い課題</Text>
        <Text style={[styles.count, { color: theme.textTertiary }]}>{items.length}件</Text>
      </View>

      {past + urgent + soon > 0 ? (
        <View style={styles.summaryRow}>
          {past > 0 ? (
            <Pill label={`期限切れ ${past}`} color={STATUS_COLORS.past.fg} dark={dark} theme={theme} />
          ) : null}
          {urgent > 0 ? (
            <Pill label={`緊急 ${urgent}`} color={STATUS_COLORS.urgent.fg} dark={dark} theme={theme} />
          ) : null}
          {soon > 0 ? (
            <Pill label={`近日 ${soon}`} color={STATUS_COLORS.soon.fg} dark={dark} theme={theme} />
          ) : null}
        </View>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollRow}
      >
        {items.slice(0, 8).map((it) => (
          <ReminderCard key={it.task.id} item={it} theme={theme} dark={dark} onPress={() => onPressTask(it.task)} />
        ))}
      </ScrollView>
    </View>
  );
}

function Pill({
  label,
  color,
  dark,
  theme,
}: {
  label: string;
  color: string;
  dark: boolean;
  theme: Theme;
}) {
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: dark ? `${color}33` : `${color}1f` },
      ]}
    >
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

function ReminderCard({
  item,
  theme,
  dark,
  onPress,
}: {
  item: ReminderItem;
  theme: Theme;
  dark: boolean;
  onPress: () => void;
}) {
  const sCol = STATUS_COLORS[item.status];
  const meta = TASK_TYPES[item.task.type];

  let leftLabel: string;
  if (item.status === 'past') leftLabel = `${Math.abs(item.daysLeft)}日経過`;
  else if (item.daysLeft === 0) leftLabel = '今日が締切';
  else if (item.daysLeft === 1) leftLabel = '明日が締切';
  else leftLabel = `あと${item.daysLeft}日`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: dark ? sCol.bgDark : sCol.bgLight,
          borderColor: sCol.fg,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={[styles.cardLeft, { color: sCol.fg }]}>{leftLabel}</Text>
      <Text style={[styles.cardCourse, { color: theme.text }]} numberOfLines={1}>
        {meta.emoji} {item.task.course}
      </Text>
      <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>
        {item.task.title}
      </Text>
      <Text style={[styles.cardDate, { color: theme.textSecondary }]}>
        締切: {formatDate(item.task.end)}
      </Text>
    </Pressable>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!m || !d) return iso;
  const date = new Date(y, m - 1, d);
  const wd = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
  return `${m}/${d} (${wd})`;
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 18,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  count: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 6,
    marginBottom: 10,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scrollRow: {
    paddingHorizontal: 20,
    gap: 10,
    paddingRight: 24,
  },
  card: {
    width: 200,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  cardLeft: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  cardCourse: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    minHeight: 36,
  },
  cardDate: {
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
