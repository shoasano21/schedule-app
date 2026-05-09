import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Theme } from '../constants/colors';
import type { EventItem } from '../types/Event';
import { fromISODate, pad2, toISODate } from '../utils/date';
import { BottomSheet } from './BottomSheet';

interface Props {
  visible: boolean;
  theme: Theme;
  events: EventItem[];
  onClose: () => void;
}

const WEEKDAY_LABEL = ['日', '月', '火', '水', '木', '金', '土'];

interface Aggregated {
  title: string;
  count: number;
  occurrences: { date: string; weekday: string; startH: number; endH: number }[];
}

export function EventSearchSheet({ visible, theme, events, onClose }: Props) {
  const today = useMemo(() => toISODate(new Date()), []);
  const monthLater = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return toISODate(d);
  }, []);

  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(monthLater);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    if (!visible) return;
    setFrom(today);
    setTo(monthLater);
    setKeyword('');
  }, [visible, today, monthLater]);

  const aggregated: Aggregated[] = useMemo(() => {
    if (!from || !to) return [];
    const lo = from <= to ? from : to;
    const hi = from <= to ? to : from;
    const kw = keyword.trim().toLowerCase();
    const map = new Map<string, Aggregated>();
    for (const ev of events) {
      if (ev.date < lo || ev.date > hi) continue;
      if (kw && !ev.title.toLowerCase().includes(kw)) continue;
      const key = ev.title.trim() || '無題';
      const d = fromISODate(ev.date);
      const wd = WEEKDAY_LABEL[d.getDay()];
      const entry = map.get(key) ?? { title: key, count: 0, occurrences: [] };
      entry.count += 1;
      entry.occurrences.push({
        date: ev.date,
        weekday: wd,
        startH: ev.startH,
        endH: ev.endH,
      });
      map.set(key, entry);
    }
    const result = Array.from(map.values());
    result.forEach((r) => r.occurrences.sort((a, b) => a.date.localeCompare(b.date)));
    result.sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
    return result;
  }, [events, from, to, keyword]);

  const totalCount = aggregated.reduce((sum, a) => sum + a.count, 0);

  const shiftFrom = (days: number) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setFrom((prev) => shiftISO(prev, days));
  };
  const shiftTo = (days: number) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setTo((prev) => shiftISO(prev, days));
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} theme={theme} maxHeightRatio={0.92}>
      <View style={styles.headerRow}>
        <Pressable onPress={onClose} hitSlop={10}>
          <Text style={[styles.headerBtn, { color: theme.accent }]}>閉じる</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>イベント検索</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.label, { color: theme.textTertiary }]}>期間</Text>
        <View style={styles.rangeRow}>
          <DateField
            label="開始"
            value={from}
            onShift={shiftFrom}
            theme={theme}
          />
          <Ionicons
            name="arrow-forward"
            size={16}
            color={theme.textTertiary}
            style={{ marginHorizontal: 6 }}
          />
          <DateField
            label="終了"
            value={to}
            onShift={shiftTo}
            theme={theme}
          />
        </View>

        <View style={styles.presetRow}>
          {PRESETS.map((p) => (
            <Pressable
              key={p.label}
              onPress={() => {
                if (Platform.OS !== 'web') void Haptics.selectionAsync();
                const r = p.range();
                setFrom(r.from);
                setTo(r.to);
              }}
              style={[
                styles.presetBtn,
                { backgroundColor: theme.bgSecondary, borderColor: theme.separator },
              ]}
            >
              <Text style={[styles.presetText, { color: theme.text }]}>{p.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: theme.textTertiary, marginTop: 16 }]}>
          キーワード（任意）
        </Text>
        <TextInput
          value={keyword}
          onChangeText={setKeyword}
          placeholder="タイトルで絞り込み..."
          placeholderTextColor={theme.textTertiary}
          maxLength={40}
          style={[
            styles.input,
            { backgroundColor: theme.bgSecondary, color: theme.text },
          ]}
          returnKeyType="search"
        />

        <View
          style={[
            styles.summary,
            { backgroundColor: theme.accentBg },
          ]}
        >
          <Ionicons name="calendar-outline" size={16} color={theme.accent} />
          <Text style={[styles.summaryText, { color: theme.accent }]}>
            {aggregated.length} 種類 / 合計 {totalCount} 件
          </Text>
        </View>

        {aggregated.length === 0 ? (
          <View
            style={[
              styles.empty,
              { backgroundColor: theme.bgSecondary, borderColor: theme.separator },
            ]}
          >
            <Ionicons name="search" size={28} color={theme.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              期間内に該当するイベントはありません
            </Text>
          </View>
        ) : (
          aggregated.map((a) => (
            <View
              key={a.title}
              style={[
                styles.card,
                { backgroundColor: theme.bgSecondary, borderColor: theme.separator },
              ]}
            >
              <View style={styles.cardHead}>
                <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                  {a.title}
                </Text>
                <View style={[styles.countBadge, { backgroundColor: theme.accent }]}>
                  <Text style={styles.countText}>{a.count}回</Text>
                </View>
              </View>
              <View style={styles.occList}>
                {a.occurrences.map((o, i) => (
                  <View
                    key={`${o.date}-${o.startH}-${i}`}
                    style={[styles.occRow, { borderTopColor: theme.separator }]}
                  >
                    <Text style={[styles.occDate, { color: theme.text }]}>
                      {formatDate(o.date)}
                    </Text>
                    <Text
                      style={[
                        styles.occWeekday,
                        { color: weekdayColor(o.weekday, theme) },
                      ]}
                    >
                      ({o.weekday})
                    </Text>
                    <Text style={[styles.occTime, { color: theme.textTertiary }]}>
                      {pad2(o.startH)}:00 – {pad2(o.endH)}:00
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </BottomSheet>
  );
}

function DateField({
  label,
  value,
  onShift,
  theme,
}: {
  label: string;
  value: string;
  onShift: (days: number) => void;
  theme: Theme;
}) {
  return (
    <View
      style={[
        styles.dateField,
        { backgroundColor: theme.bgSecondary, borderColor: theme.separator },
      ]}
    >
      <Pressable onPress={() => onShift(-1)} hitSlop={6} style={styles.shiftBtn}>
        <Ionicons name="chevron-back" size={16} color={theme.accent} />
      </Pressable>
      <View style={{ alignItems: 'center', flex: 1 }}>
        <Text style={[styles.dateLabel, { color: theme.textTertiary }]}>{label}</Text>
        <Text style={[styles.dateValue, { color: theme.text }]}>{formatDate(value)}</Text>
      </View>
      <Pressable onPress={() => onShift(1)} hitSlop={6} style={styles.shiftBtn}>
        <Ionicons name="chevron-forward" size={16} color={theme.accent} />
      </Pressable>
    </View>
  );
}

function shiftISO(iso: string, days: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

function formatDate(iso: string): string {
  const d = fromISODate(iso);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const wd = WEEKDAY_LABEL[d.getDay()];
  return `${y}/${m}/${day}(${wd})`;
}

function weekdayColor(wd: string, theme: Theme) {
  if (wd === '日') return theme.palette.red.fg;
  if (wd === '土') return theme.palette.blue.fg;
  return theme.textTertiary;
}

const PRESETS: { label: string; range: () => { from: string; to: string } }[] = [
  {
    label: '今週',
    range: () => {
      const today = new Date();
      const dow = today.getDay();
      const diff = (dow + 6) % 7;
      const monday = new Date(today);
      monday.setDate(today.getDate() - diff);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { from: toISODate(monday), to: toISODate(sunday) };
    },
  },
  {
    label: '今月',
    range: () => {
      const today = new Date();
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { from: toISODate(first), to: toISODate(last) };
    },
  },
  {
    label: '来月',
    range: () => {
      const today = new Date();
      const first = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 2, 0);
      return { from: toISODate(first), to: toISODate(last) };
    },
  },
  {
    label: '30日',
    range: () => {
      const today = new Date();
      const end = new Date(today);
      end.setDate(today.getDate() + 30);
      return { from: toISODate(today), to: toISODate(end) };
    },
  },
];

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
    minWidth: 60,
    fontWeight: '600',
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
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  shiftBtn: {
    padding: 6,
  },
  dateLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  presetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginTop: 12,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  countText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  occList: {
    marginTop: 8,
  },
  occRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  occDate: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  occWeekday: {
    fontSize: 13,
    fontWeight: '700',
  },
  occTime: {
    flex: 1,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
