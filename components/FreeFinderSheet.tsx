import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Theme } from '../constants/colors';
import type { EventItem } from '../types/Event';
import type { SharedSchedule } from '../types/SharedSchedule';
import { fromISODate, toISODate } from '../utils/date';
import { BottomSheet } from './BottomSheet';

interface Props {
  visible: boolean;
  theme: Theme;
  myEvents: EventItem[];
  schedules: SharedSchedule[];
  onClose: () => void;
}

interface FreeSlot {
  date: string;
  weekday: string;
  startH: number;
  endH: number;
}

export function FreeFinderSheet({ visible, theme, myEvents, schedules, onClose }: Props) {
  const [days, setDays] = useState(7);
  const [minHours, setMinHours] = useState(1);
  const [participants, setParticipants] = useState<Set<string>>(new Set());
  const [windowStart, setWindowStart] = useState(9);
  const [windowEnd, setWindowEnd] = useState(22);

  useEffect(() => {
    if (visible) {
      setParticipants(new Set(schedules.map((s) => s.id)));
    }
  }, [visible, schedules]);

  const slots: FreeSlot[] = useMemo(() => {
    if (!visible) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const out: FreeSlot[] = [];
    const wkLabels = ['日', '月', '火', '水', '木', '金', '土'];

    // 参加者の events を統合
    const allEvents: EventItem[] = [...myEvents];
    for (const s of schedules) {
      if (participants.has(s.id)) allEvents.push(...s.events);
    }

    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = toISODate(d);
      const wd = wkLabels[d.getDay()];

      // 時間帯ごとの占有マップ (30分単位)
      const slotsCount = (windowEnd - windowStart) * 2;
      const busy = new Array(slotsCount).fill(false);
      for (const ev of allEvents) {
        if (ev.date !== iso) continue;
        const sH = Math.max(windowStart, ev.startH);
        const eH = Math.min(windowEnd, ev.endH);
        if (eH <= sH) continue;
        const sIdx = Math.floor((sH - windowStart) * 2);
        const eIdx = Math.ceil((eH - windowStart) * 2);
        for (let k = sIdx; k < eIdx && k < slotsCount; k++) busy[k] = true;
      }

      // 連続する空きを抽出
      let runStart = -1;
      for (let k = 0; k <= slotsCount; k++) {
        const isBusy = k === slotsCount ? true : busy[k];
        if (!isBusy && runStart === -1) {
          runStart = k;
        } else if (isBusy && runStart !== -1) {
          const startHr = windowStart + runStart / 2;
          const endHr = windowStart + k / 2;
          if (endHr - startHr >= minHours) {
            out.push({
              date: iso,
              weekday: wd,
              startH: startHr,
              endH: endHr,
            });
          }
          runStart = -1;
        }
      }
    }
    return out;
  }, [visible, days, minHours, participants, myEvents, schedules, windowStart, windowEnd]);

  return (
    <BottomSheet visible={visible} onClose={onClose} theme={theme} maxHeightRatio={0.92}>
      <View style={{ flex: 1 }}>
        <View style={styles.headerRow}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={[styles.headerBtn, { color: theme.accent }]}>閉じる</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>共通の空き時間</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.label, { color: theme.textTertiary }]}>参加者</Text>
          <View style={styles.row}>
            <Chip label="自分" active theme={theme} disabled />
            {schedules.map((s) => (
              <Chip
                key={s.id}
                label={s.name}
                active={participants.has(s.id)}
                theme={theme}
                onPress={() => {
                  setParticipants((prev) => {
                    const next = new Set(prev);
                    if (next.has(s.id)) next.delete(s.id);
                    else next.add(s.id);
                    return next;
                  });
                }}
              />
            ))}
          </View>

          <Text style={[styles.label, { color: theme.textTertiary, marginTop: 12 }]}>
            探す範囲
          </Text>
          <View style={styles.row}>
            {[3, 7, 14, 30].map((n) => (
              <Chip
                key={n}
                label={`${n} 日`}
                active={days === n}
                theme={theme}
                onPress={() => setDays(n)}
              />
            ))}
          </View>

          <Text style={[styles.label, { color: theme.textTertiary, marginTop: 12 }]}>
            最低時間
          </Text>
          <View style={styles.row}>
            {[0.5, 1, 2, 3].map((n) => (
              <Chip
                key={n}
                label={n < 1 ? '30分' : `${n}時間`}
                active={minHours === n}
                theme={theme}
                onPress={() => setMinHours(n)}
              />
            ))}
          </View>

          <Text style={[styles.label, { color: theme.textTertiary, marginTop: 12 }]}>
            時間帯
          </Text>
          <View style={styles.row}>
            {[
              { l: '朝〜夜', s: 7, e: 22 },
              { l: '昼間', s: 9, e: 18 },
              { l: '夕方', s: 17, e: 22 },
              { l: '終日', s: 0, e: 24 },
            ].map((p) => {
              const active = windowStart === p.s && windowEnd === p.e;
              return (
                <Chip
                  key={p.l}
                  label={p.l}
                  active={active}
                  theme={theme}
                  onPress={() => {
                    setWindowStart(p.s);
                    setWindowEnd(p.e);
                  }}
                />
              );
            })}
          </View>

          <View style={[styles.summary, { backgroundColor: theme.accentBg }]}>
            <Ionicons name="time-outline" size={16} color={theme.accent} />
            <Text style={[styles.summaryText, { color: theme.accent }]}>
              {slots.length} 件の空き枠
            </Text>
          </View>

          {slots.length === 0 ? (
            <View
              style={[
                styles.empty,
                { backgroundColor: theme.bgSecondary, borderColor: theme.separator },
              ]}
            >
              <Ionicons name="search" size={28} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.text }]}>
                条件に合う空き時間が見つかりませんでした
              </Text>
            </View>
          ) : (
            slots.map((s, i) => (
              <View
                key={`${s.date}-${s.startH}-${i}`}
                style={[
                  styles.slotCard,
                  { backgroundColor: theme.bgSecondary, borderColor: theme.separator },
                ]}
              >
                <View style={[styles.slotBar, { backgroundColor: theme.accent }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.slotDate, { color: theme.text }]}>
                    {formatDateLabel(s.date)} ({s.weekday})
                  </Text>
                  <Text style={[styles.slotTime, { color: theme.textSecondary }]}>
                    {fmtHour(s.startH)} – {fmtHour(s.endH)} ({fmtDuration(s.endH - s.startH)})
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    if (Platform.OS !== 'web') void Haptics.selectionAsync();
                  }}
                  hitSlop={6}
                  style={[styles.slotDur, { backgroundColor: theme.accent }]}
                >
                  <Text style={styles.slotDurText}>{fmtDuration(s.endH - s.startH)}</Text>
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </BottomSheet>
  );
}

function Chip({
  label,
  active,
  theme,
  onPress,
  disabled,
}: {
  label: string;
  active: boolean;
  theme: Theme;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.chip,
        {
          backgroundColor: active ? theme.accent : theme.bgSecondary,
          borderColor: active ? theme.accent : theme.separator,
          opacity: disabled ? 0.85 : 1,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? '#fff' : theme.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function fmtHour(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function fmtDuration(h: number) {
  if (h < 1) return `${Math.round(h * 60)}分`;
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return mm === 0 ? `${hh}h` : `${hh}h${mm}m`;
}

function formatDateLabel(iso: string) {
  const d = fromISODate(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
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
    fontWeight: '600',
    minWidth: 60,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 10,
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
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  slotBar: {
    width: 4,
    height: 32,
    borderRadius: 2,
  },
  slotDate: {
    fontSize: 14,
    fontWeight: '700',
  },
  slotTime: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  slotDur: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  slotDurText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
